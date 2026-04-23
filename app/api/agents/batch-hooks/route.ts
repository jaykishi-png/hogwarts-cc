import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 60

// Gemini Flash — cheapest capable model for structured JSON generation
function geminiClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    // Fallback to OpenAI if Gemini not configured
    const oaKey = process.env.OPENAI_API_KEY
    if (!oaKey) throw new Error('GEMINI_API_KEY or OPENAI_API_KEY required')
    return { client: new OpenAI({ apiKey: oaKey }), model: 'gpt-4o-mini' }
  }
  return {
    client: new OpenAI({
      apiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    }),
    model: 'gemini-2.0-flash',
  }
}

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

    const { client, model } = geminiClient()

    const systemPrompt = `You are FRED, Viral Content Engineer for Jay Kishi. Generate exactly ${count} hooks for ${brand} about ${topic}. Formats requested: ${formats.join(', ')}. Return ONLY valid JSON: { "hooks": [{ "text": "...", "format": "..." }] }. Each hook should be punchy, platform-native, and immediately usable. Vary the structures. No numbering in the text itself. No markdown, no preamble — just the JSON object.`

    const res = await client.chat.completions.create({
      model,
      max_tokens: 3000,
      temperature: 0.85,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate ${count} hooks for ${brand} on the topic: ${topic}. Use these formats: ${formats.join(', ')}.` },
      ],
    })

    const rawJson = res.choices[0]?.message?.content ?? '{}'
    let hooks: { text: string; format: string }[] = []
    try {
      const cleaned = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned) as { hooks?: { text: string; format: string }[] }
      hooks = parsed.hooks ?? []
    } catch {
      return NextResponse.json({ error: 'Failed to parse hooks response', raw: rawJson }, { status: 500 })
    }

    return NextResponse.json({ hooks, brand, topic, count: hooks.length })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
