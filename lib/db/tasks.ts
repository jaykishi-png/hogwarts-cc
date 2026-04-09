import { supabase } from './client'
import type { Task, TaskCreateInput, TaskUpdateInput, TaskStatus, TaskSource } from '@/types/task'

export async function listTasks(filters?: {
  status?: TaskStatus | TaskStatus[]
  source?: TaskSource
  excludeStatuses?: TaskStatus[]
  deferredBefore?: string
}): Promise<Task[]> {
  let query = supabase.from('tasks').select('*')

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status)
    } else {
      query = query.eq('status', filters.status)
    }
  }

  if (filters?.excludeStatuses) {
    query = query.not('status', 'in', `(${filters.excludeStatuses.join(',')})`)
  }

  if (filters?.source) {
    query = query.eq('source', filters.source)
  }

  if (filters?.deferredBefore) {
    query = query.or(
      `deferred_until.is.null,deferred_until.lte.${filters.deferredBefore}`
    )
  }

  const { data, error } = await query.order('priority_score', { ascending: false })

  if (error) throw new Error(`listTasks: ${error.message}`)
  return (data ?? []) as Task[]
}

export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`getTask: ${error.message}`)
  }
  return data as Task
}

export async function createTask(input: TaskCreateInput): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description,
      due_date: input.due_date,
      source: input.source ?? 'manual',
      source_item_id: input.source_item_id,
      source_url: input.source_url,
      confidence: input.confidence ?? 1.0,
      notion_page_id: input.notion_page_id,
      monday_item_id: input.monday_item_id,
      slack_thread_ts: input.slack_thread_ts,
      gmail_thread_id: input.gmail_thread_id,
      tags: input.tags ?? [],
      notes: input.notes,
    })
    .select()
    .single()

  if (error) throw new Error(`createTask: ${error.message}`)
  return data as Task
}

export async function updateTask(id: string, input: TaskUpdateInput): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`updateTask: ${error.message}`)
  return data as Task
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'archived' })
    .eq('id', id)

  if (error) throw new Error(`deleteTask: ${error.message}`)
}

export async function bulkUpdatePriorityScores(
  updates: Array<{ id: string; priority_score: number }>
): Promise<void> {
  // Supabase doesn't support bulk update natively — batch in chunks
  const CHUNK = 50
  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK)
    await Promise.all(
      chunk.map(({ id, priority_score }) =>
        supabase.from('tasks').update({ priority_score }).eq('id', id)
      )
    )
  }
}

export async function getTaskBySourceItem(
  source: string,
  externalId: string
): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('source', source)
    .eq('source_item_id', externalId)
    .neq('status', 'archived')
    .maybeSingle()

  if (error) throw new Error(`getTaskBySourceItem: ${error.message}`)
  return data as Task | null
}

export async function getTasksByCompletedToday(): Promise<Task[]> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'done')
    .gte('completed_at', startOfDay.toISOString())
    .order('completed_at', { ascending: false })

  if (error) throw new Error(`getTasksByCompletedToday: ${error.message}`)
  return (data ?? []) as Task[]
}

export async function resetNotTodayFlags(): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ manual_priority: null })
    .eq('manual_priority', 'not_today')

  if (error) throw new Error(`resetNotTodayFlags: ${error.message}`)
}
