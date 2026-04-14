import { NextResponse } from 'next/server'
import type { InboxItem } from '@/app/api/inbox/route'
import { fetchMentionsAndDMs } from '@/lib/integrations/slack'
import { fetchAssignedItems } from '@/lib/integrations/monday'

export const dynamic = 'force-dynamic'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Alert {
  id: string
  message: string
  source: 'gmail' | 'slack' | 'monday'
  count: number
  agentSuggestion: string
  action: string
}

interface AlertsResponse {
  alerts: Alert[]
  hasUrgent: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ])
}

const URGENT_PATTERN = /urgent|asap|action required|deadline/i

// ─── Re-implement fetch helpers inline to avoid bundling issues ───────────────
// (mirrors the logic in /api/inbox/route.ts)

async function fetchHighGmailItems(): Promise<InboxItem[]> {
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
      } catch { /* skip */ }
    })
  )

  return items
}

async function fetchHighSlackItems(): Promise<InboxItem[]> {
  const messages = await fetchMentionsAndDMs(48)
  return messages.map(msg => ({
    id: `slack-${msg.ts}`,
    source: 'slack' as const,
    type: msg.isDirectMessage ? ('dm' as const) : ('mention' as const),
    title: msg.text.slice(0, 120) || '(empty message)',
    from: msg.userName ?? msg.userId ?? 'Unknown',
    body: msg.text.slice(0, 200),
    url: msg.permalink,
    priority: msg.isDirectMessage ? ('high' as const) : ('medium' as const),
    timestamp: msg.ts
      ? new Date(parseFloat(msg.ts) * 1000).toISOString()
      : new Date().toISOString(),
    read: false,
    agentSuggestion: msg.isDirectMessage ? 'HAGRID' : 'DUMBLEDORE',
  }))
}

async function fetchHighMondayItems(): Promise<InboxItem[]> {
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

    let isOverdue = false
    if (item.dueDate) {
      const due = new Date(item.dueDate).getTime()
      if (!isNaN(due) && due < now) isOverdue = true
    }

    if (!isBlocked && !isNeedsReview && !isOverdue) continue

    let type: InboxItem['type'] = 'needs_review'
    let priority: InboxItem['priority'] = 'medium'
    let agentSuggestion = 'HARRY'

    if (isOverdue) { type = 'task_overdue'; priority = 'high'; agentSuggestion = 'HERMIONE' }
    else if (isBlocked) { type = 'task_blocked'; priority = 'high'; agentSuggestion = 'HERMIONE' }
    else if (isNeedsReview) { type = 'needs_review'; priority = 'medium'; agentSuggestion = 'HARRY' }

    items.push({
      id: `monday-${item.id}`,
      source: 'monday',
      type,
      title: item.name,
      from: item.boardName,
      body: `Status: ${item.status}${item.dueDate ? ` · Due: ${item.dueDate}` : ''}`.slice(0, 200),
      url: item.url,
      priority,
      timestamp: item.lastUpdated ?? new Date().toISOString(),
      read: false,
      agentSuggestion,
    })
  }

  return items
}

// ─── GET /api/alerts ──────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const TIMEOUT_MS = 5_000

  const [gmailItems, slackItems, mondayItems] = await Promise.all([
    withTimeout(fetchHighGmailItems(), TIMEOUT_MS, []).catch(() => [] as InboxItem[]),
    withTimeout(fetchHighSlackItems(), TIMEOUT_MS, []).catch(() => [] as InboxItem[]),
    withTimeout(fetchHighMondayItems(), TIMEOUT_MS, []).catch(() => [] as InboxItem[]),
  ])

  const alerts: Alert[] = []

  // ── Gmail alert ────────────────────────────────────────────────────────────
  if (gmailItems.length > 0) {
    const highCount = gmailItems.filter(i => i.priority === 'high').length
    const total     = gmailItems.length
    const urgentNote = highCount > 0 ? ` including ${highCount} marked urgent` : ''
    alerts.push({
      id: 'alert-gmail',
      message: `${total} unread email${total !== 1 ? 's' : ''}${urgentNote}`,
      source: 'gmail',
      count: total,
      agentSuggestion: 'DUMBLEDORE',
      action: `@DUMBLEDORE Summarise my ${total} unread emails and flag anything urgent.`,
    })
  }

  // ── Slack alert — only surface DMs (high priority) ─────────────────────────
  const highSlack = slackItems.filter(i => i.priority === 'high')
  const allSlack  = slackItems
  if (allSlack.length > 0) {
    const dmCount      = highSlack.length
    const mentionCount = allSlack.filter(i => i.type === 'mention').length
    const parts: string[] = []
    if (dmCount > 0) parts.push(`${dmCount} DM${dmCount !== 1 ? 's' : ''}`)
    if (mentionCount > 0) parts.push(`${mentionCount} mention${mentionCount !== 1 ? 's' : ''}`)
    alerts.push({
      id: 'alert-slack',
      message: `Slack: ${parts.join(' + ')}`,
      source: 'slack',
      count: allSlack.length,
      agentSuggestion: dmCount > 0 ? 'HAGRID' : 'DUMBLEDORE',
      action: dmCount > 0
        ? `@HAGRID I have ${dmCount} unread Slack DMs. Help me draft replies.`
        : `@DUMBLEDORE I have ${mentionCount} Slack mentions. What needs my attention?`,
    })
  }

  // ── Monday alert ───────────────────────────────────────────────────────────
  if (mondayItems.length > 0) {
    const overdueCount = mondayItems.filter(i => i.type === 'task_overdue').length
    const blockedCount = mondayItems.filter(i => i.type === 'task_blocked').length
    const reviewCount  = mondayItems.filter(i => i.type === 'needs_review').length
    const parts: string[] = []
    if (overdueCount > 0) parts.push(`${overdueCount} overdue`)
    if (blockedCount > 0) parts.push(`${blockedCount} blocked`)
    if (reviewCount > 0)  parts.push(`${reviewCount} need review`)
    alerts.push({
      id: 'alert-monday',
      message: `Monday.com: ${parts.join(', ')}`,
      source: 'monday',
      count: mondayItems.length,
      agentSuggestion: overdueCount > 0 || blockedCount > 0 ? 'HERMIONE' : 'HARRY',
      action:
        overdueCount > 0
          ? `@HERMIONE What tasks are overdue in Monday.com? Give me a priority plan.`
          : blockedCount > 0
          ? `@HERMIONE What's blocked in Monday.com and how do we unblock it?`
          : `@HARRY Review the ${reviewCount} items awaiting review in Monday.com.`,
    })
  }

  const hasUrgent = alerts.some(a => {
    const sourceItems =
      a.source === 'gmail'  ? gmailItems  :
      a.source === 'slack'  ? slackItems  : mondayItems
    return sourceItems.some(i => i.priority === 'high')
  })

  const response: AlertsResponse = { alerts: alerts.slice(0, 3), hasUrgent }
  return NextResponse.json(response)
}
