import type { FullSyncResult, SyncResult } from '@/types/sync'
import { listTasks, bulkUpdatePriorityScores } from '@/lib/db/tasks'
import { scoreAllTasks } from '@/lib/intelligence/scorer'
import type { CalendarEvent } from '@/types/source'
import { supabase } from '@/lib/db/client'

const SYNC_SOURCES = ['calendar', 'monday', 'notion', 'gmail', 'slack'] as const
type SyncSource = typeof SYNC_SOURCES[number]

async function callSyncRoute(source: SyncSource, baseUrl: string): Promise<SyncResult> {
  const start = Date.now()
  try {
    const res = await fetch(`${baseUrl}/api/sync/${source}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Allow up to 30s per source
      signal: AbortSignal.timeout(30_000),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return {
        source,
        status: 'failed',
        itemsFound: 0,
        tasksCreated: 0,
        tasksUpdated: 0,
        error: (body as { error?: string }).error ?? `HTTP ${res.status}`,
      }
    }

    const data = await res.json() as {
      itemsFound?: number
      tasksCreated?: number
      tasksUpdated?: number
    }

    return {
      source,
      status: 'success',
      itemsFound: data.itemsFound ?? 0,
      tasksCreated: data.tasksCreated ?? 0,
      tasksUpdated: data.tasksUpdated ?? 0,
    }
  } catch (err) {
    return {
      source,
      status: 'failed',
      itemsFound: 0,
      tasksCreated: 0,
      tasksUpdated: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function getCalendarEvents(): Promise<CalendarEvent[]> {
  // Pull from source_items cache (populated by calendar sync)
  const { data } = await supabase
    .from('source_items')
    .select('raw_data')
    .eq('source', 'calendar')
    .gte('fetched_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // last 2h

  return (data ?? []).map(row => row.raw_data as CalendarEvent)
}

async function runPriorityScoring(): Promise<void> {
  const tasks = await listTasks({ excludeStatuses: ['done', 'archived'] })
  const calendarEvents = await getCalendarEvents()

  const scores = scoreAllTasks(tasks, calendarEvents)
  if (scores.length > 0) {
    await bulkUpdatePriorityScores(scores)
  }
}

export async function runFullSync(baseUrl: string): Promise<FullSyncResult> {
  const startedAt = new Date().toISOString()

  // Run all sources in parallel, tolerate individual failures
  const settled = await Promise.allSettled(
    SYNC_SOURCES.map(source => callSyncRoute(source, baseUrl))
  )

  const results: SyncResult[] = settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value
    return {
      source: SYNC_SOURCES[i],
      status: 'failed' as const,
      itemsFound: 0,
      tasksCreated: 0,
      tasksUpdated: 0,
      error: s.reason instanceof Error ? s.reason.message : String(s.reason),
    }
  })

  // After all sources synced, re-score all tasks
  try {
    await runPriorityScoring()
  } catch (err) {
    console.error('Priority scoring failed:', err)
  }

  const completedAt = new Date().toISOString()

  return {
    results,
    startedAt,
    completedAt,
    totalCreated: results.reduce((sum, r) => sum + r.tasksCreated, 0),
    totalUpdated: results.reduce((sum, r) => sum + r.tasksUpdated, 0),
  }
}
