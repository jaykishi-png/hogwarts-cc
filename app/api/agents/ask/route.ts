import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 60

const client = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')
  return new OpenAI({ apiKey })
}

// ─── Agent profiles ───────────────────────────────────────────────────────────

const AGENTS: Record<string, { name: string; model: string; system: string; color: string }> = {
  DUMBLEDORE: {
    name: 'DUMBLEDORE', model: 'gpt-4o-mini', color: 'purple',
    system: `You are DUMBLEDORE, Chief of Staff AI for Jay Kishi, a content manager overseeing two brands:
- Revenue Rush: e-learning platform for e-commerce business owners
- The Process: clean supplement company
Jay's team: video editors, motion graphics artists, graphic designers, web developers.
Jay's tools: Notion, Monday.com, Slack, Google Drive, Google Calendar, Gmail, Discord.
You help Jay think through decisions, prioritize, plan his day, manage communications, and coordinate operations. Be concise and operator-focused.`,
  },
  HERMIONE: {
    name: 'HERMIONE', model: 'gpt-4o-mini', color: 'amber',
    system: `You are HERMIONE, Production Controller AI for Jay Kishi. You track project status, production timelines, Monday.com boards, overdue items, blockers, and team workload across Revenue Rush and The Process. Be precise and data-focused. Flag risks clearly.`,
  },
  HARRY: {
    name: 'HARRY', model: 'gpt-4o', color: 'red',
    system: `You are HARRY, Creative Review Strategist for Jay Kishi. You give structured feedback on creative assets (video, motion graphics, design, web) for two brands: Revenue Rush (polished, energetic, educational) and The Process (clean, minimal, premium). Be direct and specific.`,
  },
  RON: {
    name: 'RON', model: 'gpt-4o', color: 'orange',
    system: `You are RON, Strategic Ideation Engine for Jay Kishi. You generate campaign ideas, content angles, and creative briefs for Revenue Rush (e-commerce e-learning) and The Process (supplements). Think in campaigns and systems. Be specific enough that a creative team can act on it.`,
  },
  McGONAGALL: {
    name: 'McGONAGALL', model: 'gpt-4o-mini', color: 'green',
    system: `You are McGONAGALL, SOP and Workflow Architect for Jay Kishi. You write clear, actionable SOPs and process documentation for a 5-person creative team using Notion, Monday, Slack, Google Drive. Every SOP needs a trigger, steps, owner, and done condition.`,
  },
  SNAPE: {
    name: 'SNAPE', model: 'gpt-4o-mini', color: 'slate',
    system: `You are SNAPE, AI Innovation Scout for Jay Kishi. You surface the latest AI tools relevant to content production, video editing, motion graphics, design, and marketing. Be honest about hype vs. real utility. Always include a "how Jay could use this" section.`,
  },
  HAGRID: {
    name: 'HAGRID', model: 'gpt-4o-mini', color: 'amber',
    system: `You are HAGRID, Team and People Manager AI for Jay Kishi. You help Jay manage his 5-person creative team — 1:1 prep, feedback drafting, team health, performance observations, and communication coaching. You never talk to the team directly — only help Jay show up prepared and effective.`,
  },
}

// ─── Router ───────────────────────────────────────────────────────────────────

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

async function routeToAgent(question: string, context?: string): Promise<string> {
  try {
    const openai = client()
    const userMsg = context ? `${context.slice(0, 500)}\n\nNew message: ${question}` : question
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 10,
      temperature: 0,
      messages: [
        { role: 'system', content: ROUTER_SYSTEM },
        { role: 'user', content: userMsg },
      ],
    })
    const agentName = res.choices[0]?.message?.content?.trim().toUpperCase() ?? 'DUMBLEDORE'
    return AGENTS[agentName] ? agentName : 'DUMBLEDORE'
  } catch {
    return 'DUMBLEDORE'
  }
}

function parseMention(question: string): { agent: string | null; cleanQuestion: string } {
  const match = question.match(/^@(\w+)\s+([\s\S]*)/i)
  if (!match) return { agent: null, cleanQuestion: question }
  const mentioned = match[1].toUpperCase()
  return { agent: AGENTS[mentioned] ? mentioned : null, cleanQuestion: match[2].trim() }
}

// ─── /rr — Revenue Rush Knowledge Base ───────────────────────────────────────

async function handleRRQuery(query: string, useStream: boolean): Promise<Response> {
  const openai = client()
  const assistantId = process.env.OPENAI_ASSISTANT_ID ?? 'asst_gaXsZXCTtFzGMd6iVOXzy2PX'

  try {
    const thread = await openai.beta.threads.create()
    await openai.beta.threads.messages.create(thread.id, { role: 'user', content: query })
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, { assistant_id: assistantId })

    if (run.status !== 'completed') {
      return NextResponse.json({ error: `KB run failed: ${run.status}` }, { status: 500 })
    }

    const msgs = await openai.beta.threads.messages.list(thread.id, { order: 'desc', limit: 1 })
    let answer = ''
    const msg = msgs.data[0]
    if (msg?.content) {
      for (const block of msg.content) {
        if (block.type === 'text') answer += block.text.value
      }
    }

    if (useStream) {
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'agent', agent: 'REVENUE RUSH KB', color: 'red' })}\n\n`))
          const words = answer.split(' ')
          let i = 0
          const send = () => {
            if (i >= words.length) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
              controller.close()
              return
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: (i > 0 ? ' ' : '') + words[i] })}\n\n`))
            i++
            setTimeout(send, 12)
          }
          send()
        },
      })
      return new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
    }

    return NextResponse.json({ answer, agent: 'REVENUE RUSH KB', color: 'red' })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

interface Attachment { dataUrl: string; name: string; type: string }
type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'high' } }

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    question: string
    attachments?: Attachment[]
    stream?: boolean
    context?: string
  }
  const { question, attachments, stream: useStream = false, context } = body

  const hasAttachments = attachments && attachments.length > 0
  if (!question && !hasAttachments) return NextResponse.json({ error: 'No question provided' }, { status: 400 })

  try { client() } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 })
  }

  // /rr command — route to Revenue Rush KB
  if ((question ?? '').trim().toLowerCase().startsWith('/rr ')) {
    const rrQuery = (question ?? '').trim().slice(4).trim()
    return handleRRQuery(rrQuery, useStream)
  }

  try {
    const { agent: mentionedAgent, cleanQuestion } = parseMention(question ?? '')
    const agentKey = mentionedAgent ?? await routeToAgent(question ?? 'Analyze the attached image(s)', context)
    const agent = AGENTS[agentKey]
    const finalQuestion = mentionedAgent ? cleanQuestion : (question || 'Analyze the attached image(s) and provide detailed feedback.')

    const images = (attachments ?? []).filter(a => a.type.startsWith('image/'))
    const hasImages = images.length > 0

    const userContent: ContentPart[] = [
      { type: 'text', text: finalQuestion },
      ...images.map(img => ({
        type: 'image_url' as const,
        image_url: { url: img.dataUrl, detail: 'high' as const },
      })),
    ]

    // Inject conversation memory into system prompt
    let systemPrompt = agent.system
    if (context) {
      systemPrompt += `\n\n## Recent conversation context\n${context.slice(0, 3000)}`
    }

    const openai = client()
    const model = hasImages ? 'gpt-4o' : agent.model

    if (useStream) {
      const streamRes = await openai.chat.completions.create({
        model,
        max_tokens: 1024,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: hasImages ? userContent : finalQuestion },
        ],
      })

      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'agent', agent: agent.name, color: agent.color })}\n\n`))
          try {
            for await (const chunk of streamRes) {
              const delta = chunk.choices[0]?.delta?.content ?? ''
              if (delta) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`))
              }
            }
          } finally {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
            controller.close()
          }
        },
      })
      return new Response(readable, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
      })
    }

    // Non-streaming (used by /brief)
    const res = await openai.chat.completions.create({
      model,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: hasImages ? userContent : finalQuestion },
      ],
    })
    const answer = res.choices[0]?.message?.content ?? 'No response'
    return NextResponse.json({ answer, agent: agent.name, color: agent.color })

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
