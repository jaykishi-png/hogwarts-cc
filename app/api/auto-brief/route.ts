import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AutoBriefBody {
  itemId:  string
  boardId: string
}

interface MondayColumnValue {
  id:    string
  type:  string
  text:  string
  value: string
}

interface MondayItemDetail {
  id:            string
  name:          string
  state:         string
  updated_at:    string
  column_values: MondayColumnValue[]
  board: {
    id:   string
    name: string
  }
}

interface MondayItemQueryResponse {
  data?: {
    items?: MondayItemDetail[]
  }
  errors?: Array<{ message: string }>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONDAY_API_URL = 'https://api.monday.com/v2'

const RON_SYSTEM_PROMPT =
  'You are RON, Strategic Ideation Engine for Jay Kishi\'s content agency. ' +
  'You generate complete creative briefs with: Campaign Name, Brand, Objective, ' +
  'Core Message, Target Audience, Key Hooks (3), Visual Direction, Success Metric. ' +
  'Be specific and actionable.'

// ─── Monday helper ────────────────────────────────────────────────────────────

async function fetchMondayItem(
  apiToken: string,
  itemId:   string,
  boardId:  string
): Promise<MondayItemDetail | null> {
  const query = `
    query {
      items(ids: [${itemId}]) {
        id
        name
        state
        updated_at
        board { id name }
        column_values {
          id
          type
          text
          value
        }
      }
    }
  `

  const res = await fetch(MONDAY_API_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': apiToken,
      'API-Version':   '2024-01',
    },
    body: JSON.stringify({ query }),
  })

  if (!res.ok) {
    throw new Error(`Monday API HTTP ${res.status}`)
  }

  const data = await res.json() as MondayItemQueryResponse

  if (data.errors?.length) {
    throw new Error(data.errors.map(e => e.message).join('; '))
  }

  // Prefer the item whose board matches, fall back to first
  const items = data.data?.items ?? []
  return (
    items.find(i => String(i.board?.id) === String(boardId)) ??
    items[0] ??
    null
  )
}

// ─── Item details → prompt string ─────────────────────────────────────────────

function buildItemContext(item: MondayItemDetail): string {
  const status    = item.column_values.find(c => c.type === 'status' || c.type === 'color')
  const dueDate   = item.column_values.find(c => c.type === 'date' || c.id.toLowerCase().includes('date'))
  const assignees = item.column_values.find(c => c.type === 'people' || c.type === 'multiple-person')
  const descCol   = item.column_values.find(c => c.id === 'text' || c.id.toLowerCase().includes('desc') || c.id.toLowerCase().includes('notes'))

  const lines = [
    `Item Name:   ${item.name}`,
    `Board:       ${item.board?.name ?? 'Unknown'}`,
    `Status:      ${status?.text ?? 'Not set'}`,
    `Due Date:    ${dueDate?.text ?? 'Not set'}`,
    `Assignees:   ${assignees?.text ?? 'Unassigned'}`,
  ]

  if (descCol?.text) {
    lines.push(`Description: ${descCol.text}`)
  }

  return lines.join('\n')
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const mondayToken = process.env.MONDAY_API_TOKEN
  const openaiKey   = process.env.OPENAI_API_KEY

  if (!mondayToken || !openaiKey) {
    return NextResponse.json(
      { error: 'MONDAY_API_TOKEN and OPENAI_API_KEY must be configured' },
      { status: 503 }
    )
  }

  try {
    const body = await req.json() as AutoBriefBody

    if (!body.itemId || !body.boardId) {
      return NextResponse.json(
        { error: 'itemId and boardId are required' },
        { status: 400 }
      )
    }

    // Step 1: Fetch the Monday item
    const item = await fetchMondayItem(mondayToken, body.itemId, body.boardId)
    if (!item) {
      return NextResponse.json(
        { error: `Item ${body.itemId} not found on board ${body.boardId}` },
        { status: 404 }
      )
    }

    // Step 2: Build the prompt
    const itemContext = buildItemContext(item)
    const userPrompt  = `Generate a complete creative brief for this production item:\n\n${itemContext}`

    // Step 3: Call OpenAI with RON's system prompt
    const openai = new OpenAI({ apiKey: openaiKey })

    const completion = await openai.chat.completions.create({
      model:      'gpt-4o',
      max_tokens: 1500,
      messages: [
        { role: 'system', content: RON_SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt },
      ],
    })

    const brief = completion.choices[0]?.message?.content ?? '(No brief generated)'

    return NextResponse.json({
      brief,
      itemName: item.name,
    })
  } catch (err: unknown) {
    console.error('[auto-brief] error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
