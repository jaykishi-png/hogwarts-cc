import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const maxDuration = 60

interface FrameInput { time: number; dataUrl: string }

/** Convert seconds → SMPTE HH:MM:SS:FF */
function secondsToTC(s: number, fps: number = 24): string {
  const totalFrames = Math.round(s * fps)
  const ff = totalFrames % fps
  const totalSecs = Math.floor(totalFrames / fps)
  const ss = totalSecs % 60
  const mm = Math.floor(totalSecs / 60) % 60
  const hh = Math.floor(totalSecs / 3600)
  return [hh, mm, ss, ff].map(n => n.toString().padStart(2, '0')).join(':')
}

/** Safety-net: normalise any stray timecode formats the model emits → [TC: HH:MM:SS:FF] */
function normalizeTCs(text: string, fps: number = 24): string {
  return text
    // [2m 34s] or [2m34s]
    .replace(/\[(\d+)m\s*(\d+)s\]/g,          (_, m, s)  => `[TC: ${secondsToTC(+m * 60 + +s, fps)}]`)
    // [2m]
    .replace(/\[(\d+)m\]/g,                    (_, m)     => `[TC: ${secondsToTC(+m * 60, fps)}]`)
    // [148s-158s] or [148s–158s] range — use start time
    .replace(/\[(\d+)s[-\u2013](\d+)s\]/g,    (_, s1)    => `[TC: ${secondsToTC(+s1, fps)}]`)
    // [94s]
    .replace(/\[(\d+)s\]/g,                    (_, s)     => `[TC: ${secondsToTC(+s, fps)}]`)
    // [1:34] bare MM:SS — skip if already part of [TC: HH:MM:SS:FF]
    .replace(/(?<!\bTC: (?:\d{2}:){0,2})\[(\d{1,2}):(\d{2})\](?!:\d)/g,
             (_, m, s) => `[TC: ${secondsToTC(+m * 60 + +s, fps)}]`)
}

export async function POST(req: NextRequest) {
  try {
    const { frames, batchIndex, totalBatches, fps = 24 } = await req.json() as {
      frames: FrameInput[]
      batchIndex: number
      totalBatches: number
      fps?: number
    }

    if (!frames?.length) return NextResponse.json({ findings: '' })

    // Label each frame with its SMPTE timecode
    const frameLabels = frames
      .map((f, i) => `Frame ${i + 1} [TC: ${secondsToTC(f.time, fps)}]`)
      .join(', ')

    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are a professional video editor doing frame-by-frame QC. Batch ${batchIndex + 1} of ${totalBatches}.

Frames in this batch (in order): ${frameLabels}

**CRITICAL TIMECODE RULE — READ CAREFULLY:**
- Every issue MUST start with the SMPTE timecode of the frame, copied EXACTLY from the list above.
- Format is ALWAYS: [TC: HH:MM:SS:FF] — two digits each, separated by colons. Example: [TC: 00:01:34:12]
- NEVER use seconds notation like [94s] or [2m34s]. NEVER omit the TC prefix. NEVER write just a number.
- If Frame 3 is labelled [TC: 00:00:02:00], your output must say [TC: 00:00:02:00], not [2s] or [00:02].

For EACH frame, check:

**1. TYPOS / TEXT ERRORS** — on-screen text, titles, lower thirds, captions, graphics.
   - CRITICAL: Only flag text that is FULLY VISIBLE and at rest (static, animation complete, not mid-build).
   - DO NOT flag text that is still animating — e.g. letters building in, text sliding/scaling/fading into position, partial text mid-reveal. If a title or lower-third appears to be in motion or only partially on screen, SKIP IT entirely. Only check text once it has landed in its final resting position.
   - DO NOT flag placeholder/draft labels like "GFX Pending" or "Pending approval" as typos — these are production notes, not errors.
   - For genuine typos: quote the exact visible text and describe the error.

**2. EXPOSURE ISSUES** — clipping, crush, overexposure, underexposure.

**3. COLOR GRADING** — Flag any of these specific issues:
   - **COLOR SHIFT:** The overall color temperature or tint changes noticeably between consecutive frames (e.g., shot goes warmer/cooler, green/magenta tint appears or disappears mid-scene). Describe exactly what shifted and between which frames.
   - **FLAT / UNGRADED:** Image looks washed out, low contrast, desaturated, or "milky" — as if the footage is still in a flat/log/RAW profile and was never color graded. Highlights look grey instead of white, blacks look lifted, colors look muted with no punch.
   - **COLOR DROP:** Color saturation suddenly drops or disappears within a frame or between consecutive frames — image goes partially or fully desaturated, grey, or monochrome unexpectedly.
   - **UNNATURAL SKIN TONES:** Skin appears overly orange, red, green, or grey.
   - **COLOR CAST:** Unwanted dominant tint (e.g., heavy blue cast in shadows, green cast on skin).

**4. FRAMING / COMPOSITION** — cut-off subjects, awkward headroom, horizon tilt.
   - DO NOT flag framing as an issue if a graphic overlay, lower-third, or title card is intentionally covering part of the frame — that is by design.

**5. VISUAL ARTIFACTS** — compression, flicker, noise, rendering errors.

**6. JUMP CUTS** — Compare consecutive frames. A true jump cut is an abrupt edit between two shots of the SAME subject from nearly the SAME camera angle.
   - DO NOT flag: scene changes, cutaways to b-roll, cuts to a different speaker, cuts from interview to graphics, title card sequences, transitions (dissolves, wipes, fades). ANY edit where the location, subject, or shot type clearly changes is intentional — not a jump cut.
   - ONLY flag if ALL four conditions are true: (a) same subject in both frames, (b) camera angle nearly identical — less than 30° change, (c) subject size nearly identical — less than 30% change in framing, (d) the result is a jarring visual stutter on the same continuous shot.

Issue format — STRICTLY one line per issue, timecode first:
[TC: 00:01:34:12] TYPO: "MODU LE" should be "MODULE"
[TC: 00:02:47:00] COLOR SHIFT: shot goes noticeably warmer between Frame 4 and Frame 5

Do NOT write: [94s] or [2m34s] or bare numbers. ALWAYS use [TC: HH:MM:SS:FF].

If a frame is clean, skip it. If the entire batch is clean, respond exactly: BATCH_CLEAN`,
          },
          ...frames.map(f => ({
            type: 'image_url' as const,
            image_url: { url: f.dataUrl, detail: 'high' as const },
          })),
        ],
      }],
      max_tokens: 900,
    })

    const raw      = res.choices[0].message.content ?? ''
    const findings = raw === 'BATCH_CLEAN' ? '' : normalizeTCs(raw, fps)
    return NextResponse.json({ findings })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
