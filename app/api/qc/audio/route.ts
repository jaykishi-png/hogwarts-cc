import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { toFile } from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const form     = await req.formData()
    const audio    = form.get('audio') as Blob | null
    const chunkIdx = form.get('chunkIdx') as string | null

    if (!audio) return NextResponse.json({ error: 'No audio blob received' }, { status: 400 })

    const file = await toFile(audio, `chunk_${chunkIdx ?? 0}.wav`, { type: 'audio/wav' })

    const result = await openai.audio.transcriptions.create({
      file,
      model:         'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    })

    return NextResponse.json({ transcript: result.text, segments: (result as any).segments ?? [] })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
