'use client'

import { useState, useEffect } from 'react'
import { Loader2, Clock, Play, Settings2, RefreshCw } from 'lucide-react'
import { AGENTS_DEF, TEXT_MAP, COLOR_MAP, BADGE_MAP } from './types'
import { AgentAvatar } from './AgentAvatar'

const STORAGE_KEY = 'hw-sched-brief'
const LAST_RUN_KEY = 'hw-sched-brief-last-run'

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface SchedConfig {
  days: string[]
  time: string
  agents: string[]
  slackChannel: string
}

const DEFAULT_CONFIG: SchedConfig = {
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  time: '09:00',
  agents: ['DUMBLEDORE', 'HERMIONE', 'HARRY', 'SNAPE'],
  slackChannel: '',
}

interface BriefResult {
  agent: string
  role: string
  color: string
  response: string
}

interface BriefResponse {
  results: BriefResult[]
  synthesis?: string
  error?: string
}

export function ScheduledBriefPanel() {
  const [config, setConfig] = useState<SchedConfig>(DEFAULT_CONFIG)
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [briefData, setBriefData] = useState<BriefResponse | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // Load config + last run time from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setConfig(JSON.parse(stored))
      const lr = localStorage.getItem(LAST_RUN_KEY)
      if (lr) setLastRun(lr)
    } catch {}
  }, [])

  function saveConfig(next: SchedConfig) {
    setConfig(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }

  function toggleDay(day: string) {
    saveConfig({ ...config, days: config.days.includes(day) ? config.days.filter(d => d !== day) : [...config.days, day] })
  }

  function toggleAgent(name: string) {
    saveConfig({
      ...config,
      agents: config.agents.includes(name)
        ? config.agents.filter(n => n !== name)
        : [...config.agents, name],
    })
  }

  async function runNow() {
    if (loading || config.agents.length === 0) return
    setLoading(true)
    setError('')
    setBriefData(null)

    try {
      const res = await fetch('/api/scheduled-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents: config.agents, slackChannel: config.slackChannel }),
      })
      const json = await res.json()
      if (json.error) { setError(json.error); return }
      setBriefData(json)
      const now = new Date().toISOString()
      setLastRun(now)
      try { localStorage.setItem(LAST_RUN_KEY, now) } catch {}
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  function formatLastRun(iso: string | null): string {
    if (!iso) return 'Never'
    try {
      const d = new Date(iso)
      return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    } catch { return iso }
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-200">📅 Scheduled Brief</p>
          <p className="text-[11px] text-gray-600 mt-0.5">Configure and run your automated team brief</p>
        </div>
        <button
          onClick={() => setShowSettings(s => !s)}
          className={`p-1.5 rounded-lg border transition-all ${
            showSettings
              ? 'border-purple-700/50 bg-purple-900/20 text-purple-300'
              : 'border-[#1e2030] text-gray-600 hover:text-gray-400 hover:border-[#2a2d3a]'
          }`}
          title="Schedule settings"
        >
          <Settings2 size={14} />
        </button>
      </div>

      {/* Status bar */}
      <div className="flex-shrink-0 flex items-center gap-3 rounded-xl border border-[#1e2030] bg-[#0a0c14] px-3 py-2">
        <Clock size={13} className="text-gray-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-600">Last run</p>
          <p className="text-[11px] text-gray-300 font-medium">{formatLastRun(lastRun)}</p>
        </div>
        {config.days.length > 0 && (
          <div className="text-right">
            <p className="text-[10px] text-gray-600">Scheduled</p>
            <p className="text-[11px] text-gray-400">
              {config.days.join(', ')} @ {config.time}
            </p>
          </div>
        )}
      </div>

      {/* Schedule settings (collapsible) */}
      {showSettings && (
        <div className="flex-shrink-0 rounded-xl border border-[#1e2030] bg-[#0a0c14] p-3 space-y-3">
          {/* Days */}
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 block">Days</label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                    config.days.includes(day)
                      ? 'border-purple-700/50 bg-purple-900/20 text-purple-300'
                      : 'border-[#1e2030] bg-[#0d0f1a] text-gray-600 hover:text-gray-400 hover:border-[#2a2d3a]'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Time</label>
            <input
              type="time"
              value={config.time}
              onChange={e => saveConfig({ ...config, time: e.target.value })}
              className="bg-[#0d0f1a] border border-[#1e2030] rounded-xl px-3 py-1.5 text-sm text-gray-200
                focus:outline-none focus:border-purple-700/60 transition-colors"
            />
          </div>

          {/* Slack channel */}
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">
              Slack Channel <span className="normal-case text-gray-700">(optional)</span>
            </label>
            <input
              type="text"
              value={config.slackChannel}
              onChange={e => saveConfig({ ...config, slackChannel: e.target.value })}
              placeholder="#general or @username"
              className="w-full bg-[#0d0f1a] border border-[#1e2030] rounded-xl px-4 py-2 text-sm text-gray-200
                placeholder-gray-700 focus:outline-none focus:border-purple-700/60 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Agent selection */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] text-gray-600 uppercase tracking-wider">Agents in Brief</label>
          <span className={`text-[10px] ${config.agents.length > 0 ? 'text-emerald-400' : 'text-gray-600'}`}>
            {config.agents.length} selected
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 max-h-[220px] overflow-y-auto pr-0.5
          [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">
          {AGENTS_DEF.map(agent => {
            const isSelected = config.agents.includes(agent.name)
            const colorCard = isSelected ? COLOR_MAP[agent.color] ?? '' : ''
            const textCol = isSelected ? TEXT_MAP[agent.color] ?? 'text-gray-300' : 'text-gray-600'
            return (
              <button
                key={agent.name}
                onClick={() => toggleAgent(agent.name)}
                title={agent.role}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 transition-all cursor-pointer
                  ${isSelected
                    ? `${colorCard} ring-1`
                    : 'border-[#1e2030] bg-[#0d0f1a] hover:border-[#2a2d3a]'
                  }`}
              >
                <AgentAvatar avatar={agent.avatar} name={agent.name} color={agent.color} size={26} />
                <span className={`text-[9px] font-semibold leading-tight text-center truncate w-full ${textCol}`}>
                  {agent.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected chips */}
      {config.agents.length > 0 && (
        <div className="flex-shrink-0 flex flex-wrap gap-1">
          {config.agents.map(name => {
            const agent = AGENTS_DEF.find(a => a.name === name)
            if (!agent) return null
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

      {/* Run Now button */}
      <button
        onClick={runNow}
        disabled={loading || config.agents.length === 0}
        className="flex-shrink-0 w-full flex items-center justify-center gap-2 bg-emerald-800/70 hover:bg-emerald-700/80
          disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
      >
        {loading
          ? <><Loader2 size={15} className="animate-spin" /> Running brief…</>
          : <><Play size={14} /> Run Now</>
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
          {config.agents.slice(0, 4).map(name => (
            <div key={name} className="rounded-xl border border-[#1e2030] bg-[#0a0c14] p-3 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#1e2030]" />
                <div className="h-3 w-24 rounded bg-[#1e2030]" />
              </div>
              <div className="space-y-1.5">
                <div className="h-2 rounded bg-[#1e2030] w-full" />
                <div className="h-2 rounded bg-[#1e2030] w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && briefData && (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2
          [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">

          <div className="flex-shrink-0 flex items-center justify-between">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Brief Results</p>
            <button
              onClick={runNow}
              className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-300 transition-colors px-1.5 py-1 rounded-lg hover:bg-[#0d0f1a] border border-transparent hover:border-[#1e2030]"
            >
              <RefreshCw size={11} /> Refresh
            </button>
          </div>

          {briefData.results.map(result => {
            const agentDef = AGENTS_DEF.find(a => a.name === result.agent)
            const colorCard = COLOR_MAP[result.color] ?? 'bg-[#0d0f1a] border-[#1e2030] text-gray-300'
            const textCol = TEXT_MAP[result.color] ?? 'text-gray-300'
            const badgeCls = BADGE_MAP[result.color] ?? 'bg-gray-800 text-gray-400'
            return (
              <div key={result.agent} className={`rounded-xl border p-3 ${colorCard}`}>
                <div className="flex items-center gap-2 mb-2">
                  {agentDef && (
                    <AgentAvatar
                      avatar={agentDef.avatar}
                      name={result.agent}
                      color={result.color}
                      size={24}
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

          {/* Synthesis */}
          {briefData.synthesis && (
            <div className="rounded-xl border border-purple-700/50 bg-purple-900/20 p-4">
              <div className="flex items-center gap-2 mb-2.5">
                {(() => {
                  const dumbledore = AGENTS_DEF.find(a => a.name === 'DUMBLEDORE')
                  return dumbledore ? (
                    <AgentAvatar avatar={dumbledore.avatar} name="DUMBLEDORE" color="purple" size={26} />
                  ) : null
                })()}
                <div>
                  <span className="text-[12px] font-bold text-purple-300">DUMBLEDORE Synthesis</span>
                  <p className="text-[9px] text-purple-400/70">Executive Summary</p>
                </div>
              </div>
              <p className="text-[12px] text-purple-100 leading-relaxed whitespace-pre-wrap">{briefData.synthesis}</p>
            </div>
          )}

          {/* Slack confirmation */}
          {config.slackChannel && (
            <p className="flex-shrink-0 text-[10px] text-emerald-400/70 text-center pb-1">
              Brief sent to {config.slackChannel}
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !briefData && !error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <p className="text-2xl mb-2">📅</p>
            <p className="text-sm text-gray-600">Configure agents and run your brief</p>
            <p className="text-[11px] text-gray-700 mt-1">Use the settings gear to set schedule &amp; Slack channel</p>
          </div>
        </div>
      )}
    </div>
  )
}
