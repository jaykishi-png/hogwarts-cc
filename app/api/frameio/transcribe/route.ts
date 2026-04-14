import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createReadStream, writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export const maxDuration = 120

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { assetId, assetName, downloadUrl } = await req.json() as {
      assetId?: string
      assetName?: string
      downloadUrl?: string
    }

    const token = process.env.FRAMEIO_TOKEN
    if (!token) {
      return NextResponse.json({ error: 'FRAMEIO_TOKEN not configured' }, { status: 503 })
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 })
    }

    // Resolve download URL — either provided directly or fetched from Frame.io
    let videoUrl = downloadUrl
    if (!videoUrl && assetId) {
      const assetRes = await fetch(`https://api.frame.io/v4/assets/${assetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!assetRes.ok) throw new Error(`Frame.io asset fetch failed: ${assetRes.status}`)
      const assetData = await assetRes.json()
      videoUrl = assetData.original ?? assetData.downloads?.original_proxy
      if (!videoUrl) throw new Error('No downloadable URL found for this asset')
    }

    if (!videoUrl) {
      return NextResponse.json({ error: 'No video URL provided and no assetId to resolve' }, { status: 400 })
    }

    // Download the video/audio to a temp file
    const videoRes = await fetch(videoUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!videoRes.ok) throw new Error(`Failed to download video: ${videoRes.status}`)

    const contentType = videoRes.headers.get('content-type') ?? 'video/mp4'
    const ext = contentType.includes('audio') ? 'mp3' : 'mp4'
    const tmpPath = join(tmpdir(), `frameio-${Date.now()}.${ext}`)

    const arrayBuffer = await videoRes.arrayBuffer()
    writeFileSync(tmpPath, Buffer.from(arrayBuffer))

    // Transcribe with Whisper
    let transcript = ''
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(tmpPath) as unknown as File,
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      })
      transcript = transcription.text
    } finally {
      try { unlinkSync(tmpPath) } catch {}
    }

    // Optional: get a summary from GPT-4o
    const summaryRes = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content: 'You are a content review assistant for a video production agency. Summarise this transcript concisely for a content producer. Highlight key topics, any notable moments, and flag anything that needs attention (errors, off-brand language, strong claims, technical issues).',
        },
        {
          role: 'user',
          content: `Asset: "${assetName ?? 'Untitled'}"\n\nTranscript:\n${transcript.slice(0, 6000)}`,
        },
      ],
    })
    const summary = summaryRes.choices[0]?.message?.content ?? ''

    return NextResponse.json({ transcript, summary, assetName })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
