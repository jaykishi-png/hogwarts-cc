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
    let asset: Record<string, unknown> | null = null

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

        asset     = await frameioGet(`/assets/${resolvedAssetId}`)
        assetId   = resolvedAssetId
        usedApi   = true
        assetName = (asset?.name as string) ?? 'Untitled'
        thumbUrl  = (asset?.thumb_orig ?? asset?.image_full ?? asset?.image_128 ?? null) as string | null
        transcript = (asset?.transcription ?? asset?.transcription_text ?? null) as string | null

        const meta = {
          name:       assetName,
          duration:   formatDuration(asset?.duration as number),
          fps:        (asset?.fps ?? asset?.framerate ?? 'unknown') as string,
          resolution: asset?.original
            ? `${(asset.original as Record<string, unknown>).width} × ${(asset.original as Record<string, unknown>).height}`
            : asset?.dimensions
              ? `${(asset.dimensions as Record<string, unknown>).width} × ${(asset.dimensions as Record<string, unknown>).height}`
              : 'unknown',
          filesize:  formatFilesize(asset?.filesize as number),
          uploadedAt: asset?.uploaded_at ? new Date(asset.uploaded_at as string).toLocaleDateString() : 'unknown',
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

    // ── 4. Visual QC — multi-frame analysis ──────────────────────────────────
    if (thumbUrl) thumbUrl = decodeHtmlEntities(thumbUrl)

    // Collect all available frame URLs
    const frameUrls: string[] = []
    if (thumbUrl) frameUrls.push(thumbUrl)

    // When using the Frame.io API, extract additional unique thumbnail URLs
    if (usedApi) {
      const extras = [asset?.image_full, asset?.image_128, asset?.thumb_256, asset?.thumb_720]
      for (const u of extras) {
        if (typeof u === 'string' && u) {
          const decoded = decodeHtmlEntities(u)
          if (!frameUrls.includes(decoded)) frameUrls.push(decoded)
        }
      }
    }

    let visualSection = '_No thumbnail available for visual analysis._'
    if (frameUrls.length > 0) {
      type VisionPart =
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string; detail: 'high' } }

      const parts: VisionPart[] = [
        {
          type: 'text',
          text: `You are a senior video editor and quality control specialist. Analyze the ${frameUrls.length} frame(s) provided from a production video.

For each frame (label them Frame 1, Frame 2, etc.):

**1. JUMP CUT DETECTION** — Compare consecutive frames for true jump cuts ONLY. A jump cut is an abrupt edit between two shots of the same subject from nearly the same camera angle, creating a jarring "jump" in time. Do NOT flag intentional transitions (cuts to a different scene, cutaway shots, b-roll, cross-cuts, dissolves, wipes, or any edit where the camera angle or subject clearly changes). Only flag as a jump cut if ALL of these apply: (a) same subject appears in both frames, (b) the camera angle is nearly identical (less than ~30° of difference — the "30-degree rule"), (c) the framing/frame size is similar (less than ~30% change — the "30% rule"), AND (d) the edit creates a jarring, unintentional visual stutter. Also flag: lighting changes that are inconsistent within the same shot, subject appearance changes mid-scene (different outfit/hair between what should be the same continuous take).

**2. ON-SCREEN TEXT** — Typos, wrong fonts, misalignment, readability issues, text too close to frame edge (safe zones). Be precise about what text is visible.

**3. EXPOSURE & LIGHTING** — Overexposed highlights, crushed blacks, inconsistent lighting between frames (suggests different shooting conditions), color temperature mismatch.

**4. MISSING GRAPHICS** — Places where a lower-third, title card, or call-out would be expected but is absent (e.g., speaker introduction with no lower-third).

**5. COMPOSITION** — Cut-off subjects, awkward headroom, tilted horizon, subject not in rule-of-thirds.

**6. COLOR GRADING** — Unnatural skin tones, color cast, inconsistency across frames.

Use: PASS ✅, ISSUE ⚠️ [specific description], or N/A for each check. Be specific and actionable.`,
        },
        ...frameUrls.slice(0, 4).map((url): VisionPart => ({
          type: 'image_url',
          image_url: { url, detail: 'high' },
        })),
      ]

      const visionRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: parts }],
        max_tokens: 800,
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
          content: `You are a senior video editor checking audio and dialogue quality. Analyze this transcript carefully.

**1. DIALOGUE CUT-OFF** — Sentences or words cut off mid-phrase. Look for: words that end abruptly, incomplete thoughts, missing sentence endings. These are editing mistakes where audio was cut too early.

**2. LINES TOO CLOSE** — Two consecutive lines with very short gap (< 0.5s implied by abrupt transitions with no breathing room). Flag if a speaker seems to be talking over themselves or edits feel rushed.

**3. FILLER WORDS** — Flag if um/uh/like/you know appear more than 5 times total (possible editing oversight).

**4. REPEATED CONTENT** — Exact or near-exact sentences appearing twice (edit loop / duplicate clip).

**5. INAUDIBLE MARKERS** — [inaudible], [crosstalk], [music], [silence] markers that indicate audio problems.

**6. CONTENT ERRORS** — Wrong names, garbled numbers, obvious factual slips.

For each: PASS ✅, ISSUE ⚠️ [quote the problematic line], or N/A.

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
*Note: Visual analysis based on ${frameUrls.length} available frame(s).${frameUrls.length < 2 ? ' For full consistency checks, use frame-by-frame review.' : ' Multi-frame consistency has been evaluated.'}*`,
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
      framesAnalyzed: frameUrls.length,
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
