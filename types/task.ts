export type TaskStatus = 'open' | 'in_progress' | 'done' | 'deferred' | 'archived'
export type TaskSource = 'manual' | 'gmail' | 'slack' | 'monday' | 'notion' | 'calendar'
export type ManualPriority = 'P1' | 'P2' | 'P3' | 'pinned' | 'not_today'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority_score: number
  manual_priority?: ManualPriority
  due_date?: string
  source: TaskSource
  source_item_id?: string
  source_url?: string
  confidence: number
  notion_page_id?: string
  monday_item_id?: string
  slack_thread_ts?: string
  gmail_thread_id?: string
  created_at: string
  updated_at: string
  completed_at?: string
  deferred_until?: string
  user_edited: boolean
  tags: string[]
  notes?: string
}

export interface TaskCreateInput {
  title: string
  description?: string
  due_date?: string
  source?: TaskSource
  source_item_id?: string
  source_url?: string
  confidence?: number
  notion_page_id?: string
  monday_item_id?: string
  slack_thread_ts?: string
  gmail_thread_id?: string
  tags?: string[]
  notes?: string
}

export interface TaskUpdateInput {
  title?: string
  description?: string
  status?: TaskStatus
  manual_priority?: ManualPriority | null
  due_date?: string | null
  deferred_until?: string | null
  notes?: string
  tags?: string[]
  confidence?: number
  user_edited?: boolean
  notion_page_id?: string
  monday_item_id?: string
  priority_score?: number
  completed_at?: string | null
}
