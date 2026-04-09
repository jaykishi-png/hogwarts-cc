import { NextRequest, NextResponse } from 'next/server'
import { fetchMentionsAndDMs } from '@/lib/integrations/slack'
import { getTaskBySourceItem, createTask, updateTask } from '@/lib/db/tasks'
import { upsertSourceItem, getSourceItem, linkSourceItemToTask } from '@/lib/db/source-items'
import { startSyncLog, completeSyncLog } from '@/lib/db/sync-log'
import { getConfig } from '@/lib/db/config'
import { detectSlackActionItem } from '@/lib/intelligence/rules'
import { extractIfNeeded } from '@/lib/intelligence/extractor'

export async function POST(_req: NextRequest) {
  if (!process.env.SLACK_BOT_TOKEN) {
    return NextResponse.json({ error: 'SLACK_BOT_TOKEN not configured' }, { status: 503 })
  }

  const logId = await startSyncLog('slack')
  let tasksCreated = 0
  let tasksUpdated = 0

  try {
    const lookbackHours = (await getConfig('slack_lookback_hours') as number) ?? 24
    const confidenceThreshold = (await getConfig('confidence_threshold') as number) ?? 0.65

    const messages = await fetchMentionsAndDMs(lookbackHours)

    for (const msg of messages) {
      const externalId = msg.ts

      const existingSourceItem = await getSourceItem('slack', externalId)
      if (existingSourceItem?.reviewed) continue

      await upsertSourceItem('slack', externalId, msg as unknown as Record<string, unknown>)

      const existingTask = await getTaskBySourceItem('slack', externalId)
      if (existingTask) {
        await updateTask(existingTask.id, { description: msg.text.slice(0, 500) })
        tasksUpdated++
        continue
      }

      const ruleResult = detectSlackActionItem(msg.text, msg.isMention)
      const finalResult = await extractIfNeeded(msg.text, ruleResult, 'slack', confidenceThreshold)

      if (!finalResult.isAction || finalResult.confidence < 0.25) continue

      // Build a clean title
      const title = finalResult.task.length > 20
        ? finalResult.task.slice(0, 120)
        : `Slack: ${msg.channelName ? `#${msg.channelName}` : 'DM'} — ${msg.text.slice(0, 80)}`

      const task = await createTask({
        title,
        description: msg.text.slice(0, 500),
        source: 'slack',
        source_item_id: externalId,
        source_url: msg.permalink,
        slack_thread_ts: msg.ts,
        confidence: finalResult.confidence,
        tags: ['slack', msg.isDirectMessage ? 'dm' : 'mention'],
      })

      await linkSourceItemToTask('slack', externalId, task.id)
      tasksCreated++
    }

    await completeSyncLog(logId, {
      status: 'success',
      itemsFound: messages.length,
      tasksCreated,
      tasksUpdated,
    })

    return NextResponse.json({ itemsFound: messages.length, tasksCreated, tasksUpdated })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Slack sync error:', message)
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
