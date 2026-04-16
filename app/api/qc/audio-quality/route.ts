import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const maxDuration = 60

/** Convert seconds → SMPTE HH:MM:SS:FF */
function secondsToTC(s: number, fps: number = 24): string {
  const totalFrames = Math.round(s * fps)
  const ff          = totalFrames % fps
  const totalSecs   = Math.floor(totalFrames / fps)
  const ss          = totalSecs % 60
  const mm          = Math.floor(totalSecs / 60) % 60
  const hh          = Math.floor(totalSecs / 3600)
  return [hh, mm, ss, ff].map(n => n.toString().padStart(2, '0')).join(':')
}

export async function POST(req: NextRequest) {
  try {
    const form        = await req.formData()
    const audio       = form.get('audio') as Blob | null
    const timeOffset  = parseFloat((form.get('timeOffset') as string) ?? '0')
    const fps         = parseFloat((form.get('fps') as string) ?? '24')

    if (!audio) return NextResponse.json({ findings: '' })

    // Convert blob to base64 on the server (Node.js Buffer is fast)
    const arrayBuf  = await audio.arrayBuffer()
    const base64    = Buffer.from(arrayBuf).toString('base64')
    const chunkStartTC = secondsToTC(timeOffset, fps)

    const res = await openai.chat.completions.create({
      model: 'gpt-4o-audio-preview',
      // @ts-ignore — modalities is valid for audio-preview model
      modalities: ['text'],
      messages: [
        {
          role: 'user',
          // @ts-ignore — input_audio content type is valid but not yet in SDK types
          content: [
            {
              type: 'text',
              text: `You are a professional audio engineer and sound mixer doing broadcast-quality audio QC on a video production.

This audio chunk starts at video timecode [TC: ${chunkStartTC}] (${timeOffset.toFixed(1)} seconds into the video).

**CRITICAL TIMECODE RULE:** Every issue MUST begin with [TC: HH:MM:SS:FF] — example: [TC: 00:01:34:12].
- Estimate where in this chunk the issue occurs (in seconds), add that to ${timeOffset.toFixed(1)}s for the absolute time, then format as HH:MM:SS:FF.
- NEVER use seconds notation like [94s], [2m34s], or bare numbers. ALWAYS write [TC: HH:MM:SS:FF].

Listen carefully and identify ONLY genuine, noticeable problems — do not flag minor variations or normal production audio:

**1. CLIPPING / DISTORTION** — Audio peaks at or above 0 dBFS causing harsh digital distortion or crackling at loud moments.

**2. BACKGROUND NOISE** — Obvious, distracting hiss, white noise, room noise, or air conditioning that a viewer would notice.

**3. ELECTRICAL HUM** — Persistent 50Hz or 60Hz drone/buzz from equipment or power lines. Clearly audible, not just felt.

**4. POPS & CLICKS** — Sudden sharp transient sounds from mic handling noise, bad edits, or electrical glitches.

**5. VOLUME JUMP** — A section that is significantly louder or quieter than adjacent audio — jarring, not intentional.

**6. ROOM TONE SHIFT** — The reverb, ambience, or acoustic character changes abruptly mid-sentence or between shots in a way that reveals an edit.

**7. AUDIO DROPOUT** — Audio unexpectedly cuts to silence or near-silence when speech or content should be present.

**8. OVER-COMPRESSION** — Pumping or breathing: audio unnaturally rising/falling in level after loud sounds due to aggressive compression.

**9. LOW-FREQUENCY RUMBLE** — Audible low-end drone from HVAC, traffic, or handling that muddies the audio.

**10. MIC / RECORDING ISSUES** — Plosives (B/P thuds), wind noise, or the speaker going off-axis (suddenly muffled or distant mid-sentence).

Issue format (one line per issue):
[TC: HH:MM:SS:FF] TYPE: specific description of what you hear

Only flag genuine problems a professional audio engineer would flag for a fix. If the audio is clean, respond exactly: CHUNK_CLEAN`,
            },
            {
              type: 'input_audio',
              input_audio: { data: base64, format: 'wav' },
            },
          ],
        },
      ],
      max_tokens: 500,
    })

    const findings = res.choices[0].message.content?.trim() ?? ''
    return NextResponse.json({ findings: findings === 'CHUNK_CLEAN' ? '' : findings })
  } catch (err: unknown) {
    // Non-fatal — log and return empty so the rest of QC still runs
    console.error('[audio-quality]', err)
    return NextResponse.json({ findings: '' })
  }
}
