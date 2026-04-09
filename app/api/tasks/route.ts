import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { listTasks, createTask } from '@/lib/db/tasks'
import type { TaskStatus, TaskSource } from '@/types/task'

const createSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  due_date: z.string().optional(),
  source: z.enum(['manual','gmail','slack','monday','notion','calendar']).default('manual'),
  source_item_id: z.string().optional(),
  source_url: z.string().optional(),
  confidence: z.number().min(0).max(1).default(1.0),
  notion_page_id: z.string().optional(),
  monday_item_id: z.string().optional(),
  slack_thread_ts: z.string().optional(),
  gmail_thread_id: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const status = searchParams.get('status') as TaskStatus | null
    const source = searchParams.get('source') as TaskSource | null
    const view = searchParams.get('view')

    let tasks

    if (view === 'today') {
      // Exclude archived, deferred (until future date), and not_today
      const now = new Date().toISOString()
      tasks = await listTasks({
        excludeStatuses: ['archived'],
        deferredBefore: now,
      })
      tasks = tasks.filter(t => t.manual_priority !== 'not_today')
    } else {
      tasks = await listTasks({
        status: status ?? undefined,
        source: source ?? undefined,
      })
    }

    return NextResponse.json({ tasks })
  } catch (err) {
    console.error('GET /api/tasks', err)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const task = await createTask(parsed.data)
    return NextResponse.json({ task }, { status: 201 })
  } catch (err) {
    console.error('POST /api/tasks', err)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
