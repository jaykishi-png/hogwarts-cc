import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { addMemory } from '@/lib/memory'
import type { MemoryType, MemoryImportance, MemoryEntry } from '@/lib/memory'

// Gemini Flash — cheapest capable model for structured extraction
function extractionClient(): { client: OpenAI; model: string } {
  if (process.env.GEMINI_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      }),
      model: 'gemini-2.0-flash',
    }
  }
  if (!process.env.OPENAI_API_KEY) throw new Error('GEMINI_API_KEY or OPENAI_API_KEY required')
  return { client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), model: 'gpt-4o-mini' }
}

const EXTRACTION_SYSTEM_PROMPT = `You are a memory extraction agent. Given a conversation exchange, extract key facts worth remembering long-term. Focus on:
- Decisions made (what was decided and why)
- Tasks completed or assigned
- Project details (names, deadlines, budgets, goals)
- Jay's preferences discovered ("Jay prefers X", "Jay dislikes Y")
- Brand/campaign facts (names, strategies, positioning)
- Context that will help future conversations

Do NOT memorise: greetings, generic advice, questions without answers, or anything that won't matter in 2 weeks.

Return JSON array of memory objects. Each object:
{ type: 'fact'|'task_completed'|'decision'|'project'|'preference'|'context'|'brand', agent: string, content: string (max 120 chars, starts with action verb or noun), importance: 'high'|'medium'|'low', tags: string[] (2-4 tags) }

Return [] if nothing worth remembering. Maximum 5 memories per exchange.`

interface ExtractBody {
  question:       string
  answer:         string
  agent:          string
  conversationId: string
}

interface ExtractedMemory {
  type:       MemoryType
  agent:      string
  content:    string
  importance: MemoryImportance
  tags:       string[]
}

// ─── POST /api/memory/extract ─────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as Partial<ExtractBody>
    const { question, answer, agent, conversationId } = body

    if (!question || !answer || !agent) {
      return NextResponse.json(
        { error: 'Missing required fields: question, answer, agent' },
        { status: 400 },
      )
    }

    const { client, model } = extractionClient()

    const userContent = `Agent: ${agent}
Question: ${question}
Answer: ${answer}`

    const completion = await client.chat.completions.create({
      model,
      max_tokens:  500,
      temperature: 0,
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user',   content: userContent },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'

    // GPT-4o-mini with json_object format returns an object — extract array
    let items: ExtractedMemory[] = []
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      // Model may return { memories: [...] } or a bare array wrapped in an object key
      if (Array.isArray(parsed)) {
        items = parsed as ExtractedMemory[]
      } else {
        const firstArrayValue = Object.values(parsed).find(v => Array.isArray(v))
        items = (firstArrayValue as ExtractedMemory[]) ?? []
      }
    } catch {
      items = []
    }

    // Validate and persist each extracted memory
    const saved: MemoryEntry[] = []
    const source = conversationId ?? 'system'

    for (const item of items.slice(0, 5)) {
      if (!item.type || !item.content) continue

      const entry = await addMemory({
        type:       item.type       || 'fact',
        agent:      item.agent      || agent,
        content:    String(item.content).slice(0, 500),
        importance: item.importance || 'medium',
        tags:       Array.isArray(item.tags) ? item.tags.slice(0, 4) : [],
        source,
      })

      if (entry) saved.push(entry)
    }

    return NextResponse.json({ extracted: saved, count: saved.length })
  } catch (err) {
    console.error('[memory/extract POST]', err)
    // Graceful degradation — don't break the caller
    return NextResponse.json({ extracted: [], count: 0 })
  }
}
