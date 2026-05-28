import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const {
      employeeName, role, appraisalPeriod, nextPeriodStart,
      competencies, goals, overallScore, overallSummary,
    } = await req.json() as {
      employeeName: string
      role: string
      appraisalPeriod: string
      nextPeriodStart: string
      competencies: Array<{ competency: string; type: string; examples: string[] }>
      goals: Array<{ text: string; status: string; explanation: string }>
      overallScore: number
      overallSummary: string
    }

    const targetDate = nextPeriodStart || 'end of next review period'

    const competencyBlock = competencies.length
      ? competencies.map(c =>
          `${c.competency} [${c.type.toUpperCase()}]:\n${
            c.examples.filter(e => e.trim()).map(e => `  • ${e}`).join('\n') || '  • (no examples recorded)'
          }`
        ).join('\n\n')
      : '(no competencies recorded)'

    const goalsBlock = goals.length
      ? goals.map(g =>
          `• [${(g.status || 'not marked').toUpperCase()}] ${g.text}${g.explanation ? `\n  → ${g.explanation}` : ''}`
        ).join('\n')
      : '(no goals recorded)'

    const systemPrompt = `You are an expert HR performance coach and review writer. You analyze an employee's annual performance review and generate specific, practical, SMART goals for the next review period. Your goals directly address developmental areas, carry forward unfinished work, and build on strengths. Return only valid JSON — no markdown, no code fences, no explanation.`

    const userPrompt = `Analyze the following annual performance review and generate 2–3 SMART goals for the next review period.

EMPLOYEE: ${employeeName || 'the employee'} — ${role || 'their role'}
CURRENT PERIOD: ${appraisalPeriod || 'not specified'}
NEXT PERIOD TARGET DATE: ${targetDate}

─── COMPETENCY EVALUATIONS ───
${competencyBlock}

─── THIS YEAR'S GOALS ───
${goalsBlock}

─── OVERALL ───
Score: ${overallScore > 0 ? `${overallScore}/5` : 'not scored'}${overallSummary ? `\nNotes: ${overallSummary}` : ''}

Instructions:
1. Prioritize CONSTRUCTIVE competency areas — turn each developmental gap into a concrete, measurable goal
2. Carry forward UNSUCCESSFUL or ONGOING goals (reframe/refine as needed, don't just copy verbatim)
3. Add at least one growth goal that builds on a POSITIVE strength
4. Each goal must be specific enough that success is clearly measurable
5. Set targetDate to "${targetDate}" for all goals unless a different date makes more sense

Return ONLY this JSON array (2–3 items), no other text:
[
  { "text": "...", "targetDate": "${targetDate}" },
  { "text": "...", "targetDate": "${targetDate}" }
]`

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ]

    let raw = ''

    // 1. Gemini Flash
    if (process.env.GEMINI_API_KEY) {
      try {
        const gemini = new OpenAI({
          apiKey: process.env.GEMINI_API_KEY,
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        })
        const res = await gemini.chat.completions.create({ model: 'gemini-2.0-flash', max_tokens: 600, messages })
        raw = res.choices[0]?.message?.content?.trim() ?? ''
        if (raw) return parseAndRespond(raw)
      } catch { /* fall through */ }
    }

    // 2. Anthropic Haiku
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const msg = await anthropic.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 600,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        })
        raw = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : ''
        if (raw) return parseAndRespond(raw)
      } catch { /* fall through */ }
    }

    // 3. OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const res = await openai.chat.completions.create({ model: 'gpt-4o-mini', max_tokens: 600, messages })
        raw = res.choices[0]?.message?.content?.trim() ?? ''
        if (raw) return parseAndRespond(raw)
      } catch { /* fall through */ }
    }

    return NextResponse.json({ error: 'No AI provider available or all providers failed' }, { status: 503 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

function parseAndRespond(raw: string): NextResponse {
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const goals = JSON.parse(cleaned)
    if (!Array.isArray(goals)) throw new Error('not an array')
    return NextResponse.json({ goals })
  } catch {
    return NextResponse.json({ error: `Could not parse AI response: ${raw.slice(0, 200)}` }, { status: 500 })
  }
}
