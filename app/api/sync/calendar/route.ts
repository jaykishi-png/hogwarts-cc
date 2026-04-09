import { NextRequest, NextResponse } from 'next/server'
import { fetchTodayEventsRaw } from '@/lib/integrations/google-calendar'
import { upsertSourceItem } from '@/lib/db/source-items'
import { startSyncLog, completeSyncLog } from '@/lib/db/sync-log'

// GET — returns today's events (used by useCalendar hook)
export async function GET(_req: NextRequest) {
  const accessToken = process.env.GOOGLE_ACCESS_TOKEN
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!accessToken) {
    return NextResponse.json({ events: [], error: 'Google Calendar not configured' })
  }

  const { events, error } = await fetchTodayEventsRaw(accessToken, refreshToken)
  return NextResponse.json({ events, error })
}

// POST — sync calendar events as source items (for prep task detection)
export async function POST(_req: NextRequest) {
  const logId = await startSyncLog('calendar')
  const accessToken = process.env.GOOGLE_ACCESS_TOKEN
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!accessToken) {
    await completeSyncLog(logId, {
      status: 'failed',
      itemsFound: 0,
      tasksCreated: 0,
      tasksUpdated: 0,
      errorDetail: 'GOOGLE_ACCESS_TOKEN not set',
    })
    return NextResponse.json({ error: 'Google Calendar not configured' }, { status: 503 })
  }

  try {
    const { events, error } = await fetchTodayEventsRaw(accessToken, refreshToken)

    if (error) {
      await completeSyncLog(logId, {
        status: 'failed',
        itemsFound: 0,
        tasksCreated: 0,
        tasksUpdated: 0,
        errorDetail: error,
      })
      return NextResponse.json({ error }, { status: 500 })
    }

    // Store events as source items for the orchestrator to use in scoring
    await Promise.all(
      events.map(event =>
        upsertSourceItem('calendar', event.id, event as unknown as Record<string, unknown>)
      )
    )

    await completeSyncLog(logId, {
      status: 'success',
      itemsFound: events.length,
      tasksCreated: 0,
      tasksUpdated: 0,
    })

    return NextResponse.json({ synced: events.length, events })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await completeSyncLog(logId, {
      status: 'failed',
      itemsFound: 0,
      tasksCreated: 0,
      tasksUpdated: 0,
      errorDetail: message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
