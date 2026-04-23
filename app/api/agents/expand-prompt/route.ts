import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export const maxDuration = 30

// Claude Sonnet — best model for prompt engineering (complex reasoning)
function getClient() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey) return { provider: 'anthropic' as const, key: anthropicKey }
  const oaKey = process.env.OPENAI_API_KEY
  if (oaKey) return { provider: 'openai' as const, key: oaKey }
  throw new Error('ANTHROPIC_API_KEY or OPENAI_API_KEY required')
}

const SYSTEM = `You are a world-class prompt engineer. Given a rough idea, transform it into a PERFECT, highly detailed prompt that will produce excellent AI responses.

Structure your output exactly like this (use these headers):

**ROLE:** [Specific role/persona for the AI]

**CONTEXT:** [Background info the AI needs to do its job well]

**TASK:** [Step-by-step instructions of exactly what to do]

**OUTPUT FORMAT:** [Exact structure, length, and format expected]

**CONSTRAINTS:** [What to avoid, tone guidelines, what NOT to include]

Be specific and actionable. The prompt should be immediately copy-pasteable. Do not include any preamble or explanation — just the structured prompt.`

export async function POST(req: NextRequest) {
  try {
    const { rawPrompt } = await req.json() as { rawPrompt: string }
    if (!rawPrompt?.trim()) return NextResponse.json({ error: 'rawPrompt required' }, { status: 400 })

    const { provider, key } = getClient()
    let expandedPrompt = ''

    if (provider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey: key })
      const msg = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1200,
        system: SYSTEM,
        messages: [{ role: 'user', content: `Rough idea: ${rawPrompt.trim()}` }],
      })
      expandedPrompt = msg.content[0]?.type === 'text' ? msg.content[0].text : 'No response generated.'
    } else {
      const openai = new OpenAI({ apiKey: key })
      const res = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1200,
        temperature: 0.4,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Rough idea: ${rawPrompt.trim()}` },
        ],
      })
      expandedPrompt = res.choices[0]?.message?.content ?? 'No response generated.'
    }

    return NextResponse.json({ expandedPrompt })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
