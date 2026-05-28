import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { competency, type, employeeName, role, context, exampleIndex } = await req.json() as {
      competency: string
      type: 'positive' | 'constructive'
      employeeName?: string
      role?: string
      context: string
      exampleIndex: 0 | 1 | 2
    }

    if (!competency || !context?.trim()) {
      return NextResponse.json({ error: 'competency and context required' }, { status: 400 })
    }

    const systemPrompt = `You are an expert HR performance review writer. You write specific, behavioral, evidence-based examples for competency evaluations. Your examples are concrete (not generic), reference observable behavior, and are 1–2 sentences long.`

    const distinctNote = exampleIndex > 0
      ? ` This is example ${exampleIndex + 1} of 3 — make it distinct from the obvious first example, focusing on a different situation or angle.`
      : ''

    const userPrompt = `Write ONE behavioral example for a performance review competency field.

Employee: ${employeeName?.trim() || 'the employee'}
Role/Position: ${role?.trim() || 'their role'}
Competency: ${competency}
Direction: ${type === 'positive' ? 'Highlight a STRENGTH — what they do well' : 'Highlight a CONSTRUCTIVE area — where improvement is needed'}
Context from manager: ${context.trim()}${distinctNote}

Rules:
- 1–2 sentences only
- Specific and behavioral (describe what they actually did or failed to do)
- Do NOT start with "The employee" — vary the opening
- No numbering, no bullet, no quotes, no preamble
- Return the example text only`

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ]

    let example = ''

    // 1. Try Gemini Flash (cheapest, reliable)
    if (process.env.GEMINI_API_KEY) {
      try {
        const gemini = new OpenAI({
          apiKey: process.env.GEMINI_API_KEY,
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        })
        const res = await gemini.chat.completions.create({
          model: 'gemini-2.0-flash',
          max_tokens: 200,
          messages,
        })
        example = res.choices[0]?.message?.content?.trim() ?? ''
        if (example) return NextResponse.json({ example })
      } catch {
        // fall through to next provider
      }
    }

    // 2. Try Anthropic Haiku
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const msg = await anthropic.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 200,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        })
        example = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : ''
        if (example) return NextResponse.json({ example })
      } catch {
        // fall through to next provider
      }
    }

    // 3. Try OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const res = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 200,
          temperature: 0.7,
          messages,
        })
        example = res.choices[0]?.message?.content?.trim() ?? ''
        if (example) return NextResponse.json({ example })
      } catch {
        // fall through
      }
    }

    if (!example) {
      return NextResponse.json({ error: 'No AI provider available or all providers failed' }, { status: 503 })
    }

    return NextResponse.json({ example })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
