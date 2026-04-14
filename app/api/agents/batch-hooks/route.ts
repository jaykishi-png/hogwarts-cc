import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { brand, topic, formats, count } = await req.json() as {
      brand: string
      topic: string
      formats: string[]
      count: number
    }

    if (!brand?.trim() || !topic?.trim() || !formats?.length || !count) {
      return NextResponse.json({ error: 'brand, topic, formats and count are required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 })

    const openai = new OpenAI({ apiKey })

    const systemPrompt = `You are FRED, Viral Content Engineer for Jay Kishi. Generate exactly ${count} hooks for ${brand} about ${topic}. Formats requested: ${formats.join(', ')}. Return JSON: { "hooks": [{ "text": "...", "format": "..." }] }. Each hook should be punchy, platform-native, and immediately usable. Vary the structures. No numbering in the text itself.`

    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3000,
      temperature: 0.85,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate ${count} hooks for ${brand} on the topic: ${topic}. Use these formats: ${formats.join(', ')}.` },
      ],
    })

    const rawJson = res.choices[0]?.message?.content ?? '{}'
    let hooks: { text: string; format: string }[] = []
    try {
      const parsed = JSON.parse(rawJson) as { hooks?: { text: string; format: string }[] }
      hooks = parsed.hooks ?? []
    } catch {
      return NextResponse.json({ error: 'Failed to parse hooks response', raw: rawJson }, { status: 500 })
    }

    return NextResponse.json({ hooks, brand, topic, count: hooks.length })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
