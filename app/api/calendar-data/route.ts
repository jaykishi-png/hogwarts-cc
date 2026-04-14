import { NextResponse } from 'next/server'
import { fetchAssignedItems } from '@/lib/integrations/monday'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CalendarEventBrand  = 'revenue-rush' | 'the-process' | 'both' | 'unknown'
export type CalendarEventType   = 'deadline' | 'publish' | 'review' | 'shoot' | 'other'
export type CalendarEventSource = 'monday' | 'notion'

export interface ContentCalendarEvent {
  id:     string
  title:  string
  date:   string                 // YYYY-MM-DD
  source: CalendarEventSource
  brand:  CalendarEventBrand
  status: string
  type:   CalendarEventType
  url?:   string
}

// ─── Brand / Type detection helpers ──────────────────────────────────────────

function detectBrand(text: string): CalendarEventBrand {
  const t = text.toLowerCase()
  const isRR = t.includes('revenue rush') || /\brr\b/.test(t)
  const isTP = t.includes('the process')  || /\btp\b/.test(t)

  if (isRR && isTP) return 'both'
  if (isRR) return 'revenue-rush'
  if (isTP) return 'the-process'
  return 'unknown'
}

function detectType(text: string, dateStr: string | undefined): CalendarEventType {
  const t = text.toLowerCase()

  if (t.includes('review'))                                return 'review'
  if (t.includes('publish') || t.includes('post') || t.includes('live')) return 'publish'
  if (t.includes('shoot') || t.includes('film') || t.includes('record')) return 'shoot'

  // If there's a due date in the past it's a deadline
  if (dateStr) {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime()) && d < new Date()) return 'deadline'
  }

  return 'other'
}

// ─── Monday fetch ─────────────────────────────────────────────────────────────

async function getMondayEvents(): Promise<ContentCalendarEvent[]> {
  const token = process.env.MONDAY_API_TOKEN
  if (!token) return []

  try {
    const items = await fetchAssignedItems(token)
    const now   = new Date()
    const in30  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const events: ContentCalendarEvent[] = []

    for (const item of items) {
      if (!item.dueDate) continue

      const due = new Date(item.dueDate)
      if (isNaN(due.getTime())) continue
      if (due < now || due > in30) continue

      const dateOnly = due.toISOString().slice(0, 10)
      const combined = `${item.name} ${item.boardName}`

      events.push({
        id:     `monday-${item.id}`,
        title:  item.name,
        date:   dateOnly,
        source: 'monday',
        brand:  detectBrand(combined),
        status: item.status,
        type:   detectType(combined, item.dueDate),
        url:    item.url,
      })
    }

    return events
  } catch (err) {
    console.error('[calendar-data] Monday fetch error:', err)
    return []
  }
}

// ─── Notion fetch ─────────────────────────────────────────────────────────────

interface NotionSearchResult {
  results: Array<{
    id: string
    object: string
    url?: string
    last_edited_time: string
    properties?: Record<string, unknown>
    title?: Array<{ plain_text?: string }>
  }>
}

function extractNotionTitle(page: NotionSearchResult['results'][number]): string {
  // For databases pages the title lives in properties
  if (page.properties) {
    const titleProp = Object.values(page.properties).find(
      (p): p is { title: Array<{ plain_text?: string }> } =>
        typeof p === 'object' && p !== null && 'title' in p && Array.isArray((p as Record<string, unknown>)['title'])
    )
    if (titleProp) {
      return titleProp.title.map(t => t.plain_text ?? '').join('').trim()
    }
  }
  // Fallback for workspace-level page objects
  if (Array.isArray(page.title)) {
    return (page.title as Array<{ plain_text?: string }>).map(t => t.plain_text ?? '').join('').trim()
  }
  return ''
}

async function getNotionEvents(): Promise<ContentCalendarEvent[]> {
  const token = process.env.NOTION_TOKEN
  if (!token) return []

  const keywords = ['content', 'calendar', 'schedule', 'post']
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const results = await Promise.all(
      keywords.map(kw =>
        fetch('https://api.notion.com/v1/search', {
          method: 'POST',
          headers: {
            'Authorization':  `Bearer ${token}`,
            'Content-Type':   'application/json',
            'Notion-Version': '2022-06-28',
          },
          body: JSON.stringify({
            query:  kw,
            filter: { value: 'page', property: 'object' },
            sort:   { direction: 'descending', timestamp: 'last_edited_time' },
          }),
        }).then(r => r.json() as Promise<NotionSearchResult>)
      )
    )

    // Deduplicate by ID
    const seen  = new Set<string>()
    const pages: NotionSearchResult['results'] = []

    for (const result of results) {
      for (const page of result.results ?? []) {
        if (seen.has(page.id)) continue
        // Filter to pages edited in last 7 days
        if (page.last_edited_time < sevenDaysAgo) continue
        seen.add(page.id)
        pages.push(page)
      }
    }

    const events: ContentCalendarEvent[] = pages.map(page => {
      const title     = extractNotionTitle(page)
      const dateOnly  = page.last_edited_time.slice(0, 10)

      return {
        id:     `notion-${page.id}`,
        title:  title || 'Untitled',
        date:   dateOnly,
        source: 'notion' as const,
        brand:  detectBrand(title),
        status: 'edited',
        type:   detectType(title, dateOnly),
        url:    page.url ?? undefined,
      }
    })

    return events
  } catch (err) {
    console.error('[calendar-data] Notion fetch error:', err)
    return []
  }
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const [mondayEvents, notionEvents] = await Promise.all([
      getMondayEvents(),
      getNotionEvents(),
    ])

    const events = [...mondayEvents, ...notionEvents].sort(
      (a, b) => a.date.localeCompare(b.date)
    )

    return NextResponse.json({ events })
  } catch (err: unknown) {
    console.error('[calendar-data] route error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
