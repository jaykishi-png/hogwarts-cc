import { NextRequest, NextResponse } from 'next/server'
import { fetchAssignedItems } from '@/lib/integrations/monday'
import { getTaskBySourceItem, createTask, updateTask } from '@/lib/db/tasks'
import { upsertSourceItem, linkSourceItemToTask } from '@/lib/db/source-items'
import { startSyncLog, completeSyncLog } from '@/lib/db/sync-log'
import { getConfig } from '@/lib/db/config'
import type { MondayItem } from '@/types/source'

export async function POST(_req: NextRequest) {
  const apiToken = process.env.MONDAY_API_TOKEN

  if (!apiToken) {
    return NextResponse.json({ error: 'MONDAY_API_TOKEN not configured' }, { status: 503 })
  }

  const logId = await startSyncLog('monday')
  let tasksCreated = 0
  let tasksUpdated = 0

  try {
    const boardIdsRaw = (await getConfig('monday_board_ids')) as number[] ?? []
    const items = await fetchAssignedItems(apiToken, boardIdsRaw)

    // Filter by due date window
    const daysAhead = (await getConfig('monday_due_days_ahead') as number) ?? 14
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + daysAhead)

    const relevantItems = items.filter(item => {
      if (!item.dueDate) return true // no due date — always include
      return new Date(item.dueDate) <= cutoff
    })

    for (const item of relevantItems) {
      // Upsert source item
      await upsertSourceItem('monday', item.id, item as unknown as Record<string, unknown>)

      // Check if task already exists
      const existing = await getTaskBySourceItem('monday', item.id)

      if (existing) {
        // Update status and due date (but not title if user_edited)
        const updates: Record<string, unknown> = {
          due_date: item.dueDate ? new Date(item.dueDate).toISOString() : null,
        }
        if (!existing.user_edited) {
          updates.title = item.name
          // Rebuild tags to reflect current status
          const statusTag = item.needsReview ? item.status : null
          updates.tags = [item.boardName, item.groupName, statusTag].filter(Boolean)
        }
        // If Monday marks done, reflect it
        const donePhrases = ['done', 'complete', 'closed']
        if (donePhrases.some(p => item.status.toLowerCase().includes(p))) {
          updates.status = 'done'
          updates.completed_at = new Date().toISOString()
        }
        await updateTask(existing.id, updates)
        tasksUpdated++
      } else {
        // Create new task
        const statusTag = item.needsReview ? item.status : null // "Needs Review" or "Needs Review JK"
        const task = await createTask({
          title: item.name,
          due_date: item.dueDate ? new Date(item.dueDate).toISOString() : undefined,
          source: 'monday',
          source_item_id: item.id,
          source_url: item.url,
          monday_item_id: item.id,
          confidence: 1.0,
          tags: [item.boardName, item.groupName, statusTag].filter(Boolean) as string[],
        })
        await linkSourceItemToTask('monday', item.id, task.id)
        tasksCreated++
      }
    }

    await completeSyncLog(logId, {
      status: 'success',
      itemsFound: items.length,
      tasksCreated,
      tasksUpdated,
    })

    return NextResponse.json({ itemsFound: items.length, tasksCreated, tasksUpdated })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Monday sync error:', message)
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
