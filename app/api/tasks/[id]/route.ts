import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTask, updateTask, deleteTask } from '@/lib/db/tasks'

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: z.enum(['open','in_progress','done','deferred','archived']).optional(),
  manual_priority: z.enum(['P1','P2','P3','pinned','not_today']).nullable().optional(),
  due_date: z.string().nullable().optional(),
  deferred_until: z.string().nullable().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  user_edited: z.boolean().optional(),
  notion_page_id: z.string().optional(),
  monday_item_id: z.string().optional(),
  priority_score: z.number().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const task = await getTask(id)
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ task })
  } catch (err) {
    console.error('GET /api/tasks/[id]', err)
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // If user is changing title/notes, mark user_edited
    const updates = { ...parsed.data }
    if (updates.title || updates.notes) {
      updates.user_edited = true
    }

    // Auto-set completed_at when marking done
    if (updates.status === 'done') {
      const task = await getTask(id)
      if (task && task.status !== 'done') {
        Object.assign(updates, { completed_at: new Date().toISOString() })
      }
    }

    const task = await updateTask(id, updates)
    return NextResponse.json({ task })
  } catch (err) {
    console.error('PATCH /api/tasks/[id]', err)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteTask(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/tasks/[id]', err)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
