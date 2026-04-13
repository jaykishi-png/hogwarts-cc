'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { Loader2, Send, Users, Zap, RotateCcw, Wifi } from 'lucide-react'
import { NavTabs } from './NavTabs'
import type { ComponentType } from 'react'
import {
  DumbledoreCharacter, HermioneCharacter, HarryCharacter,
  RonCharacter, McGonagallCharacter, SnapeCharacter, HagridCharacter,
} from './OfficeCharacters'

// ─── Agent master data ────────────────────────────────────────────────────────

const AGENTS_DEF = [
  { name: 'DUMBLEDORE', role: 'Chief of Staff',        commands: ['/brief', '/eod'],      color: 'purple', homeRoom: 'headmaster' as const,  avatar: '/agents/DUMBLEDORE_Cyborg.png' },
  { name: 'HERMIONE',   role: 'Production Controller', commands: ['/status', '/blockers'], color: 'amber',  homeRoom: 'operations' as const,  avatar: '/agents/HERMIONE_Cyborg.png'   },
  { name: 'HARRY',      role: 'Creative Review',       commands: ['/review'],             color: 'red',    homeRoom: 'creative' as const,    avatar: '/agents/HARRY_Cyborg.png'      },
  { name: 'RON',        role: 'Strategic Ideation',    commands: ['/brainstorm'],         color: 'orange', homeRoom: 'creative' as const,    avatar: '/agents/RON_Cyborg.png'        },
  { name: 'McGONAGALL', role: 'SOP Builder',           commands: ['/sop', '/workflow'],   color: 'green',  homeRoom: 'archive' as const,     avatar: '/agents/McGONAGALL_Cyborg.png' },
  { name: 'SNAPE',      role: 'AI Scout',              commands: ['/ai-scout'],           color: 'slate',  homeRoom: 'lab' as const,         avatar: '/agents/SNAPE_Cyborg.png'      },
  { name: 'HAGRID',     role: 'People Manager',        commands: ['/1on1-prep'],          color: 'brown',  homeRoom: 'common' as const,      avatar: '/agents/HAGRID_Cyborg.png'     },
]

// ─── Colour maps ──────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  purple: 'bg-purple-900/30 border-purple-800/50 text-purple-300',
  amber:  'bg-amber-900/30 border-amber-800/50 text-amber-300',
  red:    'bg-red-900/30 border-red-800/50 text-red-300',
  orange: 'bg-orange-900/30 border-orange-800/50 text-orange-300',
  green:  'bg-emerald-900/30 border-emerald-800/50 text-emerald-300',
  slate:  'bg-slate-800/50 border-slate-700/50 text-slate-300',
  brown:  'bg-yellow-900/20 border-yellow-800/30 text-yellow-300',
}
const RING_MAP: Record<string, string> = {
  purple: 'ring-purple-700/60', amber: 'ring-amber-700/60',    red: 'ring-red-700/60',
  orange: 'ring-orange-700/60', green: 'ring-emerald-700/60', slate: 'ring-slate-600/60', brown: 'ring-yellow-700/60',
}
const TEXT_MAP: Record<string, string> = {
  purple: 'text-purple-300', amber: 'text-amber-300',   red: 'text-red-300',
  orange: 'text-orange-300', green: 'text-emerald-300', slate: 'text-slate-300', brown: 'text-yellow-300',
}
const BADGE_MAP: Record<string, string> = {
  purple: 'bg-purple-900/50 text-purple-400', amber: 'bg-amber-900/50 text-amber-400',
  red: 'bg-red-900/50 text-red-400',          orange: 'bg-orange-900/50 text-orange-400',
  green: 'bg-emerald-900/50 text-emerald-400', slate: 'bg-slate-800 text-slate-400',
  brown: 'bg-yellow-900/40 text-yellow-400',
}

// ─── Office types ─────────────────────────────────────────────────────────────

type RoomId     = 'headmaster' | 'great-hall' | 'lab' | 'operations' | 'creative' | 'archive' | 'common'
type AgentStatus = 'online' | 'working' | 'in-meeting' | 'away'
interface Pos { x: number; y: number }
interface AgentState {
  name: string; role: string; homeRoom: RoomId; currentRoom: RoomId
  status: AgentStatus; color: string; avatar: string
}
interface LogEntry { time: string; msg: string; type: 'move' | 'status' | 'meeting' | 'chat' }

// ─── Position maps ────────────────────────────────────────────────────────────

const DESK_POS: Record<string, Pos> = {
  DUMBLEDORE: { x: 10, y: 25 }, SNAPE:      { x: 82, y: 25 },
  HERMIONE:   { x: 13, y: 64 }, HARRY:      { x: 35, y: 63 },
  RON:        { x: 46, y: 72 }, McGONAGALL: { x: 76, y: 63 },
  HAGRID:     { x: 12, y: 91 },
}
const MEETING_POS: Record<string, Pos> = {
  DUMBLEDORE: { x: 30, y: 13 }, HERMIONE:   { x: 38, y: 13 },
  HARRY:      { x: 46, y: 13 }, RON:        { x: 54, y: 13 },
  McGONAGALL: { x: 34, y: 32 }, SNAPE:      { x: 46, y: 34 },
  HAGRID:     { x: 57, y: 23 },
}
function getPos(agent: AgentState): Pos {
  return agent.currentRoom === 'great-hall' ? MEETING_POS[agent.name] : DESK_POS[agent.name]
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

interface RoomConfig {
  label: string; sublabel: string; emoji: string
  style: React.CSSProperties; border: string; bg: string; textColor: string; isMeeting?: boolean
}
const ROOMS: Record<RoomId, RoomConfig> = {
  'headmaster': {
    label: "Headmaster's Office", sublabel: 'Private', emoji: '🔮',
    style: { left: '0%', top: '0%', width: '22%', height: '44%' },
    border: 'border-purple-700/50', bg: 'bg-purple-950/40', textColor: 'text-purple-400',
  },
  'great-hall': {
    label: 'Great Hall', sublabel: 'Meeting Room', emoji: '🏛️',
    style: { left: '22%', top: '0%', width: '42%', height: '44%' },
    border: 'border-blue-600/60', bg: 'bg-blue-950/30', textColor: 'text-blue-300', isMeeting: true,
  },
  'lab': {
    label: "Snape's Lab", sublabel: 'AI Research', emoji: '⚗️',
    style: { left: '64%', top: '0%', width: '36%', height: '44%' },
    border: 'border-slate-600/50', bg: 'bg-slate-900/50', textColor: 'text-slate-400',
  },
  'operations': {
    label: 'Operations', sublabel: 'Production', emoji: '📊',
    style: { left: '0%', top: '44%', width: '28%', height: '38%' },
    border: 'border-amber-700/50', bg: 'bg-amber-950/30', textColor: 'text-amber-400',
  },
  'creative': {
    label: 'Creative Studio', sublabel: 'Design & Strategy', emoji: '🎨',
    style: { left: '28%', top: '44%', width: '36%', height: '38%' },
    border: 'border-orange-700/50', bg: 'bg-orange-950/25', textColor: 'text-orange-400',
  },
  'archive': {
    label: 'The Archive', sublabel: 'SOPs & Docs', emoji: '📚',
    style: { left: '64%', top: '44%', width: '36%', height: '38%' },
    border: 'border-emerald-700/50', bg: 'bg-emerald-950/25', textColor: 'text-emerald-400',
  },
  'common': {
    label: 'Common Room', sublabel: 'People & Team', emoji: '☕',
    style: { left: '0%', top: '82%', width: '100%', height: '18%' },
    border: 'border-yellow-700/40', bg: 'bg-yellow-950/20', textColor: 'text-yellow-500',
  },
}

const GLOW: Record<string, string> = {
  purple: 'drop-shadow(0 0 6px rgba(139,92,246,0.8))',
  amber:  'drop-shadow(0 0 6px rgba(251,191,36,0.8))',
  red:    'drop-shadow(0 0 6px rgba(239,68,68,0.8))',
  orange: 'drop-shadow(0 0 6px rgba(249,115,22,0.8))',
  green:  'drop-shadow(0 0 6px rgba(52,211,153,0.8))',
  slate:  'drop-shadow(0 0 6px rgba(148,163,184,0.6))',
  brown:  'drop-shadow(0 0 6px rgba(234,179,8,0.6))',
}

const CHARACTER_MAP: Record<string, ComponentType<{ avatar: string; isWalking: boolean; status: AgentStatus }>> = {
  DUMBLEDORE: DumbledoreCharacter, HERMIONE: HermioneCharacter, HARRY: HarryCharacter,
  RON: RonCharacter, McGONAGALL: McGonagallCharacter, SNAPE: SnapeCharacter, HAGRID: HagridCharacter,
}

// ─── AgentAvatar (chat panel) ─────────────────────────────────────────────────

function AgentAvatar({ avatar, name, color, size = 32 }: { avatar: string; name: string; color: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const ring = RING_MAP[color] ?? 'ring-gray-600/60'
  if (failed) return (
    <div className={`flex items-center justify-center rounded-full ring-2 ${ring} bg-[#1a1d27] text-[10px] font-bold text-gray-400 flex-shrink-0`}
      style={{ width: size, height: size }}>{name[0]}</div>
  )
  return (
    <Image src={avatar} alt={name} width={size} height={size}
      className={`rounded-full object-cover object-top ring-2 ${ring} flex-shrink-0`}
      onError={() => setFailed(true)} />
  )
}

// ─── Furniture ────────────────────────────────────────────────────────────────

function Furniture({ roomId, occupied }: { roomId: RoomId; occupied: boolean }) {
  if (roomId === 'great-hall') return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingTop: '18%' }}>
      <div className={`rounded-xl border-2 transition-all duration-500 ${occupied ? 'border-blue-500/50 bg-blue-900/20 shadow-lg shadow-blue-500/20' : 'border-[#2a2d3a]/60 bg-[#1a1d27]/20'}`}
        style={{ width: '62%', height: '44%' }}>
        <div className="w-full h-full flex items-center justify-center gap-3 opacity-30">
          {[...Array(5)].map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${occupied ? 'bg-blue-400' : 'bg-gray-600'}`} />)}
        </div>
      </div>
    </div>
  )
  if (roomId === 'headmaster') return (
    <div className="absolute pointer-events-none" style={{ bottom: '16%', left: '50%', transform: 'translateX(-50%)' }}>
      <div className="w-12 h-7 rounded border border-purple-800/40 bg-purple-900/20 flex items-center justify-center">
        <div className="w-6 h-1 bg-purple-700/50 rounded" />
      </div>
    </div>
  )
  if (roomId === 'operations') return (
    <div className="absolute pointer-events-none" style={{ bottom: '18%', right: '12%' }}>
      <div className="w-14 h-8 rounded border border-amber-800/30 bg-amber-900/10">
        <div className="m-1 w-6 h-1 bg-amber-700/40 rounded" /><div className="m-1 w-8 h-1 bg-amber-700/30 rounded" />
      </div>
    </div>
  )
  if (roomId === 'creative') return (
    <div className="absolute pointer-events-none flex gap-2" style={{ bottom: '16%', right: '10%' }}>
      <div className="w-6 h-8 rounded border border-orange-700/30 bg-orange-900/10" />
      <div className="w-10 h-6 rounded border border-orange-700/20 bg-orange-900/10 self-end" />
    </div>
  )
  if (roomId === 'lab') return (
    <div className="absolute pointer-events-none" style={{ bottom: '14%', left: '8%', right: '8%' }}>
      <div className="w-full h-6 rounded border border-slate-600/25 bg-slate-800/20 flex items-center gap-2 px-2">
        {[...Array(4)].map((_, i) => <div key={i} className="w-2 h-3 rounded-t-full border border-slate-500/30 bg-slate-700/30" />)}
      </div>
    </div>
  )
  if (roomId === 'archive') return (
    <div className="absolute pointer-events-none flex gap-1" style={{ top: '20%', right: '8%' }}>
      {['bg-emerald-800/30', 'bg-emerald-700/20', 'bg-emerald-900/30'].map((c, i) => (
        <div key={i} className={`w-3 h-12 rounded-sm border border-emerald-700/20 ${c}`} />
      ))}
    </div>
  )
  if (roomId === 'common') return (
    <div className="absolute pointer-events-none" style={{ left: '5%', top: '50%', transform: 'translateY(-50%)' }}>
      <div className="w-20 h-7 rounded-full border border-yellow-700/25 bg-yellow-900/10" />
    </div>
  )
  return null
}

// ─── MiniCharacter ────────────────────────────────────────────────────────────

function MiniCharacter({ agent, isWalking, facingLeft, onClick, highlighted }: {
  agent: AgentState; isWalking: boolean; facingLeft: boolean; onClick: () => void; highlighted: boolean
}) {
  const CharSVG = CHARACTER_MAP[agent.name]
  const glow = highlighted
    ? 'drop-shadow(0 0 10px rgba(96,165,250,1)) drop-shadow(0 0 22px rgba(96,165,250,0.55))'
    : GLOW[agent.color]

  return (
    <button
      onClick={onClick}
      className="absolute select-none cursor-pointer focus:outline-none hover:brightness-110 active:scale-95"
      title={`${agent.name} — ${agent.currentRoom === 'great-hall' ? 'return to desk' : 'call to Great Hall'}`}
      style={{
        left: `${getPos(agent).x}%`, top: `${getPos(agent).y}%`,
        transform: 'translate(-50%, -50%)',
        transition: 'left 0.75s cubic-bezier(0.4,0,0.2,1), top 0.75s cubic-bezier(0.4,0,0.2,1)',
        zIndex: highlighted ? 100 : isWalking ? 50 : 10,
        willChange: isWalking ? 'left, top' : 'auto',
      }}
    >
      <div className="flex flex-col items-center">
        <div style={{ height: 14, display: 'flex', alignItems: 'center', marginBottom: 1 }}>
          {highlighted                                  && <span className="status-pulse text-[11px]">💬</span>}
          {!highlighted && agent.status === 'working'    && <span className="status-pulse text-[11px]">💭</span>}
          {!highlighted && agent.status === 'in-meeting' && <span className="status-pulse text-[11px]">🗣️</span>}
          {!highlighted && agent.status === 'away'       && <span className="status-pulse text-[11px] opacity-60">💤</span>}
        </div>
        <div style={{
          transform: facingLeft ? 'scaleX(-1)' : 'scaleX(1)', transition: 'transform 0.12s',
          filter: agent.status === 'away' ? 'grayscale(1) opacity(0.45)' : glow,
        }}>
          {CharSVG && <CharSVG avatar={agent.avatar} isWalking={isWalking} status={agent.status} />}
        </div>
        <div style={{
          width: agent.name === 'HAGRID' ? 44 : 30, height: 5,
          background: 'rgba(0,0,0,0.35)', borderRadius: '50%', marginTop: 1, filter: 'blur(2px)',
        }} />
        <div style={{ marginTop: 2, pointerEvents: 'none' }}>
          <span style={{
            fontSize: 8, fontWeight: 700, color: highlighted ? '#93c5fd' : '#9ca3af',
            background: 'rgba(10,12,20,0.92)', borderRadius: 3, padding: '1px 4px', whiteSpace: 'nowrap',
            border: `1px solid ${highlighted ? 'rgba(96,165,250,0.4)' : 'rgba(42,45,58,0.6)'}`,
            letterSpacing: '0.05em',
          }}>
            {agent.name === 'McGONAGALL' ? 'McGON.' : agent.name.slice(0, 7)}
          </span>
        </div>
      </div>
    </button>
  )
}

function TrackedCharacter({ agent, isMoving, onClick, highlighted }: {
  agent: AgentState; isMoving: boolean; onClick: () => void; highlighted: boolean
}) {
  const pos = getPos(agent)
  const prevPos = useRef(pos)
  const [facingLeft, setFacingLeft] = useState(false)
  useEffect(() => {
    const dx = pos.x - prevPos.current.x
    if (Math.abs(dx) > 0.5) setFacingLeft(dx < 0)
    prevPos.current = pos
  }, [pos.x, pos.y]) // eslint-disable-line react-hooks/exhaustive-deps
  return <MiniCharacter agent={agent} isWalking={isMoving} facingLeft={facingLeft} onClick={onClick} highlighted={highlighted} />
}

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_AGENTS: AgentState[] = AGENTS_DEF.map(a => ({
  name: a.name, role: a.role, homeRoom: a.homeRoom, currentRoom: a.homeRoom,
  status: 'online' as AgentStatus, color: a.color, avatar: a.avatar,
}))

// ─── Shell ────────────────────────────────────────────────────────────────────

export function HogwartsShell() {
  // ── Office state ─────────────────────────────────────────────────────────
  const [agents, setAgents]   = useState<AgentState[]>(INITIAL_AGENTS)
  const [moving, setMoving]   = useState<Set<string>>(new Set())
  const [log, setLog]         = useState<LogEntry[]>([
    { time: format(new Date(), 'HH:mm'), msg: 'All agents online and at their desks.', type: 'status' },
  ])

  // ── Chat state ───────────────────────────────────────────────────────────
  const [question, setQuestion]           = useState('')
  const [answer, setAnswer]               = useState('')
  const [respondingAgent, setRespondingAgent]   = useState('')
  const [respondingColor, setRespondingColor]   = useState('purple')
  const [respondingAvatar, setRespondingAvatar] = useState('')
  const [loading, setLoading]   = useState(false)
  const [chatError, setChatError] = useState('')
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [responseId, setResponseId]   = useState(0)

  // When a new response arrives → agent walks to Great Hall and starts talking
  useEffect(() => {
    if (!respondingAgent || responseId === 0) return
    startMoving([respondingAgent])
    setAgents(p => p.map(a =>
      a.name === respondingAgent ? { ...a, currentRoom: 'great-hall', status: 'in-meeting' } : a
    ))
    pushLog(`${respondingAgent} stepped up to respond.`, 'chat')
    const tid = setTimeout(() => {
      startMoving([respondingAgent])
      setAgents(p => p.map(a =>
        a.name === respondingAgent ? { ...a, currentRoom: a.homeRoom, status: 'online' } : a
      ))
      pushLog(`${respondingAgent} returned to their desk.`, 'move')
    }, 20000)
    return () => clearTimeout(tid)
  }, [responseId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Office helpers ────────────────────────────────────────────────────────
  function pushLog(msg: string, type: LogEntry['type']) {
    setLog(p => [{ time: format(new Date(), 'HH:mm:ss'), msg, type }, ...p].slice(0, 50))
  }
  function startMoving(names: string[]) {
    setMoving(p => new Set([...p, ...names]))
    setTimeout(() => setMoving(p => { const n = new Set(p); names.forEach(x => n.delete(x)); return n }), 800)
  }
  function handleAgentClick(name: string) {
    const agent = agents.find(a => a.name === name)!
    startMoving([name])
    if (agent.currentRoom === 'great-hall') {
      setAgents(p => p.map(a => a.name === name ? { ...a, currentRoom: a.homeRoom, status: 'online' } : a))
      pushLog(`${name} walked back to ${ROOMS[agent.homeRoom].label}.`, 'move')
    } else {
      setAgents(p => p.map(a => a.name === name ? { ...a, currentRoom: 'great-hall', status: 'in-meeting' } : a))
      pushLog(`${name} walked to the Great Hall.`, 'move')
    }
  }
  function assembleMeeting() {
    startMoving(agents.map(a => a.name))
    setAgents(p => p.map(a => ({ ...a, currentRoom: 'great-hall', status: 'in-meeting' })))
    pushLog('Full team assembled in the Great Hall.', 'meeting')
  }
  function dismissMeeting() {
    const names = agents.filter(a => a.currentRoom === 'great-hall').map(a => a.name)
    if (!names.length) return
    startMoving(names)
    setAgents(p => p.map(a => ({ ...a, currentRoom: a.homeRoom, status: 'online' })))
    pushLog('Meeting dismissed — agents back to desks.', 'meeting')
  }
  function simulateWork() {
    const workers = ['HERMIONE', 'HARRY', 'SNAPE']
    setAgents(p => p.map(a => workers.includes(a.name) ? { ...a, status: 'working' } : a))
    pushLog('HERMIONE, HARRY and SNAPE are working on tasks.', 'status')
    setTimeout(() => setAgents(p => p.map(a => a.status === 'working' ? { ...a, status: 'online' } : a)), 6000)
  }

  // ── Chat helpers ──────────────────────────────────────────────────────────
  function mentionAgent(name: string) {
    setQuestion(`@${name.toLowerCase()} `)
    setActiveAgent(name)
    setTimeout(() => { const el = document.getElementById('hw-input'); if (el) (el as HTMLInputElement).focus() }, 50)
  }

  async function ask() {
    if (!question.trim() || loading) return
    setLoading(true); setChatError(''); setAnswer(''); setRespondingAgent(''); setActiveAgent(null)
    const q = question
    pushLog(`You: "${q.slice(0, 60)}${q.length > 60 ? '…' : ''}"`, 'chat')
    try {
      const res  = await fetch('/api/agents/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }) })
      const data = await res.json()
      if (data.error) {
        setChatError(data.error)
      } else {
        setAnswer(data.answer)
        const agentName = data.agent ?? 'DUMBLEDORE'
        setRespondingAgent(agentName)
        setRespondingColor(data.color ?? 'purple')
        setRespondingAvatar(AGENTS_DEF.find(a => a.name === agentName)?.avatar ?? '')
        setResponseId(p => p + 1)
      }
    } catch (err) { setChatError(String(err)) }
    finally { setLoading(false) }
  }

  const onlineCount    = agents.filter(a => a.status !== 'away').length
  const inMeetingCount = agents.filter(a => a.currentRoom === 'great-hall').length

  return (
    <div className="h-screen flex flex-col bg-[#0f1117] overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-[#13151e] border-b border-[#2a2d3a] px-5 py-2.5 z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-gray-100">Dashboard</h1>
            <span className="text-sm text-gray-500 hidden sm:block">{format(new Date(), 'EEEE, MMMM d')}</span>
            <NavTabs active="hogwarts" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-900/20 border border-green-800/40 rounded-lg px-2 py-1">
              <Wifi size={10} /> {onlineCount}/7 online
            </div>
            {inMeetingCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-900/20 border border-blue-800/40 rounded-lg px-2 py-1">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" /> {inMeetingCount} in meeting
              </div>
            )}
            <button onClick={simulateWork}   className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 border border-amber-800/50 bg-amber-900/20 rounded-lg px-2 py-1 transition-colors"><Zap size={10} /> Work</button>
            <button onClick={assembleMeeting} className="flex items-center gap-1 text-xs text-blue-400  hover:text-blue-300  border border-blue-800/50  bg-blue-900/20  rounded-lg px-2 py-1 transition-colors"><Users size={10} /> Meet</button>
            <button onClick={dismissMeeting}  className="flex items-center gap-1 text-xs text-gray-400  hover:text-gray-300  border border-[#2a2d3a]    bg-[#1a1d27]    rounded-lg px-2 py-1 transition-colors"><RotateCcw size={10} /> Dismiss</button>
          </div>
        </div>
      </header>

      {/* ── Main canvas ─────────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 flex gap-3 p-3">

        {/* ── Floor plan ────────────────────────────────────────────────────── */}
        <div
          className="flex-1 min-w-0 relative rounded-xl overflow-hidden border border-[#2a2d3a]"
          style={{
            background: '#0b0d14',
            backgroundImage: 'radial-gradient(circle, #1a1d2a 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          {/* Room zones */}
          {(Object.entries(ROOMS) as [RoomId, RoomConfig][]).map(([roomId, room]) => {
            const occupants = agents.filter(a => a.currentRoom === roomId)
            const isLive    = roomId === 'great-hall' && occupants.length > 0
            return (
              <div
                key={roomId}
                className={`absolute rounded-lg border transition-all duration-500 ${room.bg} ${room.border} ${isLive ? 'shadow-xl shadow-blue-500/20' : ''}`}
                style={{ ...room.style, margin: 4, width: `calc(${room.style.width} - 8px)`, height: `calc(${room.style.height} - 8px)` }}
              >
                <div className="absolute top-2 left-3 flex items-center gap-1.5 pointer-events-none z-10">
                  <span className="text-xs leading-none">{room.emoji}</span>
                  <div>
                    <p className={`text-[10px] font-bold tracking-wide ${room.textColor}`}>{room.label}</p>
                    <p className="text-[8px] text-gray-700 uppercase tracking-widest">{room.sublabel}</p>
                  </div>
                  {isLive && (
                    <span className="flex items-center gap-0.5 text-[8px] text-blue-400 bg-blue-900/40 rounded px-1 border border-blue-800/40 ml-1">
                      <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" /> LIVE
                    </span>
                  )}
                </div>
                <Furniture roomId={roomId} occupied={occupants.length > 0} />
              </div>
            )
          })}

          {/* Dividers */}
          {[
            { left: '22%', top: '2%',  width: 1,     height: '40%' },
            { left: '64%', top: '2%',  width: 1,     height: '40%' },
            { left: '28%', top: '46%', width: 1,     height: '34%' },
            { left: '64%', top: '46%', width: 1,     height: '34%' },
            { left: '2%',  top: '82%', width: '96%', height: 1     },
          ].map((d, i) => (
            <div key={i} className="absolute pointer-events-none"
              style={{ ...d, background: 'linear-gradient(to bottom, transparent, #2a2d3a55, transparent)' }} />
          ))}

          {/* Characters */}
          {agents.map(agent => (
            <TrackedCharacter
              key={agent.name}
              agent={agent}
              isMoving={moving.has(agent.name)}
              onClick={() => handleAgentClick(agent.name)}
              highlighted={agent.name === respondingAgent && !!answer}
            />
          ))}
        </div>

        {/* ── Right panel ───────────────────────────────────────────────────── */}
        <div className="w-[376px] flex-shrink-0 flex flex-col gap-2">

          {/* Agent roster */}
          <div className="flex-shrink-0 bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-2.5">
            <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Hogwarts AI Taskforce — click to chat
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {AGENTS_DEF.map(agent => {
                const live = agents.find(a => a.name === agent.name)!
                return (
                  <button
                    key={agent.name}
                    onClick={() => mentionAgent(agent.name)}
                    className={`rounded-lg border p-1.5 text-left transition-all duration-150 hover:scale-[1.03] hover:shadow-md cursor-pointer
                      ${COLOR_MAP[agent.color]}
                      ${activeAgent === agent.name ? 'ring-2 ring-offset-1 ring-offset-[#1a1d27] ' + RING_MAP[agent.color] : ''}
                    `}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="relative flex-shrink-0">
                        <AgentAvatar avatar={agent.avatar} name={agent.name} color={agent.color} size={24} />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-[#1a1d27] ${
                          live.status === 'online'     ? 'bg-green-400' :
                          live.status === 'working'    ? 'bg-amber-400 animate-pulse' :
                          live.status === 'in-meeting' ? 'bg-blue-400' : 'bg-gray-600'
                        }`} />
                      </div>
                      <p className="text-[9px] font-bold leading-tight truncate">
                        {agent.name === 'McGONAGALL' ? 'McGON.' : agent.name.slice(0, 7)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-0.5">
                      {agent.commands.slice(0, 1).map(cmd => (
                        <span key={cmd} className={`text-[8px] px-1 py-0.5 rounded font-mono ${BADGE_MAP[agent.color]}`}>{cmd}</span>
                      ))}
                    </div>
                  </button>
                )
              })}
              {/* Discord shortcut */}
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer"
                className="rounded-lg border border-indigo-800/40 bg-indigo-900/20 p-1.5 flex flex-col items-center justify-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors">
                <span className="text-[15px]">💬</span>
                <span className="text-[8px] font-semibold">Discord</span>
              </a>
            </div>
          </div>

          {/* Chat response area */}
          <div className="flex-1 min-h-0 bg-[#1a1d27] rounded-xl border border-[#2a2d3a] overflow-y-auto p-3
            [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">
            {!answer && !chatError && !loading && (
              <div className="flex flex-col items-center justify-center h-full gap-2.5 text-center">
                <Image src="/agents/Hogwarts_Cyborg.png" alt="Hogwarts" width={40} height={40}
                  className="rounded-xl object-cover object-top opacity-40" />
                <p className="text-xs text-gray-600 leading-relaxed">
                  Ask a question below.<br />
                  Watch the agent come alive<br />in the office.
                </p>
              </div>
            )}
            {loading && (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <Loader2 size={22} className="animate-spin text-purple-500 opacity-70" />
                <p className="text-xs text-gray-600">Consulting agents…</p>
              </div>
            )}
            {chatError && !loading && (
              <div className="rounded-lg border border-red-800/40 bg-red-900/20 p-3 text-xs text-red-300">⚠️ {chatError}</div>
            )}
            {answer && !loading && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 pb-2.5 border-b border-[#2a2d3a]">
                  {respondingAvatar && <AgentAvatar avatar={respondingAvatar} name={respondingAgent} color={respondingColor} size={28} />}
                  <div>
                    <span className={`font-bold text-[11px] uppercase tracking-wider ${TEXT_MAP[respondingColor] ?? 'text-purple-300'}`}>{respondingAgent}</span>
                    <span className="text-[10px] text-gray-600 ml-1.5">{AGENTS_DEF.find(a => a.name === respondingAgent)?.role}</span>
                  </div>
                  <span className="ml-auto text-[9px] text-blue-400 bg-blue-900/20 border border-blue-800/30 rounded px-1.5 py-0.5">responding</span>
                </div>
                <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{answer}</div>
              </div>
            )}
          </div>

          {/* Activity log */}
          <div className="flex-shrink-0 h-[76px] bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-2 overflow-y-auto
            [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a]">
            <p className="text-[8px] font-semibold text-gray-700 uppercase tracking-wider mb-1">Activity</p>
            {log.map((entry, i) => (
              <div key={i} className="flex gap-1.5 mb-0.5">
                <span className="text-[7px] text-gray-700 font-mono mt-0.5 flex-shrink-0">{entry.time}</span>
                <p className={`text-[9px] leading-snug ${
                  entry.type === 'chat'    ? 'text-purple-400' :
                  entry.type === 'meeting' ? 'text-blue-400'   :
                  entry.type === 'move'    ? 'text-amber-500'  : 'text-gray-500'
                }`}>{entry.msg}</p>
              </div>
            ))}
          </div>

          {/* Chat input */}
          <div className="flex-shrink-0 flex gap-2">
            <input
              id="hw-input"
              type="text"
              value={question}
              onChange={e => { setQuestion(e.target.value); if (!e.target.value.startsWith('@')) setActiveAgent(null) }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() } }}
              placeholder="@mention an agent or ask anything…"
              className="flex-1 bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-700/60 transition-colors"
            />
            <button
              onClick={ask}
              disabled={loading || !question.trim()}
              className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 border border-purple-800/50 hover:border-purple-700/60 bg-purple-900/20 rounded-lg px-3 py-2 transition-colors disabled:opacity-40"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              {loading ? 'Asking…' : 'Ask'}
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}
