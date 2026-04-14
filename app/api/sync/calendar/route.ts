import { NextRequest, NextResponse } from 'next/server'
import { fetchTodayEventsRaw } from '@/lib/integrations/google-calendar'
import { upsertSourceItem } from '@/lib/db/source-items'
import { startSyncLog, completeSyncLog } from '@/lib/db/sync-log'
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache/panel-cache'

const CACHE_KEY = 'sync:calendar'

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

// GET — returns today's events (used by useCalendar hook)
export async function GET(_req: NextRequest) {
  const cached = cacheGet<{ events: unknown[]; error?: string }>(CACHE_KEY)
  if (cached) {
    return NextResponse.json({ ...cached, cached: true, cachedAt: Date.now() })
  }

  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  if (!refreshToken) {
    return NextResponse.json({ events: [], error: 'Google Calendar not configured' })
  }
  const accessToken = await getAccessToken()
  if (!accessToken) {
    return NextResponse.json({ events: [], error: 'Failed to refresh Google access token' })
  }
  const { events, error } = await fetchTodayEventsRaw(accessToken, refreshToken)
  const result = { events, error }
  if (!error) cacheSet(CACHE_KEY, result, CACHE_TTL.CALENDAR)
  return NextResponse.json(result)
}

// POST — sync calendar events as source items (for prep task detection)
export async function POST(_req: NextRequest) {
  const logId = await startSyncLog('calendar')
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  if (!refreshToken) {
    await completeSyncLog(logId, { status: 'failed', itemsFound: 0, tasksCreated: 0, tasksUpdated: 0, errorDetail: 'GOOGLE_REFRESH_TOKEN not set' })
    return NextResponse.json({ error: 'Google Calendar not configured' }, { status: 503 })
  }
  const accessToken = await getAccessToken()
  if (!accessToken) {
    await completeSyncLog(logId, { status: 'failed', itemsFound: 0, tasksCreated: 0, tasksUpdated: 0, errorDetail: 'Token refresh failed' })
    return NextResponse.json({ error: 'Failed to refresh Google access token' }, { status: 503 })
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
