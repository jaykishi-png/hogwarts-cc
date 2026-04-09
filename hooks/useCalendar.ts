'use client'

import useSWR from 'swr'
import type { CalendarEvent } from '@/types/source'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useCalendar() {
  const { data, error, isLoading } = useSWR<{ events: CalendarEvent[] }>(
    '/api/sync/calendar',
    fetcher,
    { refreshInterval: 300_000 } // refresh every 5 min
  )

  return {
    events: data?.events ?? [],
    isLoading,
    error,
  }
}
