import { supabase } from './client'
import type { SyncLogEntry } from '@/types/sync'

export async function startSyncLog(source: string): Promise<string> {
  const { data, error } = await supabase
    .from('sync_log')
    .insert({ source, status: 'running' })
    .select('id')
    .single()

  if (error) throw new Error(`startSyncLog: ${error.message}`)
  return data.id
}

export async function completeSyncLog(
  id: string,
  result: {
    status: 'success' | 'partial' | 'failed'
    itemsFound: number
    tasksCreated: number
    tasksUpdated: number
    errorDetail?: string
  }
): Promise<void> {
  const { error } = await supabase
    .from('sync_log')
    .update({
      status: result.status,
      completed_at: new Date().toISOString(),
      items_found: result.itemsFound,
      tasks_created: result.tasksCreated,
      tasks_updated: result.tasksUpdated,
      error_detail: result.errorDetail ?? null,
    })
    .eq('id', id)

  if (error) throw new Error(`completeSyncLog: ${error.message}`)
}

export async function getRecentSyncLogs(limit = 20): Promise<SyncLogEntry[]> {
  const { data, error } = await supabase
    .from('sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`getRecentSyncLogs: ${error.message}`)
  return (data ?? []) as SyncLogEntry[]
}

export async function getLastSyncPerSource(): Promise<Record<string, SyncLogEntry>> {
  const { data, error } = await supabase
    .from('sync_log')
    .select('*')
    .in('status', ['success', 'partial', 'failed'])
    .order('started_at', { ascending: false })

  if (error) throw new Error(`getLastSyncPerSource: ${error.message}`)

  const result: Record<string, SyncLogEntry> = {}
  for (const entry of (data ?? []) as SyncLogEntry[]) {
    if (!result[entry.source]) {
      result[entry.source] = entry
    }
  }
  return result
}
