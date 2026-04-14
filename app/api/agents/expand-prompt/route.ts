import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 30

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

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 })

    const openai = new OpenAI({ apiKey })
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1200,
      temperature: 0.4,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Rough idea: ${rawPrompt.trim()}` },
      ],
    })

    const expandedPrompt = res.choices[0]?.message?.content ?? 'No response generated.'
    return NextResponse.json({ expandedPrompt })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
