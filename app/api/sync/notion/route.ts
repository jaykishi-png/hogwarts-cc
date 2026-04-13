import { NextRequest, NextResponse } from 'next/server'
import { fetchNotionTasks, createNotionTask } from '@/lib/integrations/notion'
import { listTasks, getTaskBySourceItem, createTask, updateTask } from '@/lib/db/tasks'
import { upsertSourceItem, linkSourceItemToTask } from '@/lib/db/source-items'
import { startSyncLog, completeSyncLog } from '@/lib/db/sync-log'
import { getConfig } from '@/lib/db/config'

export async function POST(_req: NextRequest) {
  if (!process.env.NOTION_TOKEN) {
    return NextResponse.json({ error: 'NOTION_TOKEN not configured' }, { status: 503 })
  }

  const databaseId = (await getConfig('notion_database_id')) as string
  if (!databaseId) {
    return NextResponse.json({ error: 'notion_database_id not configured' }, { status: 503 })
  }

  const logId = await startSyncLog('notion')
  let tasksCreated = 0
  let tasksUpdated = 0

  try {
    const notionTasks = await fetchNotionTasks(databaseId)

    // ── Inbound: Notion → local DB ───────────────────────────────────────────
    for (const nt of notionTasks) {
      // Skip EOD / template pages — these are reports, not tasks
      const titleLower = nt.title.toLowerCase()
      if (titleLower.includes('eod report')) continue
      if (titleLower.includes('eod template')) continue
      if (titleLower.includes('daily eod')) continue

      // Skip pages with "Sent" status
      const doneStatuses = ['done', 'complete', 'completed', 'finished', 'sent']
      if (doneStatuses.some(s => nt.status.toLowerCase().includes(s))) {
        // If already in DB, mark as done
        const existing = await getTaskBySourceItem('notion', nt.pageId)
        if (existing && existing.status !== 'done') {
          await updateTask(existing.id, { status: 'done', completed_at: new Date().toISOString() })
          tasksUpdated++
        }
        continue
      }

      await upsertSourceItem('notion', nt.pageId, nt as unknown as Record<string, unknown>)

      const existing = await getTaskBySourceItem('notion', nt.pageId)

      if (existing) {
        // Update due date and status from Notion (but not title if user has edited)
        const updates: Record<string, unknown> = {}

        if (!existing.user_edited) {
          updates.title = nt.title
        }
        if (nt.dueDate) {
          updates.due_date = new Date(nt.dueDate).toISOString()
        }

        // Reflect Notion "Done" status locally
        const doneStatusList = ['done', 'complete', 'completed', 'finished', 'sent']
        if (doneStatusList.some(s => nt.status.toLowerCase().includes(s)) && existing.status !== 'done') {
          updates.status = 'done'
          updates.completed_at = new Date().toISOString()
        }

        if (Object.keys(updates).length > 0) {
          await updateTask(existing.id, updates)
          tasksUpdated++
        }
      } else {
        // Create new local task from Notion
        const task = await createTask({
          title: nt.title,
          due_date: nt.dueDate ? new Date(nt.dueDate).toISOString() : undefined,
          source: 'notion',
          source_item_id: nt.pageId,
          source_url: nt.url,
          notion_page_id: nt.pageId,
          confidence: 1.0,
        })
        await linkSourceItemToTask('notion', nt.pageId, task.id)
        tasksCreated++
      }
    }

    // ── Outbound: manual tasks without notion_page_id → push to Notion ───────
    const manualTasks = await listTasks({ source: 'manual', status: 'open' })
    const unpushed = manualTasks.filter(t => !t.notion_page_id)

    for (const task of unpushed) {
      try {
        const pageId = await createNotionTask(
          databaseId,
          task.title,
          task.due_date ?? undefined
        )
        await updateTask(task.id, { notion_page_id: pageId })
      } catch (err) {
        // Non-fatal: log and continue
        console.warn('Failed to push task to Notion:', task.title, err)
      }
    }

    await completeSyncLog(logId, {
      status: 'success',
      itemsFound: notionTasks.length,
      tasksCreated,
      tasksUpdated,
    })

    return NextResponse.json({
      itemsFound: notionTasks.length,
      tasksCreated,
      tasksUpdated,
      pushedToNotion: unpushed.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Notion sync error:', message)
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
