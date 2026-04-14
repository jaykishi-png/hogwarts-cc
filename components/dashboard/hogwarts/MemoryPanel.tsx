'use client'
import { useState, useEffect, useCallback } from 'react'
import { Brain, RefreshCw, Trash2, ChevronDown } from 'lucide-react'

// ─── Types (mirrored from lib/memory to keep this client-side safe) ───────────

type MemoryType       = 'fact' | 'task_completed' | 'decision' | 'project' | 'preference' | 'context' | 'brand'
type MemoryImportance = 'high' | 'medium' | 'low'

interface MemoryEntry {
  id:         string
  type:       MemoryType
  agent:      string
  content:    string
  importance: MemoryImportance
  tags:       string[]
  source:     string
  createdAt:  string
}

// ─── Colour / style maps ──────────────────────────────────────────────────────

const TYPE_BADGE: Record<MemoryType, string> = {
  fact:           'bg-blue-900/50 text-blue-300 border border-blue-800/40',
  task_completed: 'bg-emerald-900/50 text-emerald-300 border border-emerald-800/40',
  decision:       'bg-purple-900/50 text-purple-300 border border-purple-800/40',
  project:        'bg-amber-900/50 text-amber-300 border border-amber-800/40',
  preference:     'bg-pink-900/50 text-pink-300 border border-pink-800/40',
  context:        'bg-slate-800/60 text-slate-300 border border-slate-700/40',
  brand:          'bg-indigo-900/50 text-indigo-300 border border-indigo-800/40',
}

const TYPE_LABEL: Record<MemoryType, string> = {
  fact:           'Fact',
  task_completed: 'Task Done',
  decision:       'Decision',
  project:        'Project',
  preference:     'Preference',
  context:        'Context',
  brand:          'Brand',
}

const IMPORTANCE_DOT: Record<MemoryImportance, string> = {
  high:   'bg-red-500',
  medium: 'bg-yellow-400',
  low:    'bg-gray-600',
}

// ─── Skeleton placeholder ─────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 animate-pulse">
      <div className="flex items-start gap-2 mb-2">
        <div className="h-4 w-16 rounded bg-white/10" />
        <div className="h-4 w-4 rounded-full bg-white/10 ml-auto" />
      </div>
      <div className="h-3 w-full rounded bg-white/10 mb-1.5" />
      <div className="h-3 w-3/4 rounded bg-white/10 mb-2.5" />
      <div className="flex gap-1.5">
        <div className="h-3 w-10 rounded bg-white/10" />
        <div className="h-3 w-14 rounded bg-white/10" />
      </div>
    </div>
  )
}

// ─── Memory card ──────────────────────────────────────────────────────────────

interface MemoryCardProps {
  entry:    MemoryEntry
  onDelete: (id: string) => void
  deleting: boolean
}

function MemoryCard({ entry, onDelete, deleting }: MemoryCardProps) {
  const [hovered, setHovered] = useState(false)

  const dateStr = (() => {
    try {
      return new Date(entry.createdAt).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    } catch {
      return ''
    }
  })()

  return (
    <div
      className="group relative rounded-lg border border-white/5 bg-white/[0.025] hover:bg-white/[0.04] p-3 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top row: type badge + importance dot + trash */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${TYPE_BADGE[entry.type]}`}>
          {TYPE_LABEL[entry.type]}
        </span>
        <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${IMPORTANCE_DOT[entry.importance]}`} title={entry.importance} />
        {hovered && (
          <button
            onClick={() => onDelete(entry.id)}
            disabled={deleting}
            className="ml-auto text-gray-600 hover:text-red-400 transition-colors disabled:opacity-30"
            aria-label="Delete memory"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Content */}
      <p className="text-sm text-gray-200 leading-snug mb-2">{entry.content}</p>

      {/* Footer: agent, tags, date */}
      <div className="flex items-center flex-wrap gap-1.5">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          {entry.agent}
        </span>
        {entry.tags.map(tag => (
          <span
            key={tag}
            className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 border border-white/5"
          >
            {tag}
          </span>
        ))}
        <span className="ml-auto text-[10px] text-gray-600">{dateStr}</span>
      </div>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

type ImportanceFilter = 'all' | 'high'
type AgentFilter      = 'all' | string

export function MemoryPanel() {
  const [memories, setMemories]         = useState<MemoryEntry[]>([])
  const [loading, setLoading]           = useState(true)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [importanceFilter, setImportanceFilter] = useState<ImportanceFilter>('all')
  const [agentFilter, setAgentFilter]   = useState<AgentFilter>('all')
  const [agentDropOpen, setAgentDropOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/memory?all=true')
      const data = await res.json() as { memories: MemoryEntry[] }
      setMemories(data.memories ?? [])
    } catch {
      setMemories([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await fetch(`/api/memory?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      setMemories(prev => prev.filter(m => m.id !== id))
    } catch {
      // silently fail
    } finally {
      setDeletingId(null)
    }
  }

  // Unique agent names for the dropdown
  const agentNames = Array.from(new Set(memories.map(m => m.agent))).sort()

  const filtered = memories.filter(m => {
    if (importanceFilter === 'high' && m.importance !== 'high') return false
    if (agentFilter !== 'all' && m.agent !== agentFilter) return false
    return true
  })

  return (
    <div
      className="flex flex-col h-full min-h-0"
      style={{ background: 'transparent' }}
    >
      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center gap-2 mb-3 px-1">
        <Brain size={15} className="text-purple-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-200">Agent Memory</span>
        <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-purple-900/60 text-purple-300 border border-purple-800/40">
          {memories.length}
        </span>
        <button
          onClick={load}
          disabled={loading}
          className="ml-auto text-gray-600 hover:text-gray-300 transition-colors disabled:opacity-40"
          aria-label="Refresh memories"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex-shrink-0 flex items-center gap-2 mb-3 px-1 flex-wrap">
        {/* Importance tabs */}
        {(['all', 'high'] as ImportanceFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setImportanceFilter(f)}
            className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
              importanceFilter === f
                ? 'bg-purple-900/60 text-purple-300 border border-purple-800/50'
                : 'text-gray-500 hover:text-gray-300 border border-transparent hover:border-white/10'
            }`}
          >
            {f === 'all' ? 'All' : 'High Priority'}
          </button>
        ))}

        {/* Agent dropdown */}
        <div className="relative ml-auto">
          <button
            onClick={() => setAgentDropOpen(prev => !prev)}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-medium text-gray-500 hover:text-gray-300 border border-transparent hover:border-white/10 transition-colors"
          >
            {agentFilter === 'all' ? 'By Agent' : agentFilter}
            <ChevronDown size={11} />
          </button>

          {agentDropOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-lg border border-white/10 bg-[#0d0f18] shadow-xl py-1">
              <button
                onClick={() => { setAgentFilter('all'); setAgentDropOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/5 transition-colors ${agentFilter === 'all' ? 'text-purple-300' : 'text-gray-400'}`}
              >
                All Agents
              </button>
              {agentNames.map(name => (
                <button
                  key={name}
                  onClick={() => { setAgentFilter(name); setAgentDropOpen(false) }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/5 transition-colors ${agentFilter === name ? 'text-purple-300' : 'text-gray-400'}`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Memory list ── */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <Brain size={28} className="text-gray-700" />
            <p className="text-sm text-gray-600 max-w-[200px] leading-relaxed">
              {memories.length === 0
                ? "No memories yet. Start chatting and I'll remember what matters."
                : 'No memories match the current filter.'}
            </p>
          </div>
        ) : (
          filtered.map(entry => (
            <MemoryCard
              key={entry.id}
              entry={entry}
              onDelete={handleDelete}
              deleting={deletingId === entry.id}
            />
          ))
        )}
      </div>
    </div>
  )
}
