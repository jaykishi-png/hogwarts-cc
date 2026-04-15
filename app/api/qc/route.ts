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

/** Convert fractional seconds → SMPTE timecode HH:MM:SS:FF */
function secondsToTimecode(secs: number, fps: number = 24): string {
  const totalFrames = Math.round(secs * fps)
  const ff = totalFrames % fps
  const totalSeconds = Math.floor(totalFrames / fps)
  const ss = totalSeconds % 60
  const mm = Math.floor(totalSeconds / 60) % 60
  const hh = Math.floor(totalSeconds / 3600)
  return [hh, mm, ss, ff].map(n => n.toString().padStart(2, '0')).join(':')
}

/** Try to fetch a specific video frame from Frame.io at a given timestamp (seconds).
 *  Returns the URL string or null on failure. */
async function fetchFrameAtTime(assetId: string, seconds: number): Promise<string | null> {
  try {
    const data = await frameioGet(`/assets/${assetId}/index?timestamp=${seconds}&type=frame`)
    const url = data?.frames?.[0]?.url ?? data?.url ?? data?.thumb ?? null
    return typeof url === 'string' ? url : null
  } catch {
    return null
  }
}

/** Collect up to `count` frames spread across the video at known timecodes.
 *  Falls back to the static thumbnails already pulled from the asset. */
async function collectFramesWithTimecodes(
  assetId: string | null,
  duration: number,
  fps: number,
  fallbackUrls: string[],
): Promise<Array<{ url: string; seconds: number; tc: string }>> {
  const frames: Array<{ url: string; seconds: number; tc: string }> = []

  if (assetId && duration > 0) {
    // Sample at ~10%, 30%, 55%, 75% to spread across the video
    const positions = [0.1, 0.3, 0.55, 0.75]
    for (const pos of positions) {
      const seconds = Math.max(1, Math.round(duration * pos))
      const url = await fetchFrameAtTime(assetId, seconds)
      if (url && !frames.find(f => f.url === url)) {
        frames.push({ url, seconds, tc: secondsToTimecode(seconds, fps) })
      }
      if (frames.length >= 4) break
    }
  }

  // Fill remaining slots from fallback thumbnails (estimate timecodes)
  // Frame.io static thumbs are usually generated around the 25% mark
  for (const url of fallbackUrls) {
    if (frames.find(f => f.url === url)) continue
    const estimatedSec = duration > 0 ? Math.round(duration * 0.25) : 0
    frames.push({ url, seconds: estimatedSec, tc: duration > 0 ? `~${secondsToTimecode(estimatedSec, fps)}` : '??:??:??:??' })
    if (frames.length >= 4) break
  }

  return frames
}

/** Parse Frame.io transcript into timestamped lines if the structure supports it.
 *  Frame.io transcription objects can be:
 *   - a plain string
 *   - an array of { start_time, end_time, text } segments (seconds as floats)
 *   - an object with a `data` array of similar segments
 */
function parseTranscript(raw: unknown, fps: number): { text: string; hasTimecodes: boolean } {
  if (!raw) return { text: '', hasTimecodes: false }

  // Already a plain string
  if (typeof raw === 'string') return { text: raw, hasTimecodes: false }

  // Segment array
  interface Segment { start_time?: number; start?: number; timestamp?: number; end_time?: number; text?: string; transcript?: string }
  const segments: Segment[] = Array.isArray(raw)
    ? raw as Segment[]
    : Array.isArray((raw as Record<string, unknown>).data)
      ? ((raw as Record<string, unknown>).data as Segment[])
      : []

  if (segments.length === 0) {
    return { text: JSON.stringify(raw).slice(0, 4000), hasTimecodes: false }
  }

  const lines = segments.map(seg => {
    const start = seg.start_time ?? seg.start ?? seg.timestamp ?? 0
    const tc = secondsToTimecode(start, fps)
    const txt = seg.text ?? seg.transcript ?? ''
    return `[${tc}] ${txt}`
  })

  return { text: lines.join('\n'), hasTimecodes: true }
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
    let transcript:  unknown       = null
    let assetId:     string | null = null
    let metaBlock:   string        = ''
    let existingComments: string[] = []
    let usedApi = false
    let asset: Record<string, unknown> | null = null
    let assetDuration = 0
    let assetFps      = 24

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
        transcript = asset?.transcription ?? asset?.transcription_text ?? null
        assetDuration = (asset?.duration as number) ?? 0
        assetFps = parseFloat(String(asset?.fps ?? asset?.framerate ?? '24')) || 24

        const meta = {
          name:       assetName,
          duration:   formatDuration(assetDuration),
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

    // Build fallback URL list from static thumbnails
    const fallbackUrls: string[] = []
    if (thumbUrl) fallbackUrls.push(thumbUrl)
    if (usedApi && asset) {
      for (const key of ['image_full', 'image_128', 'thumb_256', 'thumb_720']) {
        const u = asset[key]
        if (typeof u === 'string' && u) {
          const decoded = decodeHtmlEntities(u)
          if (!fallbackUrls.includes(decoded)) fallbackUrls.push(decoded)
        }
      }
    }

    // Collect frames with known timecodes (tries API frame extraction, falls back to thumbnails)
    const timedFrames = await collectFramesWithTimecodes(assetId, assetDuration, assetFps, fallbackUrls)
    const frameUrls = timedFrames.map(f => f.url)

    let visualSection = '_No thumbnail available for visual analysis._'
    if (timedFrames.length > 0) {
      type VisionPart =
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string; detail: 'high' } }

      // Build frame labels with their timecodes
      const frameLabels = timedFrames
        .map((f, i) => `Frame ${i + 1}: timecode ${f.tc}`)
        .join('\n')

      const parts: VisionPart[] = [
        {
          type: 'text',
          text: `You are a senior video editor and quality control specialist. Analyze the ${timedFrames.length} frame(s) provided from a production video.

Frame timecodes (use these exactly when reporting issues):
${frameLabels}

For each frame (label them Frame 1, Frame 2, etc.):

**CRITICAL TIMECODE RULE:** Every single ISSUE ⚠️ you report MUST begin with its timecode in the format [TC: HH:MM:SS:FF] using the timecode of the frame where the issue appears. No issue may be reported without a timecode.

**1. JUMP CUT DETECTION** — Compare consecutive frames for true jump cuts ONLY. A jump cut is an abrupt edit between two shots of the same subject from nearly the same camera angle, creating a jarring "jump" in time. Do NOT flag intentional transitions (cuts to a different scene, cutaway shots, b-roll, cross-cuts, dissolves, wipes, or any edit where the camera angle or subject clearly changes). Only flag as a jump cut if ALL of these apply: (a) same subject appears in both frames, (b) the camera angle is nearly identical (less than ~30° of difference — the "30-degree rule"), (c) the framing/frame size is similar (less than ~30% change — the "30% rule"), AND (d) the edit creates a jarring, unintentional visual stutter. Also flag: lighting changes that are inconsistent within the same shot, subject appearance changes mid-scene (different outfit/hair between what should be the same continuous take).

**2. ON-SCREEN TEXT** — Typos, wrong fonts, misalignment, readability issues, text too close to frame edge (safe zones). Be precise about what text is visible.

**3. EXPOSURE & LIGHTING** — Overexposed highlights, crushed blacks, inconsistent lighting between frames (suggests different shooting conditions), color temperature mismatch.

**4. MISSING GRAPHICS** — Places where a lower-third, title card, or call-out would be expected but is absent (e.g., speaker introduction with no lower-third).

**5. COMPOSITION** — Cut-off subjects, awkward headroom, tilted horizon, subject not in rule-of-thirds.

**6. COLOR GRADING** — Unnatural skin tones, color cast, inconsistency across frames.

Use: PASS ✅, ISSUE ⚠️ [TC: HH:MM:SS:FF] [specific description], or N/A for each check. Be specific and actionable.`,
        },
        ...timedFrames.slice(0, 4).map((f): VisionPart => ({
          type: 'image_url',
          image_url: { url: f.url, detail: 'high' },
        })),
      ]

      const visionRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: parts }],
        max_tokens: 900,
      })
      visualSection = visionRes.choices[0].message.content ?? visualSection
    }

    // ── 5. Audio QC — transcript analysis ────────────────────────────────
    let audioSection = '_No transcript available._'
    if (transcript) {
      const { text: transcriptText, hasTimecodes } = parseTranscript(transcript, assetFps)

      const tcNote = hasTimecodes
        ? 'The transcript includes timecodes in [HH:MM:SS:FF] format at the start of each line. Use the timecode of the relevant line for every issue you flag.'
        : `The transcript does not include per-line timecodes. Estimate the timecode for each issue based on its approximate position in the transcript relative to the total video duration (${formatDuration(assetDuration)}). Always output a best-estimate timecode [TC: HH:MM:SS:FF] — never omit it.`

      const audioRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: `You are a senior video editor checking audio and dialogue quality. Analyze this transcript carefully.

**CRITICAL TIMECODE RULE:** Every single ISSUE ⚠️ you report MUST begin with [TC: HH:MM:SS:FF]. ${tcNote} No issue may be reported without a timecode.

**1. DIALOGUE CUT-OFF** — Sentences or words cut off mid-phrase. Look for: words that end abruptly, incomplete thoughts, missing sentence endings. These are editing mistakes where audio was cut too early.

**2. LINES TOO CLOSE** — Two consecutive lines with very short gap (< 0.5s implied by abrupt transitions with no breathing room). Flag if a speaker seems to be talking over themselves or edits feel rushed.

**3. FILLER WORDS** — Flag if um/uh/like/you know appear more than 5 times total (possible editing oversight). Report the first occurrence timecode.

**4. REPEATED CONTENT** — Exact or near-exact sentences appearing twice (edit loop / duplicate clip).

**5. INAUDIBLE MARKERS** — [inaudible], [crosstalk], [music], [silence] markers that indicate audio problems.

**6. CONTENT ERRORS** — Wrong names, garbled numbers, obvious factual slips.

For each: PASS ✅, ISSUE ⚠️ [TC: HH:MM:SS:FF] [quote the problematic line], or N/A.

Transcript:
${transcriptText.slice(0, 4000)}`,
        }],
        max_tokens: 800,
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
[Summarise vision findings. Every ⚠️ issue MUST start with its timecode: ⚠️ [TC: HH:MM:SS:FF] description]

## Audio
[Summarise audio findings. Every ⚠️ issue MUST start with its timecode: ⚠️ [TC: HH:MM:SS:FF] description]

## Recommended Actions
- [TC: HH:MM:SS:FF] — [Specific fix. Every action item MUST include the timecode of the problem it addresses. If no issues: "No actions required — file is ready for delivery."]

**TIMECODE RULE:** Every ⚠️ issue and every Recommended Action bullet point MUST include [TC: HH:MM:SS:FF]. Preserve the exact timecodes from the visual and audio analysis above — do not invent or omit them.

---
*Note: Visual analysis based on ${timedFrames.length} frame(s) at timecodes: ${timedFrames.map(f => f.tc).join(', ')}.${timedFrames.length < 2 ? ' For full consistency checks, use frame-by-frame review.' : ' Multi-frame consistency has been evaluated.'}*`,
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
