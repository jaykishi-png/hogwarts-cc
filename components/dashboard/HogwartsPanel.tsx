'use client'

import { useState } from 'react'
import { Loader2, Send, ExternalLink } from 'lucide-react'

const AGENTS = [
  { name: 'DUMBLEDORE', role: 'Chief of Staff', commands: ['/brief', '/eod', '/ask'], color: 'purple', active: true },
  { name: 'HERMIONE', role: 'Production Controller', commands: ['/status', '/blockers'], color: 'amber', active: true },
  { name: 'HARRY', role: 'Creative Review', commands: ['/review', '/check-brief'], color: 'red', active: true },
  { name: 'RON', role: 'Strategic Ideation', commands: ['/brainstorm', '/brief'], color: 'orange', active: true },
  { name: 'McGONAGALL', role: 'SOP Builder', commands: ['/sop', '/workflow'], color: 'green', active: true },
  { name: 'SNAPE', role: 'AI Scout', commands: ['/ai-scout', '/ai-eval'], color: 'slate', active: true },
  { name: 'HAGRID', role: 'People Manager', commands: ['/1on1-prep', '/feedback', '/team-pulse'], color: 'brown', active: true },
]

const COLOR_MAP: Record<string, string> = {
  purple: 'bg-purple-900/30 border-purple-800/50 text-purple-300',
  amber: 'bg-amber-900/30 border-amber-800/50 text-amber-300',
  red: 'bg-red-900/30 border-red-800/50 text-red-300',
  orange: 'bg-orange-900/30 border-orange-800/50 text-orange-300',
  green: 'bg-emerald-900/30 border-emerald-800/50 text-emerald-300',
  slate: 'bg-slate-800/50 border-slate-700/50 text-slate-300',
  brown: 'bg-yellow-900/20 border-yellow-800/30 text-yellow-300',
}

const BADGE_MAP: Record<string, string> = {
  purple: 'bg-purple-900/50 text-purple-400',
  amber: 'bg-amber-900/50 text-amber-400',
  red: 'bg-red-900/50 text-red-400',
  orange: 'bg-orange-900/50 text-orange-400',
  green: 'bg-emerald-900/50 text-emerald-400',
  slate: 'bg-slate-800 text-slate-400',
  brown: 'bg-yellow-900/40 text-yellow-400',
}

export function HogwartsPanel() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function ask() {
    if (!question.trim() || loading) return
    setLoading(true)
    setError('')
    setAnswer('')
    try {
      const res = await fetch('/api/agents/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setAnswer(data.answer)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">🏰</span>
          <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Hogwarts</h2>
          <span className="text-xs text-gray-600">— AI Agent Taskforce</span>
        </div>
        <a
          href="https://discord.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <ExternalLink size={10} />
          Open Discord
        </a>
      </div>

      {/* Agent roster */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
        {AGENTS.map(agent => (
          <div
            key={agent.name}
            className={`rounded-lg border p-2.5 ${COLOR_MAP[agent.color]}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold tracking-wide">{agent.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" title="Online" />
            </div>
            <p className="text-xs opacity-70 mb-2 leading-tight">{agent.role}</p>
            <div className="flex flex-wrap gap-1">
              {agent.commands.map(cmd => (
                <span key={cmd} className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${BADGE_MAP[agent.color]}`}>
                  {cmd}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Ask DUMBLEDORE */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask DUMBLEDORE anything..."
              className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-700/60 transition-colors"
            />
          </div>
          <button
            onClick={ask}
            disabled={loading || !question.trim()}
            className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 border border-purple-800/50 hover:border-purple-700/60 bg-purple-900/20 rounded-lg px-3 py-2 transition-colors disabled:opacity-40"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            {loading ? 'Asking...' : 'Ask'}
          </button>
        </div>

        {/* Response */}
        {(answer || error) && (
          <div className={`rounded-lg border p-3 text-xs leading-relaxed whitespace-pre-wrap ${
            error
              ? 'bg-red-900/20 border-red-800/40 text-red-300'
              : 'bg-purple-900/10 border-purple-800/30 text-gray-300'
          }`}>
            {error ? `⚠️ ${error}` : (
              <>
                <span className="text-purple-400 font-semibold text-[10px] uppercase tracking-wider block mb-1.5">DUMBLEDORE</span>
                {answer}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
