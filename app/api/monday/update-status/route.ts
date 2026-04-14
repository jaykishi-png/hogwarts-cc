import { NextRequest, NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpdateStatusBody {
  itemId:   string | number
  columnId: string
  value:    string
  boardId:  string | number
}

interface MondayMutationResponse {
  data?: {
    change_column_value?: {
      id: string
    }
  }
  errors?: Array<{ message: string }>
}

// ─── Monday GraphQL helper ────────────────────────────────────────────────────

const MONDAY_API_URL = 'https://api.monday.com/v2'

async function mondayMutation(
  apiToken: string,
  query:    string
): Promise<MondayMutationResponse> {
  const res = await fetch(MONDAY_API_URL, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiToken,
      'API-Version':   '2024-01',
    },
    body: JSON.stringify({ query }),
  })

  if (!res.ok) {
    throw new Error(`Monday API HTTP ${res.status}: ${res.statusText}`)
  }

  return res.json() as Promise<MondayMutationResponse>
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiToken = process.env.MONDAY_API_TOKEN
  if (!apiToken) {
    return NextResponse.json(
      { error: 'MONDAY_API_TOKEN is not configured' },
      { status: 503 }
    )
  }

  try {
    const body = await req.json() as UpdateStatusBody

    const { itemId, columnId, value, boardId } = body

    if (!itemId || !columnId || value === undefined || !boardId) {
      return NextResponse.json(
        { error: 'itemId, columnId, value, and boardId are required' },
        { status: 400 }
      )
    }

    // Escape the value string for use inside the GraphQL query
    const escapedValue = JSON.stringify(value) // produces a quoted, escaped string

    const mutation = `
      mutation {
        change_column_value(
          item_id: ${itemId},
          board_id: ${boardId},
          column_id: "${columnId}",
          value: ${escapedValue}
        ) {
          id
        }
      }
    `

    const result = await mondayMutation(apiToken, mutation)

    if (result.errors && result.errors.length > 0) {
      const errMsg = result.errors.map(e => e.message).join('; ')
      console.error('[monday/update-status] GraphQL error:', errMsg)
      return NextResponse.json({ error: errMsg }, { status: 422 })
    }

    return NextResponse.json({
      success: true,
      itemId:  String(itemId),
    })
  } catch (err: unknown) {
    console.error('[monday/update-status] error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
