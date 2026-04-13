'use client'

import { useState } from 'react'
import { Loader2, Send, ExternalLink } from 'lucide-react'
import Image from 'next/image'

const AGENTS = [
  { name: 'DUMBLEDORE', role: 'Chief of Staff',        commands: ['/brief', '/eod', '/ask'],          color: 'purple', active: true, avatar: '/agents/DUMBLEDORE_Cyborg.png' },
  { name: 'HERMIONE',   role: 'Production Controller', commands: ['/status', '/blockers'],             color: 'amber',  active: true, avatar: '/agents/HERMIONE_Cyborg.png'   },
  { name: 'HARRY',      role: 'Creative Review',       commands: ['/review', '/check-brief'],          color: 'red',    active: true, avatar: '/agents/HARRY_Cyborg.png'      },
  { name: 'RON',        role: 'Strategic Ideation',    commands: ['/brainstorm', '/brief'],            color: 'orange', active: true, avatar: '/agents/RON_Cyborg.png'        },
  { name: 'McGONAGALL', role: 'SOP Builder',           commands: ['/sop', '/workflow'],                color: 'green',  active: true, avatar: '/agents/McGONAGALL_Cyborg.png' },
  { name: 'SNAPE',      role: 'AI Scout',              commands: ['/ai-scout', '/ai-eval'],            color: 'slate',  active: true, avatar: '/agents/SNAPE_Cyborg.png'      },
  { name: 'HAGRID',     role: 'People Manager',        commands: ['/1on1-prep', '/feedback', '/team-pulse'], color: 'brown', active: true, avatar: '/agents/HAGRID_Cyborg.png' },
]

const COLOR_MAP: Record<string, string> = {
  purple: 'bg-purple-900/30 border-purple-800/50 text-purple-300',
  amber:  'bg-amber-900/30 border-amber-800/50 text-amber-300',
  red:    'bg-red-900/30 border-red-800/50 text-red-300',
  orange: 'bg-orange-900/30 border-orange-800/50 text-orange-300',
  green:  'bg-emerald-900/30 border-emerald-800/50 text-emerald-300',
  slate:  'bg-slate-800/50 border-slate-700/50 text-slate-300',
  brown:  'bg-yellow-900/20 border-yellow-800/30 text-yellow-300',
}

const BADGE_MAP: Record<string, string> = {
  purple: 'bg-purple-900/50 text-purple-400',
  amber:  'bg-amber-900/50 text-amber-400',
  red:    'bg-red-900/50 text-red-400',
  orange: 'bg-orange-900/50 text-orange-400',
  green:  'bg-emerald-900/50 text-emerald-400',
  slate:  'bg-slate-800 text-slate-400',
  brown:  'bg-yellow-900/40 text-yellow-400',
}

const RING_MAP: Record<string, string> = {
  purple: 'ring-purple-700/60',
  amber:  'ring-amber-700/60',
  red:    'ring-red-700/60',
  orange: 'ring-orange-700/60',
  green:  'ring-emerald-700/60',
  slate:  'ring-slate-600/60',
  brown:  'ring-yellow-700/60',
}

const TEXT_MAP: Record<string, string> = {
  purple: 'text-purple-300',
  amber:  'text-amber-300',
  red:    'text-red-300',
  orange: 'text-orange-300',
  green:  'text-emerald-300',
  slate:  'text-slate-300',
  brown:  'text-yellow-300',
}

function AgentAvatar({
  avatar,
  name,
  color,
  size = 32,
}: {
  avatar: string
  name: string
  color: string
  size?: number
}) {
  const [failed, setFailed] = useState(false)
  const ringClass = RING_MAP[color] ?? 'ring-gray-600/60'

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-full ring-2 ${ringClass} bg-[#1a1d27] text-[10px] font-bold text-gray-400 flex-shrink-0`}
        style={{ width: size, height: size }}
      >
        {name[0]}
      </div>
    )
  }

  return (
    <Image
      src={avatar}
      alt={name}
      width={size}
      height={size}
      className={`rounded-full object-cover object-top ring-2 ${ringClass} flex-shrink-0`}
      onError={() => setFailed(true)}
    />
  )
}

export function HogwartsPanel() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [respondingAgent, setRespondingAgent] = useState('')
  const [respondingColor, setRespondingColor] = useState('purple')
  const [respondingAvatar, setRespondingAvatar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function ask() {
    if (!question.trim() || loading) return
    setLoading(true)
    setError('')
    setAnswer('')
    setRespondingAgent('')
    try {
      const res = await fetch('/api/agents/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setAnswer(data.answer)
        const agentName = data.agent ?? 'DUMBLEDORE'
        setRespondingAgent(agentName)
        setRespondingColor(data.color ?? 'purple')
        const match = AGENTS.find(a => a.name === agentName)
        setRespondingAvatar(match?.avatar ?? '')
      }
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
            {/* Avatar + online dot */}
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-shrink-0">
                <AgentAvatar avatar={agent.avatar} name={agent.name} color={agent.color} size={36} />
                <span
                  className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-400 ring-1 ring-[#0f1117]"
                  title="Online"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-wide leading-tight truncate">{agent.name}</p>
                <p className="text-[9px] opacity-60 leading-tight truncate">{agent.role}</p>
              </div>
            </div>

            {/* Command badges */}
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

      {/* Ask input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything — auto-routed to the right agent. Or @snape, @hagrid, etc."
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
          <div className={`rounded-lg border p-3 text-xs leading-relaxed ${
            error
              ? 'bg-red-900/20 border-red-800/40 text-red-300'
              : 'bg-[#0d0f18] border-[#2a2d3a] text-gray-300'
          }`}>
            {error ? (
              `⚠️ ${error}`
            ) : (
              <>
                {/* Responding agent header */}
                <div className="flex items-center gap-2 mb-2.5 pb-2.5 border-b border-[#2a2d3a]">
                  {respondingAvatar && (
                    <AgentAvatar
                      avatar={respondingAvatar}
                      name={respondingAgent}
                      color={respondingColor}
                      size={28}
                    />
                  )}
                  <div>
                    <span className={`font-bold text-[11px] uppercase tracking-wider ${TEXT_MAP[respondingColor] ?? 'text-purple-300'}`}>
                      {respondingAgent}
                    </span>
                    <span className="text-[10px] text-gray-600 ml-1.5">
                      {AGENTS.find(a => a.name === respondingAgent)?.role}
                    </span>
                  </div>
                </div>
                {/* Answer text */}
                <div className="whitespace-pre-wrap leading-relaxed">
                  {answer}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
