'use client'

import { useState, useEffect } from 'react'
import { Plus, Zap, Trash2, X } from 'lucide-react'

interface SavedPrompt {
  id: string
  title: string
  prompt: string
  agent: string   // agent name or '' for auto-route
  createdAt: string
  useCount: number
}

const STORAGE_KEY = 'hw-saved-prompts'

const AGENT_NAMES = [
  'DUMBLEDORE', 'HERMIONE', 'HARRY', 'RON', 'McGONAGALL', 'SNAPE', 'HAGRID',
  'LUNA', 'GINNY', 'NEVILLE', 'DRACO', 'SIRIUS', 'LUPIN', 'FRED', 'GEORGE',
  'FLEUR', 'MOODY', 'TRELAWNEY', 'DOBBY', 'ARTHUR', 'TONKS', 'KINGSLEY',
]

const SEED_PROMPTS: SavedPrompt[] = [
  {
    id: 'seed-1',
    title: 'Revenue Rush Hook Batch',
    agent: 'FRED',
    prompt: 'Generate 15 high-converting YouTube hooks for Revenue Rush e-commerce education content. Include curiosity gap, controversy, and specificity formats. Rank by predicted performance.',
    createdAt: new Date().toISOString(),
    useCount: 0,
  },
  {
    id: 'seed-2',
    title: 'Weekly Status',
    agent: 'HERMIONE',
    prompt: "Give me a complete production status update. What's on track, at risk, and blocked?",
    createdAt: new Date().toISOString(),
    useCount: 0,
  },
  {
    id: 'seed-3',
    title: 'Brand Check',
    agent: 'SIRIUS',
    prompt: 'Review our recent content output for brand consistency. Are we drifting from the Revenue Rush or The Process brand standards?',
    createdAt: new Date().toISOString(),
    useCount: 0,
  },
]

function loadPrompts(): SavedPrompt[] {
  if (typeof window === 'undefined') return SEED_PROMPTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PROMPTS))
      return SEED_PROMPTS
    }
    return JSON.parse(raw) as SavedPrompt[]
  } catch {
    return SEED_PROMPTS
  }
}

function persistPrompts(prompts: SavedPrompt[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts)) } catch {}
}

export function SavedPromptsPanel({ onAction }: { onAction: (prompt: string) => void }) {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPrompt, setNewPrompt] = useState('')
  const [newAgent, setNewAgent] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    setPrompts(loadPrompts())
  }, [])

  function saveNew() {
    if (!newTitle.trim() || !newPrompt.trim()) return
    const entry: SavedPrompt = {
      id: `sp-${Date.now()}`,
      title: newTitle.trim(),
      prompt: newPrompt.trim(),
      agent: newAgent,
      createdAt: new Date().toISOString(),
      useCount: 0,
    }
    const updated = [entry, ...prompts]
    setPrompts(updated)
    persistPrompts(updated)
    setNewTitle('')
    setNewPrompt('')
    setNewAgent('')
    setAddOpen(false)
  }

  function firePrompt(id: string) {
    const target = prompts.find(p => p.id === id)
    if (!target) return
    const fullPrompt = target.agent ? `@${target.agent} ${target.prompt}` : target.prompt
    onAction(fullPrompt)
    const updated = prompts.map(p =>
      p.id === id ? { ...p, useCount: p.useCount + 1 } : p
    )
    setPrompts(updated)
    persistPrompts(updated)
  }

  function deletePrompt(id: string) {
    const updated = prompts.filter(p => p.id !== id)
    setPrompts(updated)
    persistPrompts(updated)
  }

  const sorted = [...prompts].sort((a, b) => b.useCount - a.useCount)

  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-200">📌 Saved Prompts</p>
          <p className="text-[11px] text-gray-600 mt-0.5">Your custom quick-fire prompts</p>
        </div>
        <button
          onClick={() => setAddOpen(v => !v)}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#1e2030] bg-[#0a0c14] hover:bg-[#0d0f1a] hover:border-[#2a2d3a] text-gray-400 hover:text-gray-200 transition-all"
          title="Add prompt"
        >
          {addOpen ? <X size={13} /> : <Plus size={13} />}
        </button>
      </div>

      {/* Add form */}
      {addOpen && (
        <div className="flex-shrink-0 mb-3 rounded-xl border border-[#1e2030] bg-[#0a0c14] p-3 space-y-2.5">
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="e.g. Revenue Rush Hook Batch"
              className="w-full bg-[#07080e] border border-[#1e2030] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-purple-700/60 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Agent (optional)</label>
            <select
              value={newAgent}
              onChange={e => setNewAgent(e.target.value)}
              className="w-full bg-[#07080e] border border-[#1e2030] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-700/60 transition-colors appearance-none"
            >
              <option value="">— Auto-route —</option>
              {AGENT_NAMES.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Prompt</label>
            <textarea
              value={newPrompt}
              onChange={e => setNewPrompt(e.target.value)}
              placeholder="Enter your prompt…"
              rows={3}
              className="w-full bg-[#07080e] border border-[#1e2030] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-purple-700/60 transition-colors resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveNew}
              disabled={!newTitle.trim() || !newPrompt.trim()}
              className="flex-1 py-2 rounded-lg bg-purple-800/80 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => { setAddOpen(false); setNewTitle(''); setNewPrompt(''); setNewAgent('') }}
              className="flex-1 py-2 rounded-lg border border-[#1e2030] bg-[#07080e] hover:bg-[#0d0f1a] text-gray-400 text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Prompt list */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5
        [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">

        {sorted.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-600 text-center">
              No saved prompts yet.<br />
              <span className="text-[11px] text-gray-700">Click + to add your first.</span>
            </p>
          </div>
        )}

        {sorted.map(p => (
          <div
            key={p.id}
            onMouseEnter={() => setHoveredId(p.id)}
            onMouseLeave={() => setHoveredId(null)}
            className="rounded-xl border border-[#1e2030] bg-[#0a0c14] hover:border-[#2a2d3a] transition-all p-3 group"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-semibold text-gray-200 truncate">{p.title}</span>
                  {p.agent && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-purple-800/50 bg-purple-900/20 text-purple-300 flex-shrink-0">
                      {p.agent}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed truncate">
                  {p.prompt.slice(0, 60)}{p.prompt.length > 60 ? '…' : ''}
                </p>
                {p.useCount > 0 && (
                  <p className="text-[10px] text-gray-700 mt-0.5">Used {p.useCount}×</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => firePrompt(p.id)}
                  title="Fire prompt"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-amber-300 hover:bg-amber-900/20 transition-all"
                >
                  <Zap size={13} />
                </button>
                <button
                  onClick={() => deletePrompt(p.id)}
                  title="Delete"
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-900/20 transition-all ${
                    hoveredId === p.id ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
