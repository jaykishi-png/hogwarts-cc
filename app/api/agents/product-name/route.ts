import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export const maxDuration = 30

// Claude Haiku — creative naming quality at lower cost than GPT-4o
function getClient() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey) return { provider: 'anthropic' as const, key: anthropicKey }
  // Fallback to OpenAI
  const oaKey = process.env.OPENAI_API_KEY
  if (oaKey) return { provider: 'openai' as const, key: oaKey }
  throw new Error('ANTHROPIC_API_KEY or OPENAI_API_KEY required')
}

const SYSTEM = `You are RON, a creative naming strategist for Jay Kishi's two brands:
- **Revenue Rush**: E-learning platform for e-commerce business owners. Tone: energetic, confident, action-oriented, growth-focused.
- **The Process**: Premium supplement company. Tone: clean, minimal, premium, science-backed, founder-led.

Given a product description and brand, generate 10 unique product name options.

For each name return:
- "name": the product name
- "rationale": 1 sentence explaining why it works for the brand
- "tagline": a short supporting tagline (under 8 words)
- "style": one of: "direct", "abstract", "emotional", "functional", "aspirational"

Return ONLY a valid JSON array of 10 objects. No markdown fences, no preamble, no explanation — start with [ and end with ].`

export async function POST(req: NextRequest) {
  try {
    const { description, brand, keywords } = await req.json() as {
      description: string
      brand: 'Revenue Rush' | 'The Process'
      keywords?: string
    }

    if (!description?.trim() || !brand) {
      return NextResponse.json({ error: 'description and brand required' }, { status: 400 })
    }

    const { provider, key } = getClient()
    const userMsg = [
      `Brand: ${brand}`,
      `Product description: ${description}`,
      keywords ? `Keywords to consider: ${keywords}` : '',
    ].filter(Boolean).join('\n')

    let rawJson = '[]'

    if (provider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey: key })
      const msg = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: 'user', content: userMsg }],
      })
      rawJson = msg.content[0]?.type === 'text' ? msg.content[0].text : '[]'
    } else {
      const openai = new OpenAI({ apiKey: key })
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 1500,
        temperature: 0.8,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userMsg },
        ],
      })
      rawJson = res.choices[0]?.message?.content ?? '[]'
    }

    let names: unknown[] = []
    try {
      const cleaned = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      names = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse names', raw: rawJson }, { status: 500 })
    }

    return NextResponse.json({ names, brand })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
