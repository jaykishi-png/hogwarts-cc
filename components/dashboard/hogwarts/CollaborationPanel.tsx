'use client'

import { useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { AGENTS_DEF, TEXT_MAP, COLOR_MAP, BADGE_MAP } from './types'
import { AgentAvatar } from './AgentAvatar'

interface CollaborationResult {
  agent: string
  role: string
  color: string
  avatar: string
  response: string
}

interface CollaborationResponse {
  results: CollaborationResult[]
  synthesis: string
  error?: string
}

export function CollaborationPanel({ onAction }: { onAction: (prompt: string) => void }) {
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<CollaborationResponse | null>(null)

  function toggleAgent(name: string) {
    setSelectedAgents(prev => {
      if (prev.includes(name)) return prev.filter(n => n !== name)
      if (prev.length >= 6) return prev
      return [...prev, name]
    })
  }

  const canSubmit = selectedAgents.length >= 2 && selectedAgents.length <= 6 && topic.trim().length > 0 && !loading

  async function collaborate() {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    setData(null)
    onAction(`/collaborate — ${selectedAgents.join(', ')}: ${topic}`)

    try {
      const res = await fetch('/api/collaborate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, agents: selectedAgents }),
      })
      const json = await res.json()
      if (json.error) { setError(json.error); return }
      setData(json)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const selectionMsg =
    selectedAgents.length === 0
      ? 'Select 2–6 agents to collaborate'
      : selectedAgents.length === 1
      ? '1 selected — pick at least 1 more'
      : selectedAgents.length <= 6
      ? `${selectedAgents.length} agents selected`
      : `Max 6 agents`

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
      {/* Header */}
      <div className="flex-shrink-0">
        <p className="text-sm font-semibold text-gray-200">🤝 Multi-Agent Collaboration</p>
        <p className="text-[11px] text-gray-600 mt-0.5">Select agents, describe your topic, get a synthesised brief</p>
      </div>

      {/* Agent grid */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] text-gray-600 uppercase tracking-wider">Agents</label>
          <span className={`text-[10px] ${selectedAgents.length >= 2 ? 'text-emerald-400' : 'text-gray-600'}`}>
            {selectionMsg}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 max-h-[260px] overflow-y-auto pr-0.5
          [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">
          {AGENTS_DEF.map(agent => {
            const isSelected = selectedAgents.includes(agent.name)
            const isDisabled = !isSelected && selectedAgents.length >= 6
            const colorClass = isSelected ? COLOR_MAP[agent.color] ?? '' : ''
            const textClass = isSelected ? TEXT_MAP[agent.color] ?? 'text-gray-300' : 'text-gray-600'
            return (
              <button
                key={agent.name}
                onClick={() => toggleAgent(agent.name)}
                disabled={isDisabled}
                title={agent.role}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 transition-all
                  ${isSelected
                    ? `${colorClass} ring-1`
                    : 'border-[#1e2030] bg-[#0d0f1a] hover:border-[#2a2d3a]'
                  }
                  ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <AgentAvatar avatar={agent.avatar} name={agent.name} color={agent.color} size={28} />
                <span className={`text-[9px] font-semibold leading-tight text-center truncate w-full ${textClass}`}>
                  {agent.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Topic textarea */}
      <div className="flex-shrink-0">
        <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">
          Topic / Question
        </label>
        <textarea
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Describe what you want the selected agents to collaborate on…"
          rows={3}
          className="w-full bg-[#0d0f1a] border border-[#1e2030] rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-700
            focus:outline-none focus:border-purple-700/60 transition-colors resize-none
            [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full"
        />
      </div>

      {/* Selected chips */}
      {selectedAgents.length > 0 && (
        <div className="flex-shrink-0 flex flex-wrap gap-1">
          {selectedAgents.map(name => {
            const agent = AGENTS_DEF.find(a => a.name === name)!
            return (
              <span
                key={name}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${BADGE_MAP[agent.color] ?? 'bg-gray-800 text-gray-400'}`}
              >
                {name}
                <button
                  onClick={() => toggleAgent(name)}
                  className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                >×</button>
              </span>
            )
          })}
        </div>
      )}

      {/* Collaborate button */}
      <button
        onClick={collaborate}
        disabled={!canSubmit}
        className="flex-shrink-0 w-full flex items-center justify-center gap-2 bg-purple-800/80 hover:bg-purple-700
          disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
      >
        {loading
          ? <><Loader2 size={15} className="animate-spin" /> Collaborating…</>
          : <><Send size={14} /> Collaborate ({selectedAgents.length} agents)</>
        }
      </button>

      {/* Error */}
      {error && (
        <div className="flex-shrink-0 rounded-xl border border-red-800/40 bg-red-900/20 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          {selectedAgents.map(name => (
            <div key={name} className="rounded-xl border border-[#1e2030] bg-[#0a0c14] p-3 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#1e2030]" />
                <div className="h-3 w-24 rounded bg-[#1e2030]" />
              </div>
              <div className="space-y-1.5">
                <div className="h-2 rounded bg-[#1e2030] w-full" />
                <div className="h-2 rounded bg-[#1e2030] w-4/5" />
                <div className="h-2 rounded bg-[#1e2030] w-3/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && data && (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2
          [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">

          <p className="flex-shrink-0 text-[10px] text-gray-600 uppercase tracking-wider font-semibold">
            Agent Responses
          </p>

          {data.results.map(result => {
            const agentDef = AGENTS_DEF.find(a => a.name === result.agent)
            const colorCard = COLOR_MAP[result.color] ?? 'bg-[#0d0f1a] border-[#1e2030] text-gray-300'
            const textCol = TEXT_MAP[result.color] ?? 'text-gray-300'
            const badgeCls = BADGE_MAP[result.color] ?? 'bg-gray-800 text-gray-400'
            return (
              <div
                key={result.agent}
                className={`rounded-xl border p-3 ${colorCard}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {agentDef && (
                    <AgentAvatar
                      avatar={agentDef.avatar}
                      name={result.agent}
                      color={result.color}
                      size={26}
                    />
                  )}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-[11px] font-bold ${textCol}`}>{result.agent}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${badgeCls}`}>
                      {result.role}
                    </span>
                  </div>
                </div>
                <p className="text-[12px] text-gray-300 leading-relaxed whitespace-pre-wrap">{result.response}</p>
              </div>
            )
          })}

          {/* Synthesis card */}
          {data.synthesis && (
            <div className="rounded-xl border border-purple-700/50 bg-purple-900/20 p-4">
              <div className="flex items-center gap-2 mb-2.5">
                {(() => {
                  const dumbledore = AGENTS_DEF.find(a => a.name === 'DUMBLEDORE')
                  return dumbledore ? (
                    <AgentAvatar
                      avatar={dumbledore.avatar}
                      name="DUMBLEDORE"
                      color="purple"
                      size={28}
                    />
                  ) : null
                })()}
                <div>
                  <span className="text-[12px] font-bold text-purple-300">DUMBLEDORE Synthesis</span>
                  <p className="text-[9px] text-purple-400/70">Combined Intelligence Brief</p>
                </div>
                <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-400 font-semibold">
                  SYNTHESIS
                </span>
              </div>
              <p className="text-[12px] text-purple-100 leading-relaxed whitespace-pre-wrap">{data.synthesis}</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !data && !error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <p className="text-2xl mb-2">🤝</p>
            <p className="text-sm text-gray-600">Select 2–6 agents and describe your topic</p>
            <p className="text-[11px] text-gray-700 mt-1">All selected agents will respond, then DUMBLEDORE synthesises</p>
          </div>
        </div>
      )}
    </div>
  )
}
