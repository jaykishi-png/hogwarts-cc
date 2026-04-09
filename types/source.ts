export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  attendees: string[]
  description?: string
  location?: string
  isAllDay: boolean
}

export interface GmailMessage {
  threadId: string
  messageId: string
  subject: string
  from: string
  to: string[]
  snippet: string
  body?: string
  receivedAt: string
  isUnread: boolean
  isStarred: boolean
  labels: string[]
}

export interface SlackMessage {
  ts: string
  channel: string
  channelName?: string
  userId: string
  userName?: string
  text: string
  threadTs?: string
  isDirectMessage: boolean
  isMention: boolean
  permalink?: string
}

export interface MondayItem {
  id: string
  name: string
  status: string
  dueDate?: string
  boardId: string
  boardName: string
  groupName?: string
  url: string
  lastUpdated: string
  needsReview?: boolean
  isSubitem?: boolean
}

export interface NotionTask {
  pageId: string
  title: string
  status: string
  dueDate?: string
  priority?: string
  url: string
  createdAt: string
  lastEdited: string
}

export interface ExtractionResult {
  isAction: boolean
  task: string
  confidence: number
  context?: string
  method: 'rule' | 'claude'
}

export interface SourceItem {
  id: string
  source: string
  external_id: string
  raw_data: Record<string, unknown>
  fetched_at: string
  task_id?: string
  reviewed: boolean
}
