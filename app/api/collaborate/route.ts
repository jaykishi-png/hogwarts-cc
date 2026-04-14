import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 120

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { topic, agents } = await req.json() as { topic: string; agents: string[] }
    if (!topic?.trim() || !agents?.length) {
      return NextResponse.json({ error: 'topic and agents required' }, { status: 400 })
    }

    // Fan out to each selected agent in parallel
    const agentResponses = await Promise.allSettled(
      agents.map(async (agentName: string) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/agents/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: `@${agentName.toLowerCase()} ${topic}`, stream: false }),
        })
        const data = await res.json()
        return { agent: agentName, text: data.answer ?? data.error ?? '(no response)' }
      })
    )

    const results = agentResponses.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { agent: agents[i], text: '(error)' }
    )

    // Dumbledore synthesis
    const synthesisPrompt = [
      `Original task: "${topic}"`,
      '',
      'Individual agent responses:',
      ...results.map(r => `**${r.agent}**: ${r.text}`),
      '',
      'Synthesise these perspectives into one unified, actionable recommendation. Be concise and direct.',
    ].join('\n')

    const synthRes = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1200,
      messages: [
        { role: 'system', content: 'You are DUMBLEDORE, Chief of Staff at Hogwarts AI. Synthesise multiple agent inputs into unified strategic guidance.' },
        { role: 'user', content: synthesisPrompt },
      ],
    })

    const synthesis = synthRes.choices[0]?.message?.content ?? '(synthesis failed)'

    return NextResponse.json({ results, synthesis })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
