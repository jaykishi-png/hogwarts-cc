export type SyncStatus = 'running' | 'success' | 'partial' | 'failed' | 'idle'

export interface SyncResult {
  source: string
  status: SyncStatus
  itemsFound: number
  tasksCreated: number
  tasksUpdated: number
  error?: string
}

export interface FullSyncResult {
  results: SyncResult[]
  startedAt: string
  completedAt: string
  totalCreated: number
  totalUpdated: number
}

export interface SyncLogEntry {
  id: string
  source: string
  started_at: string
  completed_at?: string
  status: SyncStatus
  items_found: number
  tasks_created: number
  tasks_updated: number
  error_detail?: string
}
