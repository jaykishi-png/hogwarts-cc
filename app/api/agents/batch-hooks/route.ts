import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export const maxDuration = 60

// Claude Haiku — creative quality needed for hooks that actually convert
function getClient() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey) return { provider: 'anthropic' as const, key: anthropicKey }
  const oaKey = process.env.OPENAI_API_KEY
  if (oaKey) return { provider: 'openai' as const, key: oaKey }
  throw new Error('ANTHROPIC_API_KEY or OPENAI_API_KEY required')
}

const SYSTEM = `You are FRED, an elite viral content engineer and conversion copywriter. Your hooks have generated millions of views and driven real revenue.

A great hook does ONE thing in the first 3 seconds: make it IMPOSSIBLE to scroll past.

CONVERSION PRINCIPLES you must apply:
- **Specificity sells** — "I made $47,382 in 11 days" beats "I made a lot of money"
- **Open loops demand closure** — start a story or reveal that can't be ignored
- **Challenge assumptions** — tell them something they believe is wrong
- **Pain > pleasure** — fear of loss is stronger than desire for gain
- **The unexpected angle** — the obvious hook is never the best hook
- **Emotional truth** — the hook must feel real, not performative

For each hook, also identify:
- The psychological ANGLE being used (what drives the viewer to keep watching)
- The specific FOCUS (what pain point, desire, or belief this hook targets)

These two fields help the creative team understand WHY the hook works, not just what it says.

Return ONLY a valid JSON array. No markdown fences, no preamble. Each object:
{
  "text": "the hook verbatim — punchy, ready to use, no numbering",
  "format": "the hook format type",
  "angle": "the psychological angle (e.g. Fear of missing out, Social proof, Curiosity gap, Authority, Identity threat, Contrarian take)",
  "focus": "the specific pain point, desire, or belief being targeted (1 sentence)"
}

Never repeat the same angle twice in a batch. Vary rhythm, length, and structure.`

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

    const { provider, key } = getClient()

    const brandContext = brand === 'Revenue Rush'
      ? 'Revenue Rush: e-commerce & dropshipping education, audience = entrepreneurs aged 18-35, tone = bold, energetic, no-BS, results-driven'
      : 'The Process: premium supplement brand, audience = serious fitness-oriented professionals, tone = clean, confident, science-adjacent, premium'

    const userMsg = `Brand: ${brand}
Brand context: ${brandContext}
Topic: ${topic}
Hook formats to use: ${formats.join(', ')}
Total hooks to generate: ${count}

Spread the ${count} hooks across all ${formats.length} format(s) as evenly as possible. Make every single hook feel real, specific, and impossible to ignore.`

    let rawJson = '[]'

    if (provider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey: key })
      const msg = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 6000,
        system: SYSTEM,
        messages: [{ role: 'user', content: userMsg }],
      })
      rawJson = msg.content[0]?.type === 'text' ? msg.content[0].text : '[]'
    } else {
      const openai = new OpenAI({ apiKey: key })
      const res = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 6000,
        temperature: 0.88,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userMsg },
        ],
      })
      rawJson = res.choices[0]?.message?.content ?? '[]'
    }

    let hooks: { text: string; format: string; angle: string; focus: string }[] = []
    try {
      const cleaned = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      hooks = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse hooks response', raw: rawJson }, { status: 500 })
    }

    return NextResponse.json({ hooks, brand, topic, count: hooks.length })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
