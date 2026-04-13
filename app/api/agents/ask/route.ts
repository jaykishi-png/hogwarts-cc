import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const client = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')
  return new OpenAI({ apiKey })
}

// ─── Agent profiles ───────────────────────────────────────────────────────────

const AGENTS: Record<string, { name: string; model: string; system: string; color: string }> = {
  DUMBLEDORE: {
    name: 'DUMBLEDORE',
    model: 'gpt-4o-mini',
    color: 'purple',
    system: `You are DUMBLEDORE, Chief of Staff AI for Jay Kishi, a content manager overseeing two brands:
- Revenue Rush: e-learning platform for e-commerce business owners
- The Process: clean supplement company
Jay's team: video editors, motion graphics artists, graphic designers, web developers.
Jay's tools: Notion, Monday.com, Slack, Google Drive, Google Calendar, Gmail, Discord.
You help Jay think through decisions, prioritize, plan his day, manage communications, and coordinate operations. Be concise and operator-focused.`,
  },
  HERMIONE: {
    name: 'HERMIONE',
    model: 'gpt-4o-mini',
    color: 'amber',
    system: `You are HERMIONE, Production Controller AI for Jay Kishi. You track project status, production timelines, Monday.com boards, overdue items, blockers, and team workload across Revenue Rush and The Process. Be precise and data-focused. Flag risks clearly.`,
  },
  HARRY: {
    name: 'HARRY',
    model: 'gpt-4o',
    color: 'red',
    system: `You are HARRY, Creative Review Strategist for Jay Kishi. You give structured feedback on creative assets (video, motion graphics, design, web) for two brands: Revenue Rush (polished, energetic, educational) and The Process (clean, minimal, premium). Be direct and specific. Give Jay exact language to use with his team.`,
  },
  RON: {
    name: 'RON',
    model: 'gpt-4o',
    color: 'orange',
    system: `You are RON, Strategic Ideation Engine for Jay Kishi. You generate campaign ideas, content angles, and creative briefs for Revenue Rush (e-commerce e-learning) and The Process (supplements). Think in campaigns and systems. Be specific enough that a creative team can act on it.`,
  },
  McGONAGALL: {
    name: 'McGONAGALL',
    model: 'gpt-4o-mini',
    color: 'green',
    system: `You are McGONAGALL, SOP and Workflow Architect for Jay Kishi. You write clear, actionable SOPs and process documentation for a 5-person creative team (video editors, motion artists, designers, web devs) using Notion, Monday, Slack, Google Drive. Every SOP needs a trigger, steps, owner, and done condition.`,
  },
  SNAPE: {
    name: 'SNAPE',
    model: 'gpt-4o-mini',
    color: 'slate',
    system: `You are SNAPE, AI Innovation Scout for Jay Kishi. You surface the latest AI tools relevant to content production, video editing, motion graphics, design, and marketing. Be honest about hype vs. real utility. Always include a "how Jay could use this" section. Jay's current stack: Claude, GPT-4o, Notion, Monday, Slack, Discord.`,
  },
  HAGRID: {
    name: 'HAGRID',
    model: 'gpt-4o-mini',
    color: 'amber',
    system: `You are HAGRID, Team and People Manager AI for Jay Kishi. You help Jay manage his 5-person creative team — 1:1 prep, feedback drafting, team health, performance observations, and communication coaching. You never talk to the team directly — only help Jay show up prepared and effective.`,
  },
}

// ─── Intent router ────────────────────────────────────────────────────────────

const ROUTER_SYSTEM = `You are a routing agent. Given a user's message, decide which AI agent should handle it.

Agents:
- DUMBLEDORE: day planning, priorities, scheduling, communications, general questions, strategy, decisions
- HERMIONE: production status, Monday.com, project tracking, timelines, blockers, overdue items, team workload
- HARRY: creative review, feedback on video/design/motion/web assets, brief review, brand alignment
- RON: campaign ideas, brainstorming, content strategy, creative briefs, marketing angles
- McGONAGALL: SOPs, workflows, process documentation, how-to guides, operational structure
- SNAPE: AI tools, AI news, technology scouting, tool evaluation, innovation
- HAGRID: team management, 1:1 prep, employee feedback, people issues, team health, HR

Reply with ONLY the agent name in uppercase. Nothing else. Example: HERMIONE`

async function routeToAgent(question: string): Promise<string> {
  try {
    const openai = client()
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 10,
      temperature: 0,
      messages: [
        { role: 'system', content: ROUTER_SYSTEM },
        { role: 'user', content: question },
      ],
    })
    const agentName = res.choices[0]?.message?.content?.trim().toUpperCase() ?? 'DUMBLEDORE'
    return AGENTS[agentName] ? agentName : 'DUMBLEDORE'
  } catch {
    return 'DUMBLEDORE'
  }
}

// ─── @mention override — "@snape what are..." → force SNAPE ──────────────────

function parseMention(question: string): { agent: string | null; cleanQuestion: string } {
  const match = question.match(/^@(\w+)\s+([\s\S]*)/i)
  if (!match) return { agent: null, cleanQuestion: question }
  const mentioned = match[1].toUpperCase()
  const cleanQuestion = match[2].trim()
  return {
    agent: AGENTS[mentioned] ? mentioned : null,
    cleanQuestion,
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { question } = await req.json()
  if (!question) return NextResponse.json({ error: 'No question provided' }, { status: 400 })

  try {
    client() // validate key exists
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 })
  }

  try {
    // Check for @mention first
    const { agent: mentionedAgent, cleanQuestion } = parseMention(question)
    const agentKey = mentionedAgent ?? await routeToAgent(question)
    const agent = AGENTS[agentKey]
    const finalQuestion = mentionedAgent ? cleanQuestion : question

    const openai = client()
    const res = await openai.chat.completions.create({
      model: agent.model,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: agent.system },
        { role: 'user', content: finalQuestion },
      ],
    })

    const answer = res.choices[0]?.message?.content ?? 'No response'
    return NextResponse.json({ answer, agent: agent.name, color: agent.color })

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
