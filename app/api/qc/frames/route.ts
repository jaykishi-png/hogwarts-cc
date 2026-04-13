import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const maxDuration = 60

interface FrameInput { time: number; dataUrl: string }

export async function POST(req: NextRequest) {
  try {
    const { frames, batchIndex, totalBatches } = await req.json() as {
      frames: FrameInput[]
      batchIndex: number
      totalBatches: number
    }

    if (!frames?.length) return NextResponse.json({ findings: '' })

    const timeLabels = frames.map(f => `Frame at ${f.time}s`).join(', ')

    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are a professional video editor doing frame-by-frame QC. You are looking at batch ${batchIndex + 1} of ${totalBatches}.

The frames are (in order): ${timeLabels}

For EACH frame, check:
1. **Typos / text errors** — any on-screen text, titles, lower thirds, captions, graphics
2. **Exposure issues** — clipping, crush, overexposure
3. **Color grading issues** — unnatural cast, inconsistency vs adjacent frames
4. **Framing / composition** — cut-off subjects, horizon tilt
5. **Visual artifacts** — compression, flicker, noise

ONLY report real issues. For each issue use this format:
[${frames[0]?.time ?? 0}s] TYPE: description

If a frame is clean, skip it entirely.
If the entire batch is clean, respond exactly: BATCH_CLEAN`,
          },
          ...frames.map(f => ({
            type: 'image_url' as const,
            image_url: { url: f.dataUrl, detail: 'high' as const },
          })),
        ],
      }],
      max_tokens: 800,
    })

    const findings = res.choices[0].message.content ?? ''
    return NextResponse.json({ findings: findings === 'BATCH_CLEAN' ? '' : findings })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
