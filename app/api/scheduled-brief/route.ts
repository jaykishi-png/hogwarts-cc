import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 120

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const BRIEF_AGENTS = [
  { name: 'HERMIONE', prompt: 'In 3-4 sentences, give the production status: what is shipping, what is blocked, key risks.' },
  { name: 'HARRY',    prompt: 'In 3-4 sentences, review creative output quality. Any misses? Anything that needs a redo?' },
  { name: 'RON',      prompt: 'In 3-4 sentences, name the top 1-2 strategic opportunities or campaign angles to pursue.' },
  { name: 'McGONAGALL', prompt: 'In 3-4 sentences, identify the #1 workflow gap and give a concrete fix.' },
  { name: 'SNAPE',    prompt: 'In 3-4 sentences, report the most relevant AI/tech updates for content production this week.' },
]

export async function POST(req: NextRequest) {
  try {
    const { agents = BRIEF_AGENTS.map(a => a.name), slackChannel } = await req.json() as {
      agents?: string[]
      slackChannel?: string
    }

    const selectedAgents = BRIEF_AGENTS.filter(a => agents.includes(a.name))

    // Fan out agent calls in parallel
    const agentResults = await Promise.allSettled(
      selectedAgents.map(async (agent) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/agents/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: `@${agent.name.toLowerCase()} ${agent.prompt}`, stream: false }),
        })
        const data = await res.json()
        return { agent: agent.name, text: data.answer ?? '(no response)' }
      })
    )

    const results = agentResults.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { agent: selectedAgents[i].name, text: '(error)' }
    )

    // Dumbledore synthesis
    const synthesisContent = [
      'Agent reports for the scheduled brief:',
      ...results.map(r => `**${r.agent}**: ${r.text}`),
      '',
      'Write the executive brief synthesis with these exact sections:',
      '🔮 HIGHLIGHTS · ⚠️ RISKS · 🎯 FOCUS · 🚀 NEXT STEPS',
    ].join('\n')

    const synthRes = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1000,
      messages: [
        { role: 'system', content: 'You are DUMBLEDORE, executive chief of staff. Synthesise agent reports into a crisp executive brief.' },
        { role: 'user', content: synthesisContent },
      ],
    })
    const synthesis = synthRes.choices[0]?.message?.content ?? ''

    // Optional Slack post
    if (slackChannel && process.env.SLACK_BOT_TOKEN) {
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: slackChannel,
          text: `*📋 Hogwarts AI Scheduled Brief*\n\n${synthesis}`,
        }),
      })
    }

    return NextResponse.json({ results, synthesis, ranAt: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
