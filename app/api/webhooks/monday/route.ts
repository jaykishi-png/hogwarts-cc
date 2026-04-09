import { NextRequest, NextResponse } from 'next/server'
import { getTaskBySourceItem, createTask, updateTask } from '@/lib/db/tasks'
import { upsertSourceItem, linkSourceItemToTask } from '@/lib/db/source-items'

const MONDAY_API_URL = 'https://api.monday.com/v2'

const NEEDS_REVIEW_STATUSES = ['needs review', 'needs review jk']
const DONE_STATUSES = ['done', 'complete', 'completed', 'closed', 'cancelled', 'canceled']

async function fetchItemById(apiToken: string, itemId: string) {
  const res = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiToken,
      'API-Version': '2024-01',
    },
    body: JSON.stringify({
      query: `{
        items(ids: [${itemId}]) {
          id name updated_at
          board { id name }
          group { title }
          column_values { id type text value }
        }
      }`,
    }),
  })
  const data = await res.json() as {
    data: {
      items: Array<{
        id: string
        name: string
        updated_at: string
        board: { id: string; name: string }
        group: { title: string }
        column_values: Array<{ id: string; type: string; text: string; value: string }>
      }>
    }
  }
  return data.data?.items?.[0] ?? null
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>

  // Monday challenge handshake (sent when webhook is first registered)
  if ('challenge' in body) {
    return NextResponse.json({ challenge: body.challenge })
  }

  const apiToken = process.env.MONDAY_API_TOKEN
  if (!apiToken) {
    return NextResponse.json({ error: 'MONDAY_API_TOKEN not configured' }, { status: 503 })
  }

  const event = body.event as {
    boardId?: number
    pulseId?: number   // item ID in older API versions
    itemId?: number
    columnId?: string
    columnType?: string
    value?: { label?: { text?: string } }
    previousValue?: { label?: { text?: string } }
  } | undefined

  if (!event) {
    return NextResponse.json({ ok: true }) // ignore malformed
  }

  const itemId = String(event.itemId ?? event.pulseId ?? '')
  if (!itemId) return NextResponse.json({ ok: true })

  // Fetch fresh item data from Monday
  const item = await fetchItemById(apiToken, itemId)
  if (!item) return NextResponse.json({ ok: true })

  const statusCol = item.column_values.find(
    c => c.type === 'status' || c.type === 'color'
  )
  const status = statusCol?.text ?? ''
  const statusLower = status.toLowerCase().trim()

  const isNeedsReview = NEEDS_REVIEW_STATUSES.includes(statusLower)
  const isDone = DONE_STATUSES.some(s => statusLower.includes(s))

  const existing = await getTaskBySourceItem('monday', itemId)

  if (isDone) {
    // Mark task done if it exists
    if (existing) {
      await updateTask(existing.id, {
        status: 'done',
        completed_at: new Date().toISOString(),
      })
    }
    return NextResponse.json({ ok: true, action: 'marked_done' })
  }

  if (!isNeedsReview) {
    // Status changed away from Needs Review — archive the task
    if (existing) {
      await updateTask(existing.id, { status: 'archived' })
    }
    return NextResponse.json({ ok: true, action: 'archived' })
  }

  // Status is now Needs Review — create or update
  const dueDateCol = item.column_values.find(
    c => c.type === 'date' || c.id.toLowerCase().includes('date')
  )
  const dueDate = dueDateCol?.text || undefined
  const boardName = item.board?.name ?? ''
  const groupName = item.group?.title ?? ''
  const url = `https://the-clean-supps.monday.com/boards/${item.board?.id}/pulses/${itemId}`

  await upsertSourceItem('monday', itemId, item as unknown as Record<string, unknown>)

  if (existing) {
    const updates: Record<string, unknown> = {
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    }
    if (!existing.user_edited) {
      updates.title = item.name
      updates.tags = [boardName, groupName, status].filter(Boolean)
    }
    await updateTask(existing.id, updates)
    return NextResponse.json({ ok: true, action: 'updated', itemId })
  }

  const task = await createTask({
    title: item.name,
    due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
    source: 'monday',
    source_item_id: itemId,
    source_url: url,
    monday_item_id: itemId,
    confidence: 1.0,
    tags: [boardName, groupName, status].filter(Boolean),
  })
  await linkSourceItemToTask('monday', itemId, task.id)

  return NextResponse.json({ ok: true, action: 'created', itemId })
}
