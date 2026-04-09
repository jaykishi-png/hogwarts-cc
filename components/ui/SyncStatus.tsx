'use client'

import { RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import type { SyncLogEntry } from '@/types/sync'

interface Props {
  isSyncing: boolean
  onSync: () => void
  lastSyncLogs?: Record<string, SyncLogEntry>
}

const SOURCES = ['calendar', 'gmail', 'slack', 'monday', 'notion'] as const

function statusDot(log?: SyncLogEntry): string {
  if (!log) return 'bg-gray-600'
  if (log.status === 'success') return 'bg-green-500'
  if (log.status === 'partial') return 'bg-yellow-400'
  if (log.status === 'failed') return 'bg-red-500'
  if (log.status === 'running') return 'bg-blue-400 animate-pulse'
  return 'bg-gray-600'
}

function lastSyncTime(logs?: Record<string, SyncLogEntry>): string {
  if (!logs) return 'Never synced'
  const times = Object.values(logs)
    .filter(l => l.completed_at)
    .map(l => new Date(l.completed_at!).getTime())
  if (times.length === 0) return 'Never synced'
  const latest = Math.max(...times)
  return `Synced ${formatDistanceToNow(new Date(latest), { addSuffix: true })}`
}

export function SyncStatus({ isSyncing, onSync, lastSyncLogs }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        {SOURCES.map(source => (
          <div key={source} className="flex items-center gap-1" title={`${source}: ${lastSyncLogs?.[source]?.status ?? 'not synced'}`}>
            <div className={clsx('w-2 h-2 rounded-full', statusDot(lastSyncLogs?.[source]))} />
            <span className="text-[10px] text-gray-500 capitalize hidden sm:inline">{source}</span>
          </div>
        ))}
      </div>

      <span className="text-xs text-gray-500 hidden md:inline">
        {lastSyncTime(lastSyncLogs)}
      </span>

      <button
        onClick={onSync}
        disabled={isSyncing}
        className={clsx(
          'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-medium',
          isSyncing
            ? 'border-blue-800 text-blue-400 cursor-not-allowed bg-blue-900/20'
            : 'border-[#2a2d3a] text-gray-400 hover:border-gray-500 hover:text-gray-200 bg-[#1e2130]'
        )}
      >
        <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
        {isSyncing ? 'Syncing...' : 'Refresh'}
      </button>
    </div>
  )
}
