import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/client'

const MONDAY_API_URL = 'https://api.monday.com/v2'

async function mondayRequest(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: process.env.MONDAY_API_TOKEN ?? '',
    },
    body: JSON.stringify({ query, variables }),
  })
  return res.json()
}

async function getStatusColumnId(boardId: string): Promise<{ columnId: string; doneLabel: string } | null> {
  const data = await mondayRequest(`
    query($boardId: [ID!]!) {
      boards(ids: $boardId) {
        columns { id title type settings_str }
      }
    }
  `, { boardId: [boardId] })

  const columns = data?.data?.boards?.[0]?.columns ?? []
  const statusCol = columns.find((c: { type: string }) => c.type === 'status' || c.type === 'color')
  if (!statusCol) return null

  let doneLabel = 'Done'
  try {
    const settings = JSON.parse(statusCol.settings_str ?? '{}')
    const labels = settings.labels ?? {}
    // Find a label that means "done"
    const doneEntry = Object.entries(labels).find(([, v]) =>
      typeof v === 'string' && ['done', 'complete', 'completed'].includes(v.toLowerCase())
    )
    if (doneEntry) doneLabel = doneEntry[1] as string
  } catch { /* use default */ }

  return { columnId: statusCol.id, doneLabel }
}

export async function POST(req: NextRequest) {
  try {
    const { taskId, mondayItemId, boardId } = await req.json()

    if (!mondayItemId || !boardId) {
      return NextResponse.json({ error: 'mondayItemId and boardId required' }, { status: 400 })
    }

    const statusInfo = await getStatusColumnId(String(boardId))
    if (!statusInfo) {
      return NextResponse.json({ error: 'No status column found on board' }, { status: 404 })
    }

    // Update status to Done on Monday
    const result = await mondayRequest(`
      mutation($itemId: ID!, $boardId: ID!, $columnId: String!, $value: JSON!) {
        change_column_value(item_id: $itemId, board_id: $boardId, column_id: $columnId, value: $value) {
          id
        }
      }
    `, {
      itemId: String(mondayItemId),
      boardId: String(boardId),
      columnId: statusInfo.columnId,
      value: JSON.stringify({ label: statusInfo.doneLabel }),
    })

    if (result?.errors) {
      return NextResponse.json({ error: result.errors[0]?.message }, { status: 500 })
    }

    // Also mark done in our DB
    if (taskId) {
      await supabase.from('tasks').update({
        status: 'done',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', taskId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
