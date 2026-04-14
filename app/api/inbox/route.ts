import { NextResponse } from 'next/server'
import { fetchMentionsAndDMs } from '@/lib/integrations/slack'
import { fetchAssignedItems } from '@/lib/integrations/monday'

export const dynamic = 'force-dynamic'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InboxItem {
  id: string
  source: 'gmail' | 'slack' | 'monday'
  type: 'email' | 'mention' | 'dm' | 'task_overdue' | 'task_blocked' | 'task_due_soon' | 'needs_review'
  title: string
  from?: string
  body?: string
  url?: string
  priority: 'high' | 'medium' | 'low'
  timestamp: string
  read: boolean
  agentSuggestion?: string
}

interface InboxResponse {
  items: InboxItem[]
  counts: { gmail: number; slack: number; monday: number; total: number }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ])
}

const URGENT_PATTERN = /urgent|asap|action required|deadline/i

// ─── Gmail ────────────────────────────────────────────────────────────────────

async function fetchGmailItems(): Promise<InboxItem[]> {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  if (!refreshToken) return []

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })
  const tokenData = (await tokenRes.json()) as { access_token?: string }
  const accessToken = tokenData.access_token
  if (!accessToken) return []

  const searchRes = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=15',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const searchData = (await searchRes.json()) as { messages?: { id: string }[] }
  const messages = searchData.messages ?? []
  if (messages.length === 0) return []

  const items: InboxItem[] = []

  await Promise.allSettled(
    messages.slice(0, 15).map(async msg => {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}` +
            '?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        const msgData = (await msgRes.json()) as {
          id?: string
          internalDate?: string
          snippet?: string
          payload?: { headers?: { name: string; value: string }[] }
        }
        const headers = msgData.payload?.headers ?? []
        const get = (name: string) => headers.find(h => h.name === name)?.value ?? ''

        const subject = get('Subject') || '(no subject)'
        const from    = get('From')

        const isUrgent = URGENT_PATTERN.test(subject)

        items.push({
          id: `gmail-${msg.id}`,
          source: 'gmail',
          type: 'email',
          title: subject,
          from,
          body: msgData.snippet ? msgData.snippet.slice(0, 200) : undefined,
          url: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
          priority: isUrgent ? 'high' : 'medium',
          timestamp: msgData.internalDate
            ? new Date(parseInt(msgData.internalDate)).toISOString()
            : new Date().toISOString(),
          read: false,
          agentSuggestion: 'DUMBLEDORE',
        })
      } catch {
        // skip individual message failures
      }
    })
  )

  return items
}

// ─── Slack ────────────────────────────────────────────────────────────────────

async function fetchSlackItems(): Promise<InboxItem[]> {
  const messages = await fetchMentionsAndDMs(48)
  return messages.map(msg => {
    const isDM = msg.isDirectMessage
    return {
      id: `slack-${msg.ts}`,
      source: 'slack' as const,
      type: isDM ? ('dm' as const) : ('mention' as const),
      title: msg.text.slice(0, 120) || '(empty message)',
      from: msg.userName ?? msg.userId ?? 'Unknown',
      body: msg.text.slice(0, 200),
      url: msg.permalink,
      priority: isDM ? ('high' as const) : ('medium' as const),
      timestamp: msg.ts
        ? new Date(parseFloat(msg.ts) * 1000).toISOString()
        : new Date().toISOString(),
      read: false,
      agentSuggestion: isDM ? 'HAGRID' : 'DUMBLEDORE',
    }
  })
}

// ─── Monday ───────────────────────────────────────────────────────────────────

async function fetchMondayItems(): Promise<InboxItem[]> {
  const apiToken = process.env.MONDAY_API_TOKEN
  if (!apiToken) return []

  const mondayItems = await fetchAssignedItems(apiToken)
  const now = Date.now()
  const items: InboxItem[] = []

  for (const item of mondayItems) {
    const statusLower = (item.status ?? '').toLowerCase()
    const isBlocked =
      statusLower.includes('blocked') ||
      statusLower.includes('stuck') ||
      statusLower.includes('waiting')
    const isNeedsReview = item.needsReview === true

    // Determine overdue
    let isOverdue = false
    if (item.dueDate) {
      const due = new Date(item.dueDate).getTime()
      if (!isNaN(due) && due < now) isOverdue = true
    }

    // Only surface relevant items (spec: overdue, blocked, needs_review)
    if (!isBlocked && !isNeedsReview && !isOverdue) continue

    let type: InboxItem['type'] = 'needs_review'
    let priority: InboxItem['priority'] = 'medium'
    let agentSuggestion = 'HARRY'

    if (isOverdue) {
      type = 'task_overdue'
      priority = 'high'
      agentSuggestion = 'HERMIONE'
    } else if (isBlocked) {
      type = 'task_blocked'
      priority = 'high'
      agentSuggestion = 'HERMIONE'
    } else if (isNeedsReview) {
      type = 'needs_review'
      priority = 'medium'
      agentSuggestion = 'HARRY'
    }

    items.push({
      id: `monday-${item.id}`,
      source: 'monday',
      type,
      title: item.name,
      from: item.boardName,
      body: [
        item.groupName ? `Group: ${item.groupName}` : null,
        `Status: ${item.status}`,
        item.dueDate ? `Due: ${item.dueDate}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
        .slice(0, 200),
      url: item.url,
      priority,
      timestamp: item.lastUpdated ?? new Date().toISOString(),
      read: false,
      agentSuggestion,
    })
  }

  return items
}

// ─── GET /api/inbox ───────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const TIMEOUT_MS = 5_000

  const [gmailResult, slackResult, mondayResult] = await Promise.all([
    withTimeout(fetchGmailItems(), TIMEOUT_MS, []).catch(() => [] as InboxItem[]),
    withTimeout(fetchSlackItems(), TIMEOUT_MS, []).catch(() => [] as InboxItem[]),
    withTimeout(fetchMondayItems(), TIMEOUT_MS, []).catch(() => [] as InboxItem[]),
  ])

  const gmailItems  = gmailResult  ?? []
  const slackItems  = slackResult  ?? []
  const mondayItems = mondayResult ?? []

  // Sort: high priority first, then by timestamp descending
  const priorityOrder: Record<InboxItem['priority'], number> = { high: 0, medium: 1, low: 2 }
  const allItems = [...gmailItems, ...slackItems, ...mondayItems].sort((a, b) => {
    const pd = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (pd !== 0) return pd
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })

  const response: InboxResponse = {
    items: allItems,
    counts: {
      gmail:  gmailItems.length,
      slack:  slackItems.length,
      monday: mondayItems.length,
      total:  allItems.length,
    },
  }

  return NextResponse.json(response)
}
