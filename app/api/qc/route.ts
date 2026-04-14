import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const FRAMEIO_BASE = 'https://api.frame.io/v2'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── URL resolution (follows f.io short-link redirects) ──────────────────────

async function resolveUrl(raw: string): Promise<string> {
  if (!/f\.io\//.test(raw)) return raw
  try {
    const res      = await fetch(raw, { method: 'GET', redirect: 'manual' })
    const location = res.headers.get('location')
    if (location) return location
  } catch { /* fall through */ }
  return raw
}

// ─── OG meta scraper — works on any public Frame.io page ─────────────────────

interface OGMeta { title: string; thumbUrl: string | null; description: string }

async function scrapeOgMeta(url: string): Promise<OGMeta> {
  const res  = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HogwartsQC/1.0)' },
    redirect: 'follow',
  })
  const html = await res.text()

  function getMeta(property: string): string {
    const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))
             ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'))
    return m?.[1] ?? ''
  }

  const rawThumb = getMeta('og:image') || getMeta('twitter:image') || null
  return {
    title:    getMeta('og:title') || getMeta('twitter:title') || 'Untitled',
    thumbUrl: rawThumb ? decodeHtmlEntities(rawThumb) : null,
    description: getMeta('og:description') || getMeta('twitter:description') || '',
  }
}

// ─── Frame.io v2 API helpers ──────────────────────────────────────────────────

async function frameioGet(path: string) {
  const res = await fetch(`${FRAMEIO_BASE}${path}`, {
    headers: { Authorization: `Bearer ${process.env.FRAMEIO_TOKEN}` },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Frame.io ${res.status}: ${body.slice(0, 120)}`)
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

// ─── URL parser ───────────────────────────────────────────────────────────────

function parseFrameioUrl(url: string): { type: 'review' | 'asset'; id: string } | null {
  // next.frame.io/project/{project_id}/view/{asset_id}
  const nextView = url.match(/next\.frame\.io\/project\/[^/]+\/view\/([0-9a-f-]{36})/i)
  if (nextView) return { type: 'asset', id: nextView[1] }

  // next.frame.io/share/{uuid}
  const nextShare = url.match(/next\.frame\.io\/share\/([a-zA-Z0-9_-]+)/)
  if (nextShare) return { type: 'review', id: nextShare[1] }

  // app.frame.io/reviews/{uuid}
  const legacyReview = url.match(/app\.frame\.io\/reviews\/([a-zA-Z0-9_-]+)/)
  if (legacyReview) return { type: 'review', id: legacyReview[1] }

  // app.frame.io/projects/.../assets/{uuid} or /player/{uuid}
  const legacyAsset = url.match(/(?:assets|player)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
  if (legacyAsset) return { type: 'asset', id: legacyAsset[1] }

  return null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Decode HTML entities that appear in OG-scraped URLs (e.g. &amp; → &) */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function formatDuration(s: number) {
  if (!s) return 'unknown'
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}
function formatFilesize(b: number) {
  if (!b) return 'unknown'
  return b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${(b / 1e6).toFixed(1)} MB`
}

// ─── POST /api/qc ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { url, postComment = false } = await req.json()

    // ── 1. Resolve URL (follow f.io redirects) ─────────────────────────────
    const resolvedUrl = await resolveUrl(url)

    // ── 2. Try Frame.io v2 API first; fall back to OG scraping ────────────
    let thumbUrl:    string | null = null
    let assetName:   string        = 'Video'
    let transcript:  string | null = null
    let assetId:     string | null = null
    let metaBlock:   string        = ''
    let existingComments: string[] = []
    let usedApi = false

    const parsed = parseFrameioUrl(resolvedUrl)

    if (parsed) {
      try {
        // Attempt v2 API resolution
        let resolvedAssetId = parsed.id
        if (parsed.type === 'review') {
          try {
            const review = await frameioGet(`/review_links/${parsed.id}`)
            resolvedAssetId = review.assets?.[0]?.id ?? review.asset_id ?? parsed.id
          } catch { /* fall through to direct asset lookup */ }
        }

        const asset = await frameioGet(`/assets/${resolvedAssetId}`)
        assetId   = resolvedAssetId
        usedApi   = true
        assetName = asset.name ?? 'Untitled'
        thumbUrl  = asset.thumb_orig ?? asset.image_full ?? asset.image_128 ?? null
        transcript = asset.transcription ?? asset.transcription_text ?? null

        const meta = {
          name:       assetName,
          duration:   formatDuration(asset.duration),
          fps:        asset.fps ?? asset.framerate ?? 'unknown',
          resolution: asset.original
            ? `${asset.original.width} × ${asset.original.height}`
            : asset.dimensions
              ? `${asset.dimensions.width} × ${asset.dimensions.height}`
              : 'unknown',
          filesize:  formatFilesize(asset.filesize),
          uploadedAt: asset.uploaded_at ? new Date(asset.uploaded_at).toLocaleDateString() : 'unknown',
        }
        metaBlock = [
          `- **File:** ${meta.name}`,
          `- **Duration:** ${meta.duration}`,
          `- **Resolution:** ${meta.resolution}`,
          `- **FPS:** ${meta.fps}`,
          `- **File size:** ${meta.filesize}`,
          `- **Upload date:** ${meta.uploadedAt}`,
        ].join('\n')

        // Pull existing comments
        try {
          const cd = await frameioGet(`/assets/${assetId}/comments`)
          existingComments = (cd ?? []).slice(0, 20).map(
            (c: { text?: string; author?: { name?: string }; timestamp?: number }) =>
              `[${c.author?.name ?? 'Reviewer'} @ ${c.timestamp != null ? formatDuration(c.timestamp) : '?'}s]: ${c.text ?? ''}`
          )
        } catch { /* not fatal */ }

      } catch {
        // API failed — fall through to OG scraping below
      }
    }

    // ── 3. OG scrape fallback (no API token required) ──────────────────────
    if (!usedApi) {
      try {
        const og  = await scrapeOgMeta(resolvedUrl)
        thumbUrl  = og.thumbUrl
        assetName = og.title
        metaBlock = [
          `- **File:** ${og.title}`,
          `- **Source:** ${resolvedUrl}`,
          `- **Duration / FPS / filesize:** _not available (public share link — no API access)_`,
          og.description ? `- **Description:** ${og.description}` : '',
        ].filter(Boolean).join('\n')
      } catch (scrapeErr) {
        return NextResponse.json(
          { error: `Could not access this Frame.io link via API or public page.\n\nResolved URL: ${resolvedUrl}\n\nMake sure the link is publicly shared, or paste the direct app.frame.io asset URL.` },
          { status: 400 }
        )
      }
    }

    // ── 4. Visual QC — GPT-4o Vision on thumbnail ─────────────────────────
    // Decode HTML entities in the URL (OG-scraped URLs often contain &amp; etc.)
    if (thumbUrl) thumbUrl = decodeHtmlEntities(thumbUrl)

    let visualSection = '_No thumbnail available for visual analysis._'
    if (thumbUrl) {
      const visionRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
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
6. **Safe zones** — titles or key subjects too close to frame edge

For each: PASS ✅, ISSUE ⚠️, or N/A. Be specific. If the frame looks professionally done, say so.`,
            },
            { type: 'image_url', image_url: { url: thumbUrl, detail: 'high' } },
          ],
        }],
        max_tokens: 600,
      })
      visualSection = visionRes.choices[0].message.content ?? visualSection
    }

    // ── 5. Audio QC — transcript analysis ────────────────────────────────
    let audioSection = '_No transcript available._'
    if (transcript) {
      const audioRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: `You are a senior video editor checking a transcript for audio and dialogue quality issues.

Check for:
1. **Filler words** — um, uh, like, you know, basically (flag if > 5 occurrences)
2. **Repeated phrases** — exact sentences appearing twice (possible edit loop)
3. **Abrupt cut-offs** — sentences ending mid-word or trailing off unnaturally
4. **Inaudible / missing audio** — [inaudible], [silence], [crosstalk] markers
5. **Content errors** — wrong names, garbled numbers, factual slips

For each: PASS ✅, ISSUE ⚠️, or N/A. Include relevant snippets for any issues.

Transcript:
${transcript.slice(0, 4000)}`,
        }],
        max_tokens: 700,
      })
      audioSection = audioRes.choices[0].message.content ?? audioSection
    }

    // ── 6. HARRY synthesises the report ───────────────────────────────────
    const commentsBlock = existingComments.length
      ? `\n## Existing Review Comments\n${existingComments.join('\n')}`
      : ''

    const reportRes = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are HARRY, a creative review agent and senior video editor. You write clear, professional, actionable QC reports in markdown.`,
        },
        {
          role: 'user',
          content: `Write a QC report for "${assetName}".

## Technical Metadata
${metaBlock}

## Visual Analysis (thumbnail frame)
${visualSection}

## Audio / Transcript Analysis
${audioSection}
${commentsBlock}

---
Use this exact structure:

# QC Report — [video name]

**Overall verdict:** ✅ PASS / ⚠️ REVIEW NEEDED / ❌ FAIL
**Reviewed by:** HARRY (Creative Review)

---

## Technical
[1–3 sentences. Flag wrong resolution, fps, or filesize for delivery.]

## Visual
[Summarise vision findings. Flag issues with ⚠️]

## Audio
[Summarise audio findings. Flag issues with ⚠️]

## Recommended Actions
- [Bullet list of specific fixes. If no issues: "No actions required — file is ready for delivery."]

---
*Note: Visual analysis is based on a single thumbnail frame. Full jump-cut and scene consistency checks require frame-by-frame review.*`,
        },
      ],
      max_tokens: 900,
    })

    const report = reportRes.choices[0].message.content ?? '(no report generated)'

    // ── 7. Optionally post back to Frame.io as a comment ──────────────────
    if (postComment && assetId) {
      try {
        const summary = report.slice(0, 300).replace(/[#*`]/g, '').trim()
        await frameioPost(`/assets/${assetId}/comments`, {
          text: `🤖 QC Report (HARRY)\n\n${summary}\n\n[Full report via Hogwarts dashboard]`,
        })
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({
      answer:    report,
      agent:     'HARRY',
      color:     'red',
      assetName,
      assetId,
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
