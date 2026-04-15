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

**CRITICAL TIMECODE RULE:** Every issue you report MUST start with the exact SMPTE timecode of the frame where it appears, using the timecodes listed above. Format: [TC: HH:MM:SS:FF]. Never omit the timecode.

For EACH frame, check:

**1. TYPOS / TEXT ERRORS** — on-screen text, titles, lower thirds, captions, graphics. Quote the exact text visible and describe the error.

**2. EXPOSURE ISSUES** — clipping, crush, overexposure, underexposure.

**3. COLOR GRADING** — unnatural skin tones, color cast, inconsistency vs adjacent frames.

**4. FRAMING / COMPOSITION** — cut-off subjects, awkward headroom, horizon tilt.

**5. VISUAL ARTIFACTS** — compression, flicker, noise, rendering errors.

**6. JUMP CUTS** — Compare consecutive frames. A true jump cut is an abrupt edit between two shots of the SAME subject from nearly the SAME camera angle. Do NOT flag intentional transitions (scene changes, cutaways, b-roll, dissolves, wipes — any edit where the subject or location clearly changes). Only flag as a jump cut if ALL apply: (a) same subject in both frames, (b) camera angle nearly identical (<30° change — 30-degree rule), (c) framing similar (<30% change in subject size — 30% rule), (d) creates a jarring visual stutter.

Issue format (one line per issue):
[TC: HH:MM:SS:FF] TYPE: specific description

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

    const findings = res.choices[0].message.content ?? ''
    return NextResponse.json({ findings: findings === 'BATCH_CLEAN' ? '' : findings })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
