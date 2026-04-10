import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const SYSTEM = `You are DUMBLEDORE, Chief of Staff AI for Jay Kishi, a content manager overseeing two brands:
- Revenue Rush: e-learning platform for e-commerce business owners
- The Process: clean supplement company

Jay's team: video editors, motion graphics artists, graphic designers, web developers.
Jay's tools: Notion, Monday.com, Slack, Google Drive, Google Calendar, Gmail, Discord.

You are embedded in Jay's personal dashboard. Answer his questions directly, help him think through decisions, and route him to the right resource when needed. Be concise and operator-focused.`

export async function POST(req: NextRequest) {
  const { question } = await req.json()
  if (!question) return NextResponse.json({ error: 'No question provided' }, { status: 400 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 })

  try {
    const client = new OpenAI({ apiKey })
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: question },
      ],
    })
    const answer = res.choices[0]?.message?.content ?? 'No response'
    return NextResponse.json({ answer, agent: 'DUMBLEDORE' })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
