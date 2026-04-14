import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 60

const client = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')
  return new OpenAI({ apiKey })
}

// ─── Live data helpers ────────────────────────────────────────────────────────

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))])
}

async function getCalendarContext(): Promise<string> {
  try {
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
    if (!refreshToken) return ''

    // Refresh to get access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        refresh_token: refreshToken,
        grant_type:    'refresh_token',
      }),
    })
    const tokenData = await tokenRes.json() as { access_token?: string }
    const accessToken = tokenData.access_token
    if (!accessToken) return ''

    const { fetchTodayEventsRaw } = await import('@/lib/integrations/google-calendar')
    const { events } = await fetchTodayEventsRaw(accessToken, refreshToken)
    if (!events || events.length === 0) return 'No calendar events today.'

    const lines = (events as Array<{ title?: string; start?: string; end?: string; location?: string }>)
      .slice(0, 10)
      .map(e => {
        const time = e.start ? new Date(e.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''
        return `- ${time ? time + ': ' : ''}${e.title ?? 'Untitled'}${e.location ? ` (${e.location})` : ''}`
      })
    return `Today's calendar (${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}):\n${lines.join('\n')}`
  } catch {
    return ''
  }
}

async function getSlackContext(): Promise<string> {
  try {
    const { fetchMentionsAndDMs } = await import('@/lib/integrations/slack')
    const messages = await fetchMentionsAndDMs(24)
    if (!messages || messages.length === 0) return 'No recent Slack messages.'
    const lines = (messages as Array<{ text?: string; channel?: string; channelName?: string; userName?: string }>)
      .slice(0, 8)
      .map(m => `- [${m.channelName ?? m.channel ?? 'DM'}] ${m.userName ?? 'Someone'}: ${(m.text ?? '').slice(0, 120)}`)
    return `Recent Slack messages (last 24h):\n${lines.join('\n')}`
  } catch {
    return ''
  }
}

async function getMondayContext(): Promise<string> {
  try {
    const apiToken = process.env.MONDAY_API_TOKEN
    if (!apiToken) return ''
    const { fetchAssignedItems } = await import('@/lib/integrations/monday')
    const items = await fetchAssignedItems(apiToken)
    if (!items || items.length === 0) return 'No active Monday.com items.'
    // Find blocked/overdue items first
    const allItems = items as Array<{ name?: string; status?: string; boardName?: string; dueDate?: string; needsReview?: boolean }>
    const blockedFirst = [...allItems].sort((a, b) => {
      const aBlocked = /blocked|stuck|waiting/i.test(a.status ?? '')
      const bBlocked = /blocked|stuck|waiting/i.test(b.status ?? '')
      return aBlocked === bBlocked ? 0 : aBlocked ? -1 : 1
    })
    const lines = blockedFirst
      .slice(0, 12)
      .map(item => `- [${item.boardName ?? 'Board'}] ${item.name ?? 'Untitled'} — ${item.status ?? 'unknown'}${item.dueDate ? ` (due ${item.dueDate})` : ''}`)
    return `Monday.com active items (${allItems.length} total):\n${lines.join('\n')}`
  } catch {
    return ''
  }
}

async function getGmailContext(): Promise<string> {
  try {
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
    if (!refreshToken) return ''

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        refresh_token: refreshToken,
        grant_type:    'refresh_token',
      }),
    })
    const tokenData = await tokenRes.json() as { access_token?: string }
    const accessToken = tokenData.access_token
    if (!accessToken) return ''

    const searchRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=10',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const searchData = await searchRes.json() as { messages?: { id: string }[] }
    const messages = searchData.messages ?? []
    if (messages.length === 0) return 'No unread Gmail messages.'

    const summaries: string[] = []
    for (const msg of messages.slice(0, 6)) {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        const msgData = await msgRes.json() as { payload?: { headers?: { name: string; value: string }[] } }
        const headers = msgData.payload?.headers ?? []
        const subject = headers.find(h => h.name === 'Subject')?.value ?? '(no subject)'
        const from = headers.find(h => h.name === 'From')?.value ?? 'Unknown'
        summaries.push(`- From: ${from.slice(0, 50)} | Subject: ${subject.slice(0, 80)}`)
      } catch { /* skip */ }
    }

    return `Unread Gmail (${messages.length} total, showing ${summaries.length}):\n${summaries.join('\n')}`
  } catch {
    return ''
  }
}

async function getNotionContext(): Promise<string> {
  try {
    const notionToken = process.env.NOTION_TOKEN
    if (!notionToken) return ''

    const res = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { value: 'page', property: 'object' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
        page_size: 8,
      }),
    })
    const data = await res.json() as { results?: Array<{ properties?: Record<string, { title?: Array<{ plain_text: string }> }>; last_edited_time?: string }> }
    const pages = data.results ?? []
    if (pages.length === 0) return 'No recent Notion pages.'

    const lines = pages.map(p => {
      const titleProp = Object.values(p.properties ?? {}).find(v => v.title)
      const title = titleProp?.title?.[0]?.plain_text ?? 'Untitled'
      const edited = p.last_edited_time ? new Date(p.last_edited_time).toLocaleDateString() : ''
      return `- ${title}${edited ? ` (edited ${edited})` : ''}`
    })
    return `Recently edited Notion pages:\n${lines.join('\n')}`
  } catch {
    return ''
  }
}

// ─── Agent profiles ───────────────────────────────────────────────────────────

const AGENTS: Record<string, { name: string; model: string; system: string; color: string }> = {
  DUMBLEDORE: {
    name: 'DUMBLEDORE', model: 'gpt-4o-mini', color: 'purple',
    system: `You are DUMBLEDORE, Chief of Staff AI and Orchestrator for Jay Kishi's content agency.
Jay runs two brands: Revenue Rush (e-commerce e-learning) and The Process (supplements).
Jay's team: video editors, motion graphics artists, graphic designers, web developers.
Tools in use: Notion, Monday.com, Slack, Google Drive, Google Calendar, Gmail, Frame.io.

Your role is ORCHESTRATION, not execution. When you receive a message:
1. If it's a strategy/planning/synthesis question YOU should answer — do so directly.
2. For everything else, respond with: "→ Routing to [AGENT_NAME]: [one sentence on why]" then answer as that agent would, using their name and expertise.

Specialist agents you can invoke:
- HERMIONE: production status, Monday.com, timelines, blockers, team workload
- HARRY: creative review, feedback on video/design/motion assets
- RON: campaign ideas, content strategy, creative briefs, brainstorming
- McGONAGALL: SOPs, workflows, process docs, operational structure
- SNAPE: AI tools, technology scouting, innovation
- HAGRID: team management, 1:1 prep, people issues, HR

Only answer directly yourself for: day planning, meeting prep, executive decisions, synthesis across multiple domains, or when directly @-mentioned.`,
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
- DUMBLEDORE: executive decisions, day planning, cross-domain synthesis, prioritization, "what should I focus on" questions
- HERMIONE: production status, Monday.com, project tracking, timelines, blockers, overdue items, team workload
- HARRY: creative review, feedback on video/design/motion/web assets, brief review, brand alignment
- RON: campaign ideas, brainstorming, content strategy, creative briefs, marketing angles, product names
- McGONAGALL: SOPs, workflows, process documentation, how-to guides, operational structure
- SNAPE: AI tools, AI news, technology scouting, tool evaluation, innovation, prompt engineering
- HAGRID: team management, 1:1 prep, employee feedback, people issues, team health, HR

Route to DUMBLEDORE ONLY for: "what should I do today", "prioritize my day", "help me decide", synthesis questions, or truly ambiguous questions.
For specific domain questions (even if phrased generally), route to the specialist.

Reply with ONLY the agent name in uppercase. Example: HERMIONE`

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

  // /mp command — meta-prompt builder
  if ((question ?? '').trim().toLowerCase().startsWith('/mp ')) {
    const mpQuery = (question ?? '').trim().slice(4).trim()
    // Force route to SNAPE with meta-prompt system
    const metaAgent = {
      name: 'SNAPE', model: 'gpt-4o', color: 'slate',
      system: `You are a world-class prompt engineer. Given a rough prompt idea, rewrite it as a PERFECT, detailed prompt that will get the best results from an AI. Structure your output as:

**ROLE:** [Who the AI should be]
**CONTEXT:** [Relevant background]
**TASK:** [Exactly what to do, step by step]
**FORMAT:** [How to structure the output]
**CONSTRAINTS:** [What to avoid or limit]
**EXAMPLE OUTPUT:** [Optional: a brief example of what a good response looks like]

Be specific, actionable, and thorough. The prompt should be immediately usable.`,
    }
    const openai = client()

    if (useStream) {
      const streamRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1500,
        stream: true,
        messages: [
          { role: 'system', content: metaAgent.system },
          { role: 'user', content: `Turn this rough idea into a perfect prompt:\n\n${mpQuery}` },
        ],
      })
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'agent', agent: 'SNAPE', color: 'slate' })}\n\n`))
          try {
            for await (const chunk of streamRes) {
              const delta = chunk.choices[0]?.delta?.content ?? ''
              if (delta) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`))
            }
          } finally {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
            controller.close()
          }
        },
      })
      return new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } })
    }

    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      messages: [
        { role: 'system', content: metaAgent.system },
        { role: 'user', content: `Turn this rough idea into a perfect prompt:\n\n${mpQuery}` },
      ],
    })
    return NextResponse.json({ answer: res.choices[0]?.message?.content ?? 'No response', agent: 'SNAPE', color: 'slate' })
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

    // Inject live data for specific agents
    let liveDataContext = ''
    if (agentKey === 'HERMIONE') {
      const [mondayCtx, notionCtx] = await Promise.all([
        withTimeout(getMondayContext(), 4000, ''),
        withTimeout(getNotionContext(), 4000, ''),
      ])
      liveDataContext = [mondayCtx, notionCtx].filter(Boolean).join('\n\n')
    } else if (agentKey === 'DUMBLEDORE') {
      const [calCtx, slackCtx, gmailCtx] = await Promise.all([
        withTimeout(getCalendarContext(), 4000, ''),
        withTimeout(getSlackContext(), 4000, ''),
        withTimeout(getGmailContext(), 4000, ''),
      ])
      liveDataContext = [calCtx, slackCtx, gmailCtx].filter(Boolean).join('\n\n')
    } else if (agentKey === 'HAGRID') {
      const slackCtx = await withTimeout(getSlackContext(), 4000, '')
      liveDataContext = slackCtx
    } else if (agentKey === 'RON') {
      const notionCtx = await withTimeout(getNotionContext(), 4000, '')
      liveDataContext = notionCtx
    }

    // Build system prompt with optional live data AND memory context
    let systemPrompt = agent.system
    if (liveDataContext) {
      systemPrompt += `\n\n## Live Data (as of right now)\n${liveDataContext}`
    }
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
