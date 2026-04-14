'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart2, RefreshCw } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentStat {
  agent:         string
  totalUses:     number
  lastUsed:      string
  avgResponseMs: number
}

interface UsageResponse {
  stats:               AgentStat[]
  topAgent:            string
  totalConversations:  number
}

type SortMode = 'usage' | 'name' | 'lastUsed'

// ─── Agent colour map (matches existing agent definitions) ────────────────────

const AGENT_COLOR: Record<string, string> = {
  DUMBLEDORE: 'bg-purple-500',
  HERMIONE:   'bg-amber-500',
  HARRY:      'bg-red-500',
  RON:        'bg-orange-500',
  McGONAGALL: 'bg-emerald-500',
  SNAPE:      'bg-slate-400',
  HAGRID:     'bg-yellow-600',
  LUNA:       'bg-teal-400',
  GINNY:      'bg-rose-400',
  NEVILLE:    'bg-lime-500',
  DRACO:      'bg-slate-300',
  SIRIUS:     'bg-indigo-400',
  LUPIN:      'bg-stone-400',
  FRED:       'bg-orange-400',
  GEORGE:     'bg-orange-300',
  FLEUR:      'bg-sky-400',
  MOODY:      'bg-zinc-400',
  TRELAWNEY:  'bg-violet-400',
  DOBBY:      'bg-teal-300',
  ARTHUR:     'bg-rose-500',
  TONKS:      'bg-pink-400',
  KINGSLEY:   'bg-yellow-400',
}

const AGENT_TEXT: Record<string, string> = {
  DUMBLEDORE: 'text-purple-300',
  HERMIONE:   'text-amber-300',
  HARRY:      'text-red-300',
  RON:        'text-orange-300',
  McGONAGALL: 'text-emerald-300',
  SNAPE:      'text-slate-300',
  HAGRID:     'text-yellow-300',
  LUNA:       'text-teal-300',
  GINNY:      'text-rose-300',
  NEVILLE:    'text-lime-300',
  DRACO:      'text-slate-200',
  SIRIUS:     'text-indigo-300',
  LUPIN:      'text-stone-300',
  FRED:       'text-orange-200',
  GEORGE:     'text-orange-300',
  FLEUR:      'text-sky-300',
  MOODY:      'text-zinc-300',
  TRELAWNEY:  'text-violet-300',
  DOBBY:      'text-teal-200',
  ARTHUR:     'text-rose-300',
  TONKS:      'text-pink-300',
  KINGSLEY:   'text-yellow-200',
}

// ─── Relative time ────────────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime()
    if (isNaN(diff)) return '—'

    const mins  = Math.floor(diff / 60_000)
    const hours = Math.floor(diff / 3_600_000)
    const days  = Math.floor(diff / 86_400_000)

    if (mins  < 1)   return 'just now'
    if (mins  < 60)  return `${mins}m ago`
    if (hours < 24)  return `${hours}h ago`
    if (days  < 30)  return `${days}d ago`
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

function isTodayISO(isoString: string): boolean {
  try {
    const d    = new Date(isoString)
    const now  = new Date()
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth()    === now.getMonth()    &&
      d.getDate()     === now.getDate()
    )
  } catch {
    return false
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBar() {
  return (
    <div className="flex items-center gap-3 animate-pulse">
      <div className="h-3 w-20 rounded bg-white/10 flex-shrink-0" />
      <div className="flex-1 h-4 rounded-full bg-white/10" />
      <div className="h-3 w-8 rounded bg-white/10 flex-shrink-0" />
    </div>
  )
}

// ─── Bar row ──────────────────────────────────────────────────────────────────

interface BarRowProps {
  stat:     AgentStat
  maxUses:  number
}

function BarRow({ stat, maxUses }: BarRowProps) {
  const pct         = maxUses > 0 ? (stat.totalUses / maxUses) * 100 : 0
  const colorClass  = AGENT_COLOR[stat.agent]  ?? 'bg-gray-500'
  const textClass   = AGENT_TEXT[stat.agent]   ?? 'text-gray-300'
  const lastUsedStr = relativeTime(stat.lastUsed)

  return (
    <div className="group flex items-center gap-3">
      {/* Agent name */}
      <span className={`text-[11px] font-semibold w-24 flex-shrink-0 uppercase tracking-wide truncate ${textClass}`}>
        {stat.agent}
      </span>

      {/* Bar + count */}
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[11px] text-gray-400 w-6 text-right tabular-nums">
          {stat.totalUses}
        </span>
      </div>

      {/* Last used — shown on hover */}
      <span className="text-[10px] text-gray-600 w-16 text-right flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {lastUsedStr}
      </span>
    </div>
  )
}

// ─── Summary card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label:    string
  value:    string | number
  subText?: string
}

function SummaryCard({ label, value, subText }: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.025] px-3 py-2.5 flex-1">
      <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1">{label}</p>
      <p className="text-base font-bold text-gray-100 leading-none">{value}</p>
      {subText && (
        <p className="text-[10px] text-gray-600 mt-0.5">{subText}</p>
      )}
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function AgentStatsPanel() {
  const [stats, setStats]       = useState<AgentStat[]>([])
  const [topAgent, setTopAgent] = useState<string>('')
  const [total, setTotal]       = useState<number>(0)
  const [loading, setLoading]   = useState(true)
  const [sortMode, setSortMode] = useState<SortMode>('usage')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/analytics/agent-usage')
      const data = await res.json() as UsageResponse
      setStats(data.stats ?? [])
      setTopAgent(data.topAgent ?? '')
      setTotal(data.totalConversations ?? 0)
    } catch {
      setStats([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Sorting ─────────────────────────────────────────────────────────────────

  const sorted = [...stats].sort((a, b) => {
    if (sortMode === 'usage')   return b.totalUses - a.totalUses
    if (sortMode === 'name')    return a.agent.localeCompare(b.agent)
    if (sortMode === 'lastUsed')
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    return 0
  })

  const maxUses       = sorted[0]?.totalUses ?? 1
  const todayActivity = stats.filter(s => isTodayISO(s.lastUsed)).length

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: 'transparent' }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center gap-2 mb-3 px-1">
        <BarChart2 size={15} className="text-indigo-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-200">📊 Agent Statistics</span>
        <button
          onClick={load}
          disabled={loading}
          className="ml-auto text-gray-600 hover:text-gray-300 transition-colors disabled:opacity-40"
          aria-label="Refresh stats"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Summary row ── */}
      <div className="flex-shrink-0 flex gap-2 mb-4">
        <SummaryCard
          label="Total Conversations"
          value={total.toLocaleString()}
        />
        <SummaryCard
          label="Most Used Agent"
          value={topAgent || '—'}
        />
        <SummaryCard
          label="Today's Activity"
          value={todayActivity}
          subText={`agent${todayActivity !== 1 ? 's' : ''} active`}
        />
      </div>

      {/* ── Sort controls ── */}
      <div className="flex-shrink-0 flex items-center gap-1 mb-3">
        <span className="text-[10px] uppercase tracking-widest text-gray-600 mr-1">Sort:</span>
        {(
          [
            { key: 'usage'   as SortMode, label: 'Usage'    },
            { key: 'name'    as SortMode, label: 'Name'     },
            { key: 'lastUsed'as SortMode, label: 'Recent'   },
          ] as const
        ).map(s => (
          <button
            key={s.key}
            onClick={() => setSortMode(s.key)}
            className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors ${
              sortMode === s.key
                ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-800/50'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Bar chart ── */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBar key={i} />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <BarChart2 size={28} className="text-gray-700" />
            <p className="text-sm text-gray-600">
              No usage data yet. Agent interactions will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sorted.map(stat => (
              <BarRow key={stat.agent} stat={stat} maxUses={maxUses} />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer note ── */}
      {!loading && sorted.length > 0 && (
        <p className="flex-shrink-0 text-[10px] text-gray-700 text-right mt-2 pt-2 border-t border-white/5">
          Hover a row to see last used time
        </p>
      )}
    </div>
  )
}
