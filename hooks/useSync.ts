'use client'

import { useState, useCallback } from 'react'
import type { FullSyncResult } from '@/types/sync'

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<FullSyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const triggerSync = useCallback(async (source?: string) => {
    setIsSyncing(true)
    setError(null)
    try {
      const url = source ? `/api/sync/${source}` : '/api/sync'
      const res = await fetch(url, { method: 'POST' })
      if (!res.ok) throw new Error(`Sync failed: ${res.statusText}`)
      const data: FullSyncResult = await res.json()
      setLastResult(data)
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown sync error'
      setError(msg)
      return null
    } finally {
      setIsSyncing(false)
    }
  }, [])

  return { isSyncing, lastResult, error, triggerSync }
}
