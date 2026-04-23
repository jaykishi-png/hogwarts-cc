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
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    : `${m}:${sec.toString().padStart(2, '0')}`
}

function formatFilesize(b: number) {
  if (!b) return 'unknown'
  return b > 1e9 ? `${(b / 1e9).toFixed(2)} GB` : `${(b / 1e6).toFixed(1)} MB`
}

function secondsToTimecode(secs: number, fps: number = 24): string {
  const totalFrames = Math.round(secs * fps)
  const ff = totalFrames % fps
  const totalSeconds = Math.floor(totalFrames / fps)
  const ss = totalSeconds % 60
  const mm = Math.floor(totalSeconds / 60) % 60
  const hh = Math.floor(totalSeconds / 3600)
  return [hh, mm, ss, ff].map(n => n.toString().padStart(2, '0')).join(':')
}

/** Map Frame.io label to a human-readable approval status */
function formatLabel(label: unknown): string {
  const map: Record<string, string> = {
    none:           'No label',
    approved:       '✅ Approved',
    needs_changes:  '⚠️ Needs changes',
    in_progress:    '🔄 In progress',
    rejected:       '❌ Rejected',
  }
  return (label && typeof label === 'string' && map[label]) ? map[label] : String(label ?? 'none')
}

/** Try to fetch a specific video frame from Frame.io at a given timestamp (seconds). */
async function fetchFrameAtTime(assetId: string, seconds: number): Promise<string | null> {
  try {
    const data = await frameioGet(`/assets/${assetId}/index?timestamp=${Math.round(seconds)}&type=frame`)
    const url = data?.frames?.[0]?.url ?? data?.url ?? data?.thumb ?? null
    return typeof url === 'string' ? url : null
  } catch {
    return null
  }
}

/** Collect up to `count` frames spread across the video — smarter sampling:
 *  Opening (5%), three early-to-mid, two mid-to-late, closing (95%). */
async function collectFramesWithTimecodes(
  assetId: string | null,
  duration: number,
  fps: number,
  fallbackUrls: string[],
  count = 8,
): Promise<Array<{ url: string; seconds: number; tc: string }>> {
  const frames: Array<{ url: string; seconds: number; tc: string }> = []

  if (assetId && duration > 0) {
    // Positions: opening, early, early-mid, mid, mid-late, late, near-end, closing
    const positions = [0.05, 0.15, 0.28, 0.42, 0.57, 0.70, 0.83, 0.95].slice(0, count)
    // Fetch in parallel for speed
    const results = await Promise.all(
      positions.map(async pos => {
        const seconds = Math.max(1, Math.round(duration * pos))
        const url = await fetchFrameAtTime(assetId, seconds)
        return url ? { url, seconds, tc: secondsToTimecode(seconds, fps) } : null
      })
    )
    for (const r of results) {
      if (r && !frames.find(f => f.url === r.url)) frames.push(r)
      if (frames.length >= count) break
    }
  }

  // Fill remaining slots from static thumbnails
  for (const url of fallbackUrls) {
    if (frames.find(f => f.url === url)) continue
    const estimatedSec = duration > 0 ? Math.round(duration * 0.25) : 0
    frames.push({
      url,
      seconds: estimatedSec,
      tc: duration > 0 ? `~${secondsToTimecode(estimatedSec, fps)}` : '??:??:??:??',
    })
    if (frames.length >= count) break
  }

  return frames
}

/** Parse Frame.io transcript into timestamped lines. */
function parseTranscript(raw: unknown, fps: number): { text: string; hasTimecodes: boolean } {
  if (!raw) return { text: '', hasTimecodes: false }
  if (typeof raw === 'string') return { text: raw, hasTimecodes: false }

  interface Segment { start_time?: number; start?: number; timestamp?: number; end_time?: number; text?: string; transcript?: string }
  const segments: Segment[] = Array.isArray(raw)
    ? raw as Segment[]
    : Array.isArray((raw as Record<string, unknown>).data)
      ? ((raw as Record<string, unknown>).data as Segment[])
      : []

  if (segments.length === 0) return { text: JSON.stringify(raw).slice(0, 6000), hasTimecodes: false }

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

    // ── 1. Resolve URL ────────────────────────────────────────────────────────
    const resolvedUrl = await resolveUrl(url)

    // ── 2. Frame.io API — fetch asset metadata ────────────────────────────────
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
        let resolvedAssetId = parsed.id
        if (parsed.type === 'review') {
          try {
            const review = await frameioGet(`/review_links/${parsed.id}`)
            resolvedAssetId = review.assets?.[0]?.id ?? review.asset_id ?? parsed.id
          } catch { /* fall through */ }
        }

        asset     = await frameioGet(`/assets/${resolvedAssetId}`)
        assetId   = resolvedAssetId
        usedApi   = true
        assetName = (asset?.name as string) ?? 'Untitled'
        thumbUrl  = (asset?.thumb_orig ?? asset?.image_full ?? asset?.image_128 ?? null) as string | null
        transcript = asset?.transcription ?? asset?.transcription_text ?? null
        assetDuration = (asset?.duration as number) ?? 0
        assetFps = parseFloat(String(asset?.fps ?? asset?.framerate ?? '24')) || 24

        // ── Rich metadata extraction ──────────────────────────────────────
        const original = asset?.original as Record<string, unknown> | undefined
        const dims     = asset?.dimensions as Record<string, unknown> | undefined
        const resolution = original
          ? `${original.width} × ${original.height}`
          : dims
            ? `${dims.width} × ${dims.height}`
            : 'unknown'
        const videoCodec  = original?.video_codec as string | undefined
        const audioCodec  = original?.audio_codec as string | undefined
        const videoBitrate = original?.video_bitrate as number | undefined
        const audioBitrate = original?.audio_bitrate as number | undefined
        const versionNum  = asset?.version_number as number | undefined
        const label       = asset?.label
        const description = asset?.description as string | undefined

        metaBlock = [
          `- **File:** ${assetName}`,
          `- **Duration:** ${formatDuration(assetDuration)}`,
          `- **Resolution:** ${resolution}`,
          `- **FPS:** ${assetFps}`,
          `- **File size:** ${formatFilesize(asset?.filesize as number)}`,
          videoCodec  ? `- **Video codec:** ${videoCodec}${videoBitrate ? ` @ ${(videoBitrate / 1e6).toFixed(1)} Mbps` : ''}` : '',
          audioCodec  ? `- **Audio codec:** ${audioCodec}${audioBitrate ? ` @ ${Math.round(audioBitrate / 1000)} kbps` : ''}` : '',
          versionNum  ? `- **Version:** v${versionNum}` : '',
          `- **Approval status:** ${formatLabel(label)}`,
          `- **Upload date:** ${asset?.uploaded_at ? new Date(asset.uploaded_at as string).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'unknown'}`,
          description ? `- **Description:** ${description}` : '',
        ].filter(Boolean).join('\n')

        // Pull existing review comments
        try {
          const cd = await frameioGet(`/assets/${assetId}/comments`)
          existingComments = (cd ?? []).slice(0, 30).map(
            (c: { text?: string; author?: { name?: string }; timestamp?: number; completed?: boolean }) => {
              const who  = c.author?.name ?? 'Reviewer'
              const when = c.timestamp != null ? `@ ${secondsToTimecode(c.timestamp, assetFps)}` : ''
              const done = c.completed ? ' ✔' : ''
              return `[${who} ${when}${done}]: ${c.text ?? ''}`
            }
          )
        } catch { /* not fatal */ }

      } catch {
        // API failed — fall through to OG scraping
      }
    }

    // ── 3. OG scrape fallback ─────────────────────────────────────────────────
    if (!usedApi) {
      try {
        const og  = await scrapeOgMeta(resolvedUrl)
        thumbUrl  = og.thumbUrl
        assetName = og.title
        metaBlock = [
          `- **File:** ${og.title}`,
          `- **Source:** ${resolvedUrl}`,
          `- **Duration / FPS / filesize:** _not available (public share — no API access)_`,
          og.description ? `- **Description:** ${og.description}` : '',
        ].filter(Boolean).join('\n')
      } catch {
        return NextResponse.json(
          { error: `Could not access this Frame.io link via API or public page.\n\nResolved URL: ${resolvedUrl}\n\nMake sure the link is publicly shared, or paste the direct app.frame.io asset URL.` },
          { status: 400 }
        )
      }
    }

    // ── 4. Collect frames ─────────────────────────────────────────────────────
    if (thumbUrl) thumbUrl = decodeHtmlEntities(thumbUrl)

    const fallbackUrls: string[] = []
    if (thumbUrl) fallbackUrls.push(thumbUrl)
    if (usedApi && asset) {
      for (const key of ['image_full', 'thumb_720', 'thumb_256', 'image_128']) {
        const u = asset[key]
        if (typeof u === 'string' && u) {
          const decoded = decodeHtmlEntities(u)
          if (!fallbackUrls.includes(decoded)) fallbackUrls.push(decoded)
        }
      }
    }

    // Up to 8 frames: API extraction runs in parallel now
    const timedFrames = await collectFramesWithTimecodes(assetId, assetDuration, assetFps, fallbackUrls, 8)
    const frameUrls = timedFrames.map(f => f.url)

    // ── 5. Visual QC — multi-frame analysis ──────────────────────────────────
    let visualSection = '_No frames available for visual analysis._'
    if (timedFrames.length > 0) {
      type VisionPart =
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string; detail: 'high' } }

      const frameLabels = timedFrames
        .map((f, i) => `Frame ${i + 1}: [TC: ${f.tc}]`)
        .join('\n')

      const parts: VisionPart[] = [
        {
          type: 'text',
          text: `You are a senior video editor and quality control specialist reviewing production content for YouTube/social delivery. You have been given ${timedFrames.length} frame(s) sampled across the full video timeline.

Frame timecodes (reference exactly when flagging issues):
${frameLabels}

**TIMECODE RULE:** Every ISSUE ⚠️ MUST begin with its exact frame timecode: ⚠️ [TC: HH:MM:SS:FF]. No issue without a timecode.

Evaluate every frame individually, then compare across frames. Respond per check below:

---

**1. JUMP CUTS & EDIT CONSISTENCY**
Flag only true jump cuts: same subject, nearly identical angle (< 30° difference), similar framing (< 30% size change), jarring result. Do NOT flag intentional cuts to new scenes, b-roll, cutaways, or clearly different angles. Also flag: subject appearance changes mid-continuous take, lighting inconsistency within a single scene.

**2. ON-SCREEN TEXT & GRAPHICS**
Check every visible word for: spelling errors, wrong font/style (should match brand), text misaligned or outside title-safe zone (10% inset from each edge), text too small to read on mobile, lower-thirds that cut off names, wrong job title or company name, outdated calls-to-action.

**3. EXPOSURE & COLOUR**
Flag: blown-out highlights (pure white clipping), crushed blacks (no detail in shadows), inconsistent white balance between frames that should be the same scene, heavy colour cast (green/magenta skin tones), overuse of vignette or heavy-handed grade. Note which specific frames have issues.

**4. MISSING GRAPHICS & LOWER-THIRDS**
Identify: speaker on screen with no lower-third introduction, title cards or chapter headers that appear incomplete or missing, subscribe/CTA animations referenced in script but not present.

**5. COMPOSITION & FRAMING**
Flag: subject cut off at frame edges, excessive headroom (subject too low), tilted horizon (unless intentional), subject in dead centre vs. rule-of-thirds opportunity, obstructed face or eye-line.

**6. BRAND & CONSISTENCY**
Check for: thumbnail-style frame usable as a preview image, consistent look/feel across frames, watermarks or third-party logos that need clearing, any frame that looks visually out-of-place for the series.

**7. PACING (VISUAL)**
Based on the spread of frames: does the visual content feel varied enough? Are there multiple long stretches of the same static shot? Note if the same background/setup appears in most frames (suggests talking-head heavy content with limited b-roll).

---
Format each check as:
✅ PASS — [brief note]
⚠️ [TC: HH:MM:SS:FF] ISSUE — [specific, actionable description]
N/A — [reason]

Be specific, quote visible text verbatim if relevant. Distinguish which frame number each issue appears in.`,
        },
        ...timedFrames.slice(0, 8).map((f): VisionPart => ({
          type: 'image_url',
          image_url: { url: f.url, detail: 'high' },
        })),
      ]

      const visionRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: parts }],
        max_tokens: 2000,
      })
      visualSection = visionRes.choices[0].message.content ?? visualSection
    }

    // ── 6. Audio QC — transcript analysis ────────────────────────────────────
    let audioSection = '_No transcript available — audio not analysed._'
    if (transcript) {
      const { text: transcriptText, hasTimecodes } = parseTranscript(transcript, assetFps)

      const tcNote = hasTimecodes
        ? 'The transcript includes per-line timecodes in [HH:MM:SS:FF] format. Use the timecode of the relevant line for every issue.'
        : `The transcript does not have per-line timecodes. Estimate each issue timecode based on its position in the transcript relative to the total duration (${formatDuration(assetDuration)}). Always output a best-estimate [TC: HH:MM:SS:FF] — never omit it.`

      const audioRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: `You are a senior video editor reviewing dialogue and audio for a production video. Analyse the transcript below against every check.

**TIMECODE RULE:** Every ISSUE ⚠️ MUST begin with [TC: HH:MM:SS:FF]. ${tcNote}

---

**1. DIALOGUE CUT-OFFS**
Words or sentences cut off mid-phrase — audio trimmed too early. Look for: abrupt endings, incomplete thoughts, missing sentence conclusions.

**2. RUSHED PACING / LINES TOO CLOSE**
Two lines with no breathing room between them (< 0.5s gap implied). Flag if a speaker seems to double up or the edit sounds breathless.

**3. FILLER WORDS**
Count um/uh/like/you know/sort of. Flag if total > 5 occurrences — suggest tightening. Report the first occurrence timecode and total count.

**4. REPEATED CONTENT**
Exact or near-exact sentences appearing more than once — indicates a looped clip or duplicate edit. Quote both instances.

**5. INAUDIBLE / PROBLEM MARKERS**
[inaudible], [crosstalk], [music], [silence], [laughter] markers that suggest audio issues needing attention.

**6. CONTENT ACCURACY**
Wrong names, garbled figures, contradictory statements, outdated product names or URLs mentioned on-screen.

**7. SPEAKER ENERGY & CLARITY**
Based on word choice and sentence structure: does the speaker sound confident and engaged? Note if language is very filler-heavy, disjointed, or trails off repeatedly (energy issue vs. editing issue).

**8. CALL TO ACTION**
Is there a clear verbal CTA (subscribe, link in bio, check out X)? If missing entirely, flag it. If present, confirm the timecode it appears.

---
Format each check as:
✅ PASS — [brief note]
⚠️ [TC: HH:MM:SS:FF] ISSUE — [quote the problematic line or describe the problem]
N/A — [reason]

Transcript:
${transcriptText.slice(0, 6000)}`,
        }],
        max_tokens: 1500,
      })
      audioSection = audioRes.choices[0].message.content ?? audioSection
    }

    // ── 7. HARRY synthesises the final report ─────────────────────────────────
    const commentsBlock = existingComments.length
      ? `\n## Existing Frame.io Review Comments (${existingComments.length})\n${existingComments.join('\n')}`
      : ''

    const confidenceNote = usedApi
      ? `Full API access — metadata, ${timedFrames.length} extracted frames${transcript ? ', transcript' : ''}, and ${existingComments.length} review comment(s) analysed.`
      : `Public link only — limited to thumbnail frame(s). For full technical metadata and transcript, use an API-accessible link.`

    const reportRes = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are HARRY, creative review agent and senior video editor at a content production company. You write clear, precise, brutally actionable QC reports in markdown. You do not pad or hedge — every issue gets a timecode and a specific fix. Every pass gets a confident confirmation. No vague language.`,
        },
        {
          role: 'user',
          content: `Write a complete QC report for the video "${assetName}".

## Technical Metadata
${metaBlock}

## Visual Analysis (${timedFrames.length} frames sampled)
${visualSection}

## Audio / Transcript Analysis
${audioSection}
${commentsBlock}

---
Use EXACTLY this structure. Do not add extra sections or reorder them:

# QC Report — [video name]

**Overall verdict:** ✅ PASS / ⚠️ REVIEW NEEDED / ❌ FAIL
**Reviewed by:** HARRY (Creative Review)
**Data confidence:** [one sentence on what data was available — full API / thumbnail only / transcript available or not]

---

## Technical
Confirm or flag: resolution (1080p or 4K for YouTube; 1080×1920 for vertical), FPS (24/25/30), file size (flag if > 8 GB or suspiciously small), codec (H.264/H.265 acceptable), approval status from Frame.io label. 2–4 sentences max.

## Visual
List every ⚠️ issue found. Each MUST start with ⚠️ [TC: HH:MM:SS:FF]. Group by type (text, exposure, composition, etc.). If no issues: single ✅ PASS sentence.

## Audio
List every ⚠️ issue found. Each MUST start with ⚠️ [TC: HH:MM:SS:FF]. If no transcript was available, note it clearly. If no issues: single ✅ PASS sentence.

## Reviewer Comments
Summarise any existing Frame.io review comments that are still open (not marked completed). If none: "No open reviewer comments."

## Delivery Checklist
Rate each item ✅ / ⚠️ / ❌ / N/A:
- [ ] Resolution matches delivery spec
- [ ] Frame rate correct
- [ ] Audio levels acceptable
- [ ] Lower-thirds / text error-free
- [ ] CTA present and correct
- [ ] No jump cuts or edit glitches
- [ ] Colour grade consistent
- [ ] Approved in Frame.io

## Recommended Actions
Numbered list. Every item MUST include [TC: HH:MM:SS:FF] for the exact problem location and a specific fix instruction. If nothing to fix: "✅ No actions required — cleared for delivery."

---
*Frames sampled at: ${timedFrames.map(f => f.tc).join(' · ')} | ${confidenceNote}*

**HARD RULES:** Every ⚠️ and every action item must have [TC: HH:MM:SS:FF]. Use timecodes from the analyses above verbatim — do not invent them. Do not truncate the Recommended Actions list.`,
        },
      ],
      max_tokens: 1800,
    })

    const report = reportRes.choices[0].message.content ?? '(no report generated)'

    // ── 8. Optionally post QC summary back to Frame.io as a comment ──────────
    if (postComment && assetId) {
      try {
        const verdict = report.match(/\*\*Overall verdict:\*\*\s*(.+)/)?.[1]?.trim() ?? ''
        const actions = report.match(/## Recommended Actions\n([\s\S]+?)(?:\n---|\n\*|$)/)?.[1]?.trim() ?? ''
        const commentText = [
          `🤖 QC Report — HARRY (Creative Review)`,
          verdict ? `Verdict: ${verdict}` : '',
          '',
          actions ? `Actions:\n${actions.slice(0, 500)}` : '',
          '',
          '[Full report via Hogwarts AI Command Center]',
        ].filter(s => s !== undefined).join('\n').trim()

        await frameioPost(`/assets/${assetId}/comments`, { text: commentText })
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({
      answer:         report,
      agent:          'HARRY',
      color:          'red',
      assetName,
      assetId,
      framesAnalyzed: frameUrls.length,
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
