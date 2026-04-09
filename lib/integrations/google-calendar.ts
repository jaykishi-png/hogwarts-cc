import { google } from 'googleapis'
import type { CalendarEvent } from '@/types/source'

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

export async function fetchTodayEvents(
  accessToken: string,
  refreshToken?: string
): Promise<CalendarEvent[]> {
  const auth = getOAuthClient()
  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  const calendar = google.calendar({ version: 'v3', auth })

  // Today midnight → tomorrow midnight (local time via UTC offset)
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2)

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
  })

  const items = res.data.items ?? []

  return items.map(event => {
    const isAllDay = !event.start?.dateTime
    return {
      id: event.id ?? '',
      title: event.summary ?? '(No title)',
      start: event.start?.dateTime ?? event.start?.date ?? '',
      end: event.end?.dateTime ?? event.end?.date ?? '',
      attendees: (event.attendees ?? [])
        .map(a => a.displayName ?? a.email ?? '')
        .filter(Boolean),
      description: event.description ?? undefined,
      location: event.location ?? undefined,
      isAllDay,
    }
  })
}

export async function fetchTodayEventsRaw(
  accessToken: string,
  refreshToken?: string
): Promise<{ events: CalendarEvent[]; error?: string }> {
  try {
    const events = await fetchTodayEvents(accessToken, refreshToken)
    return { events }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('fetchTodayEventsRaw:', message)
    return { events: [], error: message }
  }
}
