import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const FRAMEIO_BASE = 'https://api.frame.io/v2'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Frame.io URL resolver (follows f.io short-link redirects) ───────────────

async function resolveUrl(url: string): Promise<string> {
  if (!/f\.io\//.test(url)) return url
  // Use redirect:'manual' so we can read the Location header directly —
  // more reliable than redirect:'follow' whose res.url is env-dependent.
  try {
    const res      = await fetch(url, { method: 'GET', redirect: 'manual' })
    const location = res.headers.get('location')
    if (location) return location
  } catch { /* fall through */ }
  return url
}

// ─── Frame.io URL parser ──────────────────────────────────────────────────────

function parseFrameioUrl(url: string): { type: 'review' | 'asset'; id: string } | null {
  // Review links — all known formats:
  //   https://app.frame.io/reviews/{uuid}
  //   https://next.frame.io/share/{uuid}   ← f.io short links resolve here
  const reviewMatch = url.match(/(?:app\.frame\.io\/reviews|next\.frame\.io\/share)\/([a-zA-Z0-9_-]+)/)
  if (reviewMatch) return { type: 'review', id: reviewMatch[1] }

  // Direct asset link:
  //   https://app.frame.io/projects/.../assets/{uuid}
  //   https://app.frame.io/player/{uuid}
  const assetMatch = url.match(/(?:assets|player)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
  if (assetMatch) return { type: 'asset', id: assetMatch[1] }

  return null
}

// ─── Frame.io API helpers ─────────────────────────────────────────────────────

async function frameioGet(path: string) {
  const res = await fetch(`${FRAMEIO_BASE}${path}`, {
    headers: { Authorization: `Bearer ${process.env.FRAMEIO_TOKEN}` },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Frame.io ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

async function frameioPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${FRAMEIO_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.FRAMEIO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Frame.io POST ${res.status}`)
  return res.json()
}

// ─── Frame type helpers ───────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds) return 'unknown'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatFilesize(bytes: number): string {
  if (!bytes) return 'unknown'
  if (bytes > 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}

// ─── POST /api/qc ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { url, postComment = false } = await req.json()

    if (!process.env.FRAMEIO_TOKEN || process.env.FRAMEIO_TOKEN === 'your-frameio-token-here') {
      return NextResponse.json(
        { error: 'FRAMEIO_TOKEN not configured. Add it to .env.local and restart the dev server.' },
        { status: 500 }
      )
    }

    // ── 1. Resolve to asset ────────────────────────────────────────────────
    const resolvedUrl = await resolveUrl(url)
    const parsed      = parseFrameioUrl(resolvedUrl)
    if (!parsed) {
      return NextResponse.json(
        { error: `Could not parse Frame.io URL.\n\nOriginal: ${url}\nResolved: ${resolvedUrl}\n\nExpected app.frame.io/reviews/… or app.frame.io/projects/…/assets/…` },
        { status: 400 }
      )
    }

    let assetId: string
    if (parsed.type === 'review') {
      const review = await frameioGet(`/review_links/${parsed.id}`)
      assetId = review.assets?.[0]?.id ?? review.asset_id
      if (!assetId) throw new Error('Review link found but contains no assets.')
    } else {
      assetId = parsed.id
    }

    const asset   = await frameioGet(`/assets/${assetId}`)

    // ── 2. Pull existing comments (for context) ────────────────────────────
    let existingComments: string[] = []
    try {
      const commentsData = await frameioGet(`/assets/${assetId}/comments`)
      existingComments = (commentsData ?? [])
        .slice(0, 20)
        .map((c: { text?: string; author?: { name?: string }; timestamp?: number }) =>
          `[${c.author?.name ?? 'Reviewer'} @ ${c.timestamp != null ? formatDuration(c.timestamp) : '?'}s]: ${c.text ?? ''}`
        )
    } catch {
      // comments endpoint may be empty — not fatal
    }

    // ── 3. Build metadata summary ──────────────────────────────────────────
    const meta = {
      name:       asset.name ?? 'Untitled',
      duration:   formatDuration(asset.duration),
      fps:        asset.fps ?? asset.framerate ?? 'unknown',
      resolution: asset.original
        ? `${asset.original.width ?? '?'} × ${asset.original.height ?? '?'}`
        : asset.dimensions
          ? `${asset.dimensions.width} × ${asset.dimensions.height}`
          : 'unknown',
      filesize:   formatFilesize(asset.filesize),
      status:     asset.status ?? 'unknown',
      uploadedAt: asset.uploaded_at ? new Date(asset.uploaded_at).toLocaleDateString() : 'unknown',
    }

    // ── 4. Visual QC via GPT-4o Vision (thumbnail frame) ──────────────────
    const thumbUrl: string | null =
      asset.thumb_orig ?? asset.image_full ?? asset.image_128 ?? null

    let visualSection = '_No thumbnail available for visual analysis._'

    if (thumbUrl) {
      const visionRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a senior video editor performing quality control on a production video. Analyze this frame carefully for:

1. **On-screen text / titles / lower thirds** — typos, wrong fonts, misalignment, readability issues
2. **Exposure** — overexposed, underexposed, crushed blacks, blown highlights
3. **Framing & composition** — cut-off subjects, poor rule-of-thirds, tilted horizon
4. **Color grading** — unnatural skin tones, inconsistent color, heavy color cast
5. **Visual artifacts** — compression blocks, moire, noise, motion blur
6. **Safe zones** — titles or key subjects too close to the edge

For each category: state PASS ✅, ISSUE ⚠️, or N/A. Be specific about any issues. If a frame looks professionally done, say so.`,
              },
              { type: 'image_url', image_url: { url: thumbUrl, detail: 'high' } },
            ],
          },
        ],
        max_tokens: 600,
      })
      visualSection = visionRes.choices[0].message.content ?? visualSection
    }

    // ── 5. Audio / dialogue QC via transcript ──────────────────────────────
    const transcript: string | null =
      asset.transcription ?? asset.transcription_text ?? null

    let audioSection = '_No transcript found. Enable transcription in Frame.io to get audio QC._'

    if (transcript) {
      const audioRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `You are a senior video editor checking a transcript for audio and dialogue quality issues.

Check for:
1. **Filler words** — um, uh, like, you know, basically, literally (count occurrences; flag if > 5)
2. **Repeated phrases** — exact sentences or phrases appearing twice (possible accidental edit loop)
3. **Abrupt sentence cut-offs** — sentences that end mid-word or trail off unnaturally
4. **Inaudible / missing audio** — [inaudible], [silence], [crosstalk] markers, or long gaps
5. **Inconsistent speaker clarity** — sudden volume drops or garbled passages
6. **Content errors** — obvious factual slips, wrong names, or garbled numbers

For each: PASS ✅, ISSUE ⚠️, or N/A. Include relevant transcript snippets for any issues found.

Transcript:
${transcript.slice(0, 4000)}`,
          },
        ],
        max_tokens: 700,
      })
      audioSection = audioRes.choices[0].message.content ?? audioSection
    }

    // ── 6. HARRY synthesises the final QC report ───────────────────────────
    const commentsBlock = existingComments.length
      ? `\n## Existing Review Comments\n${existingComments.join('\n')}`
      : '\n_No existing review comments._'

    const reportRes = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are HARRY, a creative review agent and senior video editor. You write clear, professional, actionable QC reports. Use markdown formatting.`,
        },
        {
          role: 'user',
          content: `Write a QC report for "${meta.name}" based on the analysis below.

## Technical Metadata
- **File:** ${meta.name}
- **Duration:** ${meta.duration}
- **Resolution:** ${meta.resolution}
- **FPS:** ${meta.fps}
- **File size:** ${meta.filesize}
- **Upload date:** ${meta.uploadedAt}
- **Status:** ${meta.status}

## Visual Analysis (thumbnail frame)
${visualSection}

## Audio / Transcript Analysis
${audioSection}
${commentsBlock}

---
Write the report with this exact structure:

# QC Report — [video name]

**Overall verdict:** ✅ PASS / ⚠️ REVIEW NEEDED / ❌ FAIL
**Reviewed by:** HARRY (Creative Review)

---

## Technical
[1–3 sentences on specs — flag if resolution, fps, or filesize is wrong for delivery]

## Visual
[Summarise vision findings clearly. Flag specific issues with ⚠️]

## Audio
[Summarise audio findings. Flag issues with ⚠️]

## Recommended Actions
- [Bullet list. Only include if there are actual issues. If clean, write "No actions required — file is ready for delivery."]

---
*Note: Visual analysis is based on a single thumbnail frame. Full jump-cut and scene consistency checks require frame-by-frame review.*`,
        },
      ],
      max_tokens: 900,
    })

    const report = reportRes.choices[0].message.content ?? '(no report generated)'

    // ── 7. Optionally post report back as Frame.io comment ─────────────────
    if (postComment) {
      try {
        const summary = report.slice(0, 300).replace(/[#*`]/g, '').trim()
        await frameioPost(`/assets/${assetId}/comments`, {
          text: `🤖 QC Report (HARRY)\n\n${summary}\n\n[Full report generated via Hogwarts dashboard]`,
        })
      } catch {
        // Comment posting failed — non-fatal, still return the report
      }
    }

    return NextResponse.json({
      answer:    report,
      agent:     'HARRY',
      color:     'red',
      assetName: meta.name,
      duration:  meta.duration,
      assetId,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
