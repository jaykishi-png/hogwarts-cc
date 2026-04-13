import { Client } from '@notionhq/client'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import type { NotionTask } from '@/types/source'

function getClient() {
  const raw = process.env.NOTION_TOKEN ?? ''
  // Strip all control characters (newlines, carriage returns, etc.)
  const token = Array.from(raw).filter(c => c.charCodeAt(0) >= 32).join('')
  if (!token) throw new Error('NOTION_TOKEN not set')
  return new Client({ auth: token })
}

// Maps Notion status property to our internal status string
function parseNotionStatus(statusValue: unknown): string {
  if (!statusValue || typeof statusValue !== 'object') return 'open'
  const val = statusValue as Record<string, unknown>

  // Handle select type
  if (val.type === 'select' && val.select) {
    const select = val.select as { name?: string }
    return select.name?.toLowerCase() ?? 'open'
  }
  // Handle status type (native Notion status)
  if (val.type === 'status' && val.status) {
    const status = val.status as { name?: string }
    return status.name?.toLowerCase() ?? 'open'
  }
  return 'open'
}

function parseNotionDate(dateValue: unknown): string | undefined {
  if (!dateValue || typeof dateValue !== 'object') return undefined
  const val = dateValue as Record<string, unknown>
  if (val.type === 'date' && val.date) {
    const date = val.date as { start?: string }
    return date.start ?? undefined
  }
  return undefined
}

function parseNotionTitle(titleValue: unknown): string {
  if (!titleValue || typeof titleValue !== 'object') return '(Untitled)'
  const val = titleValue as Record<string, unknown>
  if (val.type === 'title' && Array.isArray(val.title)) {
    return (val.title as Array<{ plain_text?: string }>)
      .map(t => t.plain_text ?? '')
      .join('') || '(Untitled)'
  }
  return '(Untitled)'
}

export async function fetchNotionTasks(databaseId: string): Promise<NotionTask[]> {
  const notion = getClient()

  const response = await notion.databases.query({
    database_id: databaseId,
    sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
    page_size: 100,
  })

  // Only statuses that represent active work
  const ACTIVE_STATUSES = ['in progress', 'in-progress', 'working on it', 'active']

  return response.results
    .filter((page): page is PageObjectResponse => 'properties' in page)
    .map(page => {
      const props = page.properties ?? {}

      // Try common property names for title, status, due date
      const titleProp = props['Name'] ?? props['Title'] ?? props['Task']
      const statusProp = props['Status'] ?? props['status']
      const dueDateProp = props['Due Date'] ?? props['Due'] ?? props['Date']
      const priorityProp = props['Priority'] ?? props['priority']

      return {
        pageId: page.id,
        title: parseNotionTitle(titleProp),
        status: parseNotionStatus(statusProp),
        dueDate: parseNotionDate(dueDateProp),
        priority: parseNotionStatus(priorityProp) || undefined,
        url: page.url,
        createdAt: page.created_time,
        lastEdited: page.last_edited_time,
      }
    })
    .filter(task => {
      const s = task.status.toLowerCase()
      // Skip EOD reports entirely
      if (task.title.toLowerCase().includes('eod report')) return false
      // Only include active tasks
      return ACTIVE_STATUSES.some(active => s.includes(active))
    })
}

export async function createNotionTask(
  databaseId: string,
  title: string,
  dueDate?: string
): Promise<string> {
  const notion = getClient()

  const properties: Record<string, unknown> = {
    Name: {
      title: [{ text: { content: title } }],
    },
    Status: {
      status: { name: 'In Progress' },
    },
  }

  if (dueDate) {
    properties['Due Date'] = {
      date: { start: dueDate.split('T')[0] },
    }
  }

  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: properties as Parameters<typeof notion.pages.create>[0]['properties'],
  })

  return page.id
}

export async function updateNotionTaskStatus(
  pageId: string,
  statusName: string
): Promise<void> {
  const notion = getClient()

  await notion.pages.update({
    page_id: pageId,
    properties: {
      Status: {
        status: { name: statusName },
      },
    } as Parameters<typeof notion.pages.update>[0]['properties'],
  })
}

export async function archiveNotionPage(pageId: string): Promise<void> {
  const notion = getClient()
  await notion.pages.update({
    page_id: pageId,
    archived: true,
  })
}
