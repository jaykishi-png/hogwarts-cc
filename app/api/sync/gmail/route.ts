import { NextRequest, NextResponse } from 'next/server'
import { fetchUnreadMessages, fetchUnrepliedThreads } from '@/lib/integrations/gmail'
import { getTaskBySourceItem, createTask, updateTask } from '@/lib/db/tasks'
import { upsertSourceItem, getSourceItem, linkSourceItemToTask } from '@/lib/db/source-items'
import { startSyncLog, completeSyncLog } from '@/lib/db/sync-log'
import { getConfig } from '@/lib/db/config'
import { detectActionItem } from '@/lib/intelligence/rules'
import { extractIfNeeded } from '@/lib/intelligence/extractor'

async function getAccessToken(): Promise<string | null> {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  if (!refreshToken) return null
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json() as { access_token?: string }
  return data.access_token ?? null
}

export async function POST(_req: NextRequest) {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  if (!refreshToken) {
    return NextResponse.json({ error: 'Google credentials not configured' }, { status: 503 })
  }

  const accessToken = await getAccessToken()
  if (!accessToken) {
    return NextResponse.json({ error: 'Failed to refresh Google access token' }, { status: 503 })
  }

  const logId = await startSyncLog('gmail')
  let tasksCreated = 0
  let tasksUpdated = 0

  try {
    const lookbackHours = (await getConfig('email_lookback_hours') as number) ?? 48
    const confidenceThreshold = (await getConfig('confidence_threshold') as number) ?? 0.65
    const followUpHours = (await getConfig('follow_up_threshold_hours') as number) ?? 24

    const [unreadMessages, unrepliedThreads] = await Promise.all([
      fetchUnreadMessages(accessToken, refreshToken, lookbackHours),
      fetchUnrepliedThreads(accessToken, refreshToken, followUpHours),
    ])

    const allMessages = [...unreadMessages, ...unrepliedThreads]

    for (const msg of allMessages) {
      const externalId = msg.threadId || msg.messageId

      // Check if already reviewed
      const existing = await getSourceItem('gmail', externalId)
      if (existing?.reviewed) continue

      await upsertSourceItem('gmail', externalId, msg as unknown as Record<string, unknown>)

      // Check for existing task
      const existingTask = await getTaskBySourceItem('gmail', externalId)
      if (existingTask) {
        // Thread updated — refresh description
        await updateTask(existingTask.id, {
          description: msg.snippet,
        })
        tasksUpdated++
        continue
      }

      // Run rule-based detection
      const ruleResult = detectActionItem(msg.subject, msg.body ?? msg.snippet)

      // Run Claude extraction if needed
      const finalResult = await extractIfNeeded(
        `Subject: ${msg.subject}\n${msg.body ?? msg.snippet}`,
        ruleResult,
        'gmail',
        confidenceThreshold
      )

      if (!finalResult.isAction || finalResult.confidence < 0.25) continue

      const task = await createTask({
        title: finalResult.task || msg.subject,
        description: msg.snippet,
        source: 'gmail',
        source_item_id: externalId,
        source_url: `https://mail.google.com/mail/u/0/#inbox/${msg.threadId}`,
        gmail_thread_id: msg.threadId,
        confidence: finalResult.confidence,
        tags: ['email'],
      })

      await linkSourceItemToTask('gmail', externalId, task.id)
      tasksCreated++
    }

    await completeSyncLog(logId, {
      status: 'success',
      itemsFound: allMessages.length,
      tasksCreated,
      tasksUpdated,
    })

    return NextResponse.json({ itemsFound: allMessages.length, tasksCreated, tasksUpdated })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Gmail sync error:', message)
    await completeSyncLog(logId, {
      status: 'failed',
      itemsFound: 0,
      tasksCreated,
      tasksUpdated,
      errorDetail: message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
