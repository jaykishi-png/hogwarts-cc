'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw,
  ExternalLink,
  Mail,
  MessageSquare,
  CheckSquare,
  Inbox,
} from 'lucide-react'
import type { InboxItem } from '@/app/api/inbox/route'

// ─── Types ────────────────────────────────────────────────────────────────────

type Filter = 'all' | 'gmail' | 'slack' | 'monday'

interface Counts {
  gmail: number
  slack: number
  monday: number
  total: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'hw-inbox-read'

const SOURCE_CONFIG = {
  gmail:  { label: 'Gmail',   icon: Mail,          color: 'text-red-400',   dot: 'bg-red-400',   border: 'border-l-red-500'    },
  slack:  { label: 'Slack',   icon: MessageSquare, color: 'text-purple-400',dot: 'bg-purple-400',border: 'border-l-purple-500'  },
  monday: { label: 'Monday',  icon: CheckSquare,   color: 'text-amber-400', dot: 'bg-amber-400', border: 'border-l-amber-500'  },
} as const

const PRIORITY_DOT: Record<InboxItem['priority'], string> = {
  high:   'bg-red-400',
  medium: 'bg-yellow-400',
  low:    'bg-gray-600',
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function loadReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]))
  } catch { /* ignore */ }
}

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  if (isNaN(diff)) return ''
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 border-l-2 border-l-[#1e2030] animate-pulse">
      <div className="w-3 h-3 rounded-full bg-[#2a2d3a] flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="h-2.5 bg-[#2a2d3a] rounded w-3/4" />
        <div className="h-2 bg-[#1e2030] rounded w-1/2" />
        <div className="h-2 bg-[#1e2030] rounded w-2/3" />
      </div>
    </div>
  )
}

// ─── InboxRow ─────────────────────────────────────────────────────────────────

interface InboxRowProps {
  item: InboxItem
  isRead: boolean
  onMarkRead: (id: string) => void
}

function InboxRow({ item, isRead, onMarkRead }: InboxRowProps) {
  const src = SOURCE_CONFIG[item.source]
  const Icon = src.icon

  return (
    <div
      onClick={() => onMarkRead(item.id)}
      className={`
        flex items-start gap-3 px-3 py-2.5 border-l-2 ${src.border}
        hover:bg-[#0a0c14] transition-colors cursor-pointer
        ${isRead ? 'opacity-50' : ''}
      `}
    >
      {/* Source icon */}
      <Icon size={12} className={`${src.color} flex-shrink-0 mt-0.5`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title row */}
        <div className="flex items-center gap-1.5">
          <span
            className={`
              text-[11px] leading-snug truncate
              ${isRead ? 'text-gray-600' : 'text-gray-200 font-semibold'}
            `}
          >
            {item.title}
          </span>
          {/* Priority dot */}
          <span
            className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[item.priority]}`}
            title={item.priority}
          />
        </div>

        {/* From */}
        {item.from && (
          <p className="text-[10px] text-gray-600 truncate mt-0.5">{item.from}</p>
        )}

        {/* Body preview */}
        {item.body && (
          <p className="text-[10px] text-gray-700 mt-0.5 line-clamp-1">
            {item.body.slice(0, 80)}
          </p>
        )}

        {/* Footer row */}
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[9px] font-semibold uppercase ${src.color}`}>
            {src.label}
          </span>
          <span className="text-[9px] text-gray-700">{relativeTime(item.timestamp)}</span>
          {item.agentSuggestion && (
            <span className="text-[9px] text-gray-600 font-mono">
              → {item.agentSuggestion}
            </span>
          )}
        </div>
      </div>

      {/* External link */}
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex-shrink-0 text-gray-700 hover:text-gray-400 transition-colors mt-0.5"
          title="Open in source"
        >
          <ExternalLink size={10} />
        </a>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UnifiedInboxPanel() {
  const [items,   setItems]   = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [filter,  setFilter]  = useState<Filter>('all')
  const [counts,  setCounts]  = useState<Counts>({ gmail: 0, slack: 0, monday: 0, total: 0 })

  // Hydrate read IDs from localStorage (client only)
  useEffect(() => {
    setReadIds(loadReadIds())
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/inbox')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items: InboxItem[]; counts: Counts }
      setItems(data.items ?? [])
      setCounts(data.counts ?? { gmail: 0, slack: 0, monday: 0, total: 0 })
    } catch {
      // leave items as-is on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const markRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = new Set(prev)
      next.add(id)
      saveReadIds(next)
      return next
    })
  }, [])

  // Filter + sort (high first, then timestamp desc — already sorted from API, just filter here)
  const filtered = filter === 'all' ? items : items.filter(i => i.source === filter)

  const filterTabs: { key: Filter; emoji: string; label: string; count: number }[] = [
    { key: 'all',    emoji: '',   label: 'All',    count: counts.total   },
    { key: 'gmail',  emoji: '📧', label: 'Gmail',  count: counts.gmail   },
    { key: 'slack',  emoji: '💬', label: 'Slack',  count: counts.slack   },
    { key: 'monday', emoji: '📋', label: 'Monday', count: counts.monday  },
  ]

  return (
    <div className="flex flex-col h-full min-h-0 gap-2">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox size={13} className="text-gray-500" />
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Unified Inbox
          </span>
          {counts.total > 0 && (
            <span className="text-[9px] font-bold bg-purple-900/40 text-purple-300 border border-purple-800/50 px-1.5 py-0.5 rounded-full">
              {counts.total}
            </span>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-gray-600 hover:text-gray-300 transition-colors disabled:opacity-40"
          title="Refresh inbox"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Filter tabs ───────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-1 flex-wrap">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`
              text-[10px] px-2 py-0.5 rounded-full border transition-all
              ${filter === tab.key
                ? 'bg-purple-900/30 border-purple-700/50 text-purple-300'
                : 'bg-transparent border-[#1e2030] text-gray-600 hover:border-[#2a2d3a] hover:text-gray-400'
              }
            `}
          >
            {tab.emoji && <span className="mr-0.5">{tab.emoji}</span>}
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 opacity-70">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Item list ─────────────────────────────────────────────────── */}
      <div
        className="
          flex-1 min-h-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030]
          overflow-y-auto
          [&::-webkit-scrollbar]:w-[3px]
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a]
          [&::-webkit-scrollbar-thumb]:rounded-full
        "
      >
        {loading ? (
          <div className="divide-y divide-[#1e2030]">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Inbox size={22} className="text-gray-700" />
            <p className="text-xs text-gray-600">All clear! No new items.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1e2030]">
            {filtered.map(item => (
              <InboxRow
                key={item.id}
                item={item}
                isRead={readIds.has(item.id)}
                onMarkRead={markRead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
