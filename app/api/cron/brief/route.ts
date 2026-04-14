import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 120

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const BRIEF_AGENTS = [
  { name: 'SNAPE',      model: 'gpt-4o-mini', prompt: 'You are SNAPE, AI Scout. In 3-4 sentences, report the most relevant AI tools or tech updates from this week for content production, video editing, or marketing ops.' },
  { name: 'HERMIONE',   model: 'gpt-4o-mini', prompt: 'You are HERMIONE, Production Controller. In 3-4 sentences, summarise production status: what shipped, what is blocked, and any timeline or capacity risks.' },
  { name: 'HARRY',      model: 'gpt-4o',      prompt: 'You are HARRY, Creative Review. In 3-4 sentences, review creative output quality this week across Revenue Rush and The Process.' },
  { name: 'RON',        model: 'gpt-4o',      prompt: 'You are RON, Strategist. In 3-4 sentences, name the top 1-2 strategic opportunities or campaign angles worth pursuing next week.' },
  { name: 'McGONAGALL', model: 'gpt-4o-mini', prompt: 'You are McGONAGALL, Ops Architect. In 3-4 sentences, identify the #1 workflow gap and give a concrete fix Jay can implement immediately.' },
  { name: 'HAGRID',     model: 'gpt-4o-mini', prompt: 'You are HAGRID, People Manager. In 3-4 sentences, give a team health snapshot: capacity, morale, and the one thing Jay should acknowledge with his team.' },
]

async function postToSlack(text: string): Promise<void> {
  const token   = process.env.SLACK_BOT_TOKEN
  const channel = process.env.SLACK_BRIEF_CHANNEL ?? process.env.SLACK_CHANNEL_ID
  if (!token || !channel) { console.log('[cron/brief] Slack not configured — skipping post'); return }
  try {
    await fetch('https://slack.com/api/chat.postMessage', {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ channel, text, mrkdwn: true }),
    })
  } catch (err) {
    console.error('[cron/brief] Slack post failed:', err)
  }
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? new URL(req.url).searchParams.get('secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const collected: { name: string; text: string }[] = []

    for (const step of BRIEF_AGENTS) {
      try {
        const res = await openai.chat.completions.create({
          model:      step.model,
          max_tokens: 200,
          messages: [
            { role: 'system', content: `You are ${step.name}, a specialist AI agent for Jay Kishi's content production team. Be concise and direct.` },
            { role: 'user',   content: step.prompt },
          ],
        })
        collected.push({ name: step.name, text: res.choices[0]?.message?.content ?? '' })
      } catch {
        collected.push({ name: step.name, text: '(unavailable)' })
      }
    }

    // Dumbledore synthesis
    const synthesisPrompt = [
      "Here are this week's team reports:",
      '',
      ...collected.map(c => `**${c.name}:** ${c.text}`),
      '',
      'Write the Monday morning executive brief. Use these exact sections:',
      '🔮 HIGHLIGHTS — top 2-3 wins or notable moments',
      '⚠️ RISKS & BLOCKERS — what needs immediate attention',
      '🎯 FOCUS — the single #1 priority for this week',
      '👥 TEAM HEALTH — one sentence',
      '🚀 THIS WEEK — exactly 3 action bullets',
      '',
      'Be direct and actionable. Jay reads this in under 60 seconds.',
    ].join('\n')

    const synthRes = await openai.chat.completions.create({
      model:      'gpt-4o-mini',
      max_tokens: 600,
      messages: [
        { role: 'system', content: 'You are DUMBLEDORE, Chief of Staff AI. Synthesise team reports into a sharp executive brief.' },
        { role: 'user',   content: synthesisPrompt },
      ],
    })
    const synthesis = synthRes.choices[0]?.message?.content ?? '(no synthesis)'

    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    await postToSlack(`*🧙 Hogwarts Monday Morning Brief — ${dateStr}*\n\n${synthesis}`)

    return NextResponse.json({ ok: true, agents: collected.length, synthesis })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
