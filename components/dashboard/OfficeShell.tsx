'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { NavTabs } from './NavTabs'
import { Users, Zap, RotateCcw, Wifi, WifiOff } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type RoomId = 'headmaster' | 'great-hall' | 'lab' | 'operations' | 'creative' | 'archive' | 'common'
type AgentStatus = 'online' | 'working' | 'in-meeting' | 'away'

interface Pos { x: number; y: number }

interface AgentState {
  name: string
  role: string
  homeRoom: RoomId
  currentRoom: RoomId
  status: AgentStatus
  color: string
  avatar: string
}

// ─── Position Maps ────────────────────────────────────────────────────────────
// All values are % of the floor-plan container (left / top)

const DESK_POS: Record<string, Pos> = {
  DUMBLEDORE: { x: 10,  y: 23  },
  SNAPE:      { x: 82,  y: 23  },
  HERMIONE:   { x: 13,  y: 63  },
  HARRY:      { x: 35,  y: 63  },
  RON:        { x: 46,  y: 71  },
  McGONAGALL: { x: 75,  y: 63  },
  HAGRID:     { x: 12,  y: 90  },
}

// Conference-table seats inside Great Hall
const MEETING_POS: Record<string, Pos> = {
  DUMBLEDORE: { x: 32,  y: 13  },
  HERMIONE:   { x: 39,  y: 13  },
  HARRY:      { x: 46,  y: 13  },
  RON:        { x: 53,  y: 13  },
  McGONAGALL: { x: 35,  y: 31  },
  SNAPE:      { x: 46,  y: 33  },
  HAGRID:     { x: 56,  y: 22  },
}

function getPos(agent: AgentState): Pos {
  return agent.currentRoom === 'great-hall'
    ? MEETING_POS[agent.name]
    : DESK_POS[agent.name]
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

interface RoomConfig {
  label: string; sublabel: string; emoji: string
  style: React.CSSProperties
  border: string; bg: string; textColor: string
  isMeeting?: boolean
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
    border: 'border-blue-600/60', bg: 'bg-blue-950/30', textColor: 'text-blue-300',
    isMeeting: true,
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

// ─── Furniture decorations ────────────────────────────────────────────────────

function Furniture({ roomId, hasAgents }: { roomId: RoomId; hasAgents: boolean }) {
  if (roomId === 'great-hall') return (
    // Conference table
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className={`rounded-xl border-2 transition-colors duration-500 ${
        hasAgents ? 'border-blue-500/40 bg-blue-900/20 shadow-lg shadow-blue-500/20' : 'border-[#2a2d3a] bg-[#1a1d27]/40'
      }`} style={{ width: '60%', height: '45%', marginTop: '5%' }} />
    </div>
  )
  if (roomId === 'headmaster') return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-6 rounded border border-purple-700/30 bg-purple-900/20 pointer-events-none" />
  )
  if (roomId === 'operations') return (
    <div className="absolute bottom-4 right-4 w-12 h-8 rounded border border-amber-700/20 bg-amber-900/10 pointer-events-none" />
  )
  if (roomId === 'creative') return (
    <div className="absolute bottom-4 right-4 w-16 h-6 rounded border border-orange-700/20 bg-orange-900/10 pointer-events-none" />
  )
  if (roomId === 'lab') return (
    <div className="absolute bottom-3 left-3 right-3 h-5 rounded border border-slate-600/20 bg-slate-800/20 pointer-events-none" />
  )
  if (roomId === 'archive') return (
    <div className="absolute top-8 right-3 w-4 h-14 rounded-sm border border-emerald-700/20 bg-emerald-900/10 pointer-events-none" />
  )
  if (roomId === 'common') return (
    <div className="absolute left-6 top-1/2 -translate-y-1/2 w-20 h-6 rounded-full border border-yellow-700/20 bg-yellow-900/10 pointer-events-none" />
  )
  return null
}

// ─── Agent Token ──────────────────────────────────────────────────────────────

const GLOW: Record<string, string>  = {
  purple: '0 0 14px rgba(168,85,247,0.5)',
  amber:  '0 0 14px rgba(251,191,36,0.5)',
  red:    '0 0 14px rgba(239,68,68,0.5)',
  orange: '0 0 14px rgba(249,115,22,0.5)',
  green:  '0 0 14px rgba(52,211,153,0.5)',
  slate:  '0 0 14px rgba(148,163,184,0.4)',
  brown:  '0 0 14px rgba(234,179,8,0.4)',
}

const STATUS_RING: Record<AgentStatus, string> = {
  online:       'ring-2 ring-green-400/80',
  working:      'ring-2 ring-amber-400 animate-pulse',
  'in-meeting': 'ring-2 ring-blue-400',
  away:         'ring-1 ring-gray-600 grayscale opacity-50',
}

const STATUS_DOT: Record<AgentStatus, string> = {
  online:       'bg-green-400',
  working:      'bg-amber-400 animate-pulse',
  'in-meeting': 'bg-blue-400',
  away:         'bg-gray-600',
}

function AgentToken({
  agent,
  isMoving,
  onClick,
}: {
  agent: AgentState
  isMoving: boolean
  onClick: () => void
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const pos = getPos(agent)

  return (
    <div
      className="absolute"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: 'translate(-50%, -50%)',
        transition: 'left 0.7s cubic-bezier(0.4,0,0.2,1), top 0.7s cubic-bezier(0.4,0,0.2,1)',
        zIndex: agent.status === 'in-meeting' ? 20 : 10,
      }}
    >
      <button
        onClick={onClick}
        title={`${agent.name} — click to ${agent.currentRoom === 'great-hall' ? 'send back to desk' : 'call to meeting'}`}
        className={`
          relative block rounded-full cursor-pointer
          transition-shadow duration-300
          ${STATUS_RING[agent.status]}
          ${isMoving ? 'agent-walking' : 'hover:scale-110 hover:z-30'}
          focus:outline-none
        `}
        style={{
          width: 48, height: 48,
          boxShadow: agent.status !== 'away' ? GLOW[agent.color] : undefined,
        }}
      >
        {imgFailed ? (
          <div className="w-full h-full rounded-full bg-[#2a2d3a] flex items-center justify-center text-xs font-bold text-gray-300">
            {agent.name[0]}
          </div>
        ) : (
          <Image
            src={agent.avatar}
            alt={agent.name}
            width={48}
            height={48}
            className="rounded-full object-cover object-top w-full h-full"
            onError={() => setImgFailed(true)}
          />
        )}
        {/* Status dot */}
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0f1117] ${STATUS_DOT[agent.status]}`} />
      </button>

      {/* Name tag */}
      <div className="mt-1 text-center pointer-events-none">
        <span className="text-[8px] font-bold tracking-wide text-gray-400 bg-[#0f1117]/80 rounded px-1 py-0.5 whitespace-nowrap">
          {agent.name === 'McGONAGALL' ? 'McGON.' : agent.name.slice(0, 7)}
        </span>
      </div>
    </div>
  )
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

interface LogEntry { time: string; msg: string; type: 'move' | 'status' | 'meeting' }

// ─── Main Shell ───────────────────────────────────────────────────────────────

const INITIAL_AGENTS: AgentState[] = [
  { name: 'DUMBLEDORE', role: 'Chief of Staff',        homeRoom: 'headmaster',  currentRoom: 'headmaster',  status: 'online', color: 'purple', avatar: '/agents/DUMBLEDORE_Cyborg.png' },
  { name: 'HERMIONE',   role: 'Production Controller', homeRoom: 'operations',  currentRoom: 'operations',  status: 'online', color: 'amber',  avatar: '/agents/HERMIONE_Cyborg.png'   },
  { name: 'HARRY',      role: 'Creative Review',       homeRoom: 'creative',    currentRoom: 'creative',    status: 'online', color: 'red',    avatar: '/agents/HARRY_Cyborg.png'      },
  { name: 'RON',        role: 'Strategic Ideation',    homeRoom: 'creative',    currentRoom: 'creative',    status: 'online', color: 'orange', avatar: '/agents/RON_Cyborg.png'        },
  { name: 'McGONAGALL', role: 'SOP Builder',           homeRoom: 'archive',     currentRoom: 'archive',     status: 'online', color: 'green',  avatar: '/agents/McGONAGALL_Cyborg.png' },
  { name: 'SNAPE',      role: 'AI Scout',              homeRoom: 'lab',         currentRoom: 'lab',         status: 'online', color: 'slate',  avatar: '/agents/SNAPE_Cyborg.png'      },
  { name: 'HAGRID',     role: 'People Manager',        homeRoom: 'common',      currentRoom: 'common',      status: 'online', color: 'brown',  avatar: '/agents/HAGRID_Cyborg.png'     },
]

export function OfficeShell() {
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENTS)
  const [moving, setMoving] = useState<Set<string>>(new Set())
  const [log, setLog] = useState<LogEntry[]>([
    { time: format(new Date(), 'HH:mm'), msg: 'All agents online.', type: 'status' },
  ])

  function pushLog(msg: string, type: LogEntry['type']) {
    setLog(prev => [{ time: format(new Date(), 'HH:mm:ss'), msg, type }, ...prev].slice(0, 30))
  }

  function startMove(names: string[]) {
    setMoving(prev => new Set([...prev, ...names]))
    setTimeout(() => {
      setMoving(prev => {
        const next = new Set(prev)
        names.forEach(n => next.delete(n))
        return next
      })
    }, 750)
  }

  function handleAgentClick(name: string) {
    const agent = agents.find(a => a.name === name)!
    if (agent.currentRoom === 'great-hall') {
      startMove([name])
      setAgents(prev => prev.map(a => a.name === name
        ? { ...a, currentRoom: a.homeRoom, status: 'online' }
        : a
      ))
      pushLog(`${name} returned to ${ROOMS[agent.homeRoom].label}.`, 'move')
    } else {
      startMove([name])
      setAgents(prev => prev.map(a => a.name === name
        ? { ...a, currentRoom: 'great-hall', status: 'in-meeting' }
        : a
      ))
      pushLog(`${name} walked to Great Hall.`, 'move')
    }
  }

  function assembleMeeting() {
    const names = agents.map(a => a.name)
    startMove(names)
    setAgents(prev => prev.map(a => ({ ...a, currentRoom: 'great-hall', status: 'in-meeting' })))
    pushLog('Full team meeting — all agents called to Great Hall.', 'meeting')
  }

  function dismissMeeting() {
    const inMeeting = agents.filter(a => a.currentRoom === 'great-hall').map(a => a.name)
    if (!inMeeting.length) return
    startMove(inMeeting)
    setAgents(prev => prev.map(a => ({ ...a, currentRoom: a.homeRoom, status: 'online' })))
    pushLog('Meeting dismissed — agents returning to desks.', 'meeting')
  }

  function simulateWork() {
    const workers = ['HERMIONE', 'HARRY', 'SNAPE']
    setAgents(prev => prev.map(a => workers.includes(a.name) ? { ...a, status: 'working' } : a))
    pushLog('HERMIONE, HARRY and SNAPE are working on tasks.', 'status')
    setTimeout(() => {
      setAgents(prev => prev.map(a => a.status === 'working' ? { ...a, status: 'online' } : a))
      pushLog('Work burst complete.', 'status')
    }, 6000)
  }

  function toggleAway(name: string) {
    setAgents(prev => prev.map(a => {
      if (a.name !== name) return a
      const next = a.status === 'away' ? 'online' : 'away'
      pushLog(`${name} is now ${next === 'away' ? 'away' : 'back online'}.`, 'status')
      return { ...a, status: next }
    }))
  }

  const inMeetingCount = agents.filter(a => a.currentRoom === 'great-hall').length
  const onlineCount = agents.filter(a => a.status !== 'away').length

  return (
    <div className="h-screen flex flex-col bg-[#0f1117] overflow-hidden">

      {/* Header */}
      <header className="flex-shrink-0 bg-[#13151e] border-b border-[#2a2d3a] px-6 py-3 z-10">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-semibold text-gray-100">Dashboard</h1>
              <span className="text-sm text-gray-500 hidden sm:block">{format(new Date(), 'EEEE, MMMM d')}</span>
            </div>
            <NavTabs active="office" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-900/20 border border-green-800/40 rounded-lg px-2.5 py-1.5">
              <Wifi size={11} />
              {onlineCount}/7 Online
            </div>
            {inMeetingCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-900/20 border border-blue-800/40 rounded-lg px-2.5 py-1.5">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                {inMeetingCount} in meeting
              </div>
            )}
            <button onClick={simulateWork} className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 border border-amber-800/50 bg-amber-900/20 rounded-lg px-2.5 py-1.5 transition-colors">
              <Zap size={11} /> Simulate Work
            </button>
            <button onClick={assembleMeeting} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-800/50 bg-blue-900/20 rounded-lg px-2.5 py-1.5 transition-colors">
              <Users size={11} /> Full Meeting
            </button>
            <button onClick={dismissMeeting} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300 border border-[#2a2d3a] bg-[#1a1d27] rounded-lg px-2.5 py-1.5 transition-colors">
              <RotateCcw size={11} /> Dismiss
            </button>
          </div>
        </div>
      </header>

      {/* Main canvas */}
      <main className="flex-1 min-h-0 flex gap-3 p-4">

        {/* ── Floor Plan ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 relative rounded-xl overflow-hidden border border-[#2a2d3a]"
          style={{
            background: '#0b0d14',
            backgroundImage: 'radial-gradient(circle, #1e2130 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        >
          {/* Room zones */}
          {(Object.entries(ROOMS) as [RoomId, RoomConfig][]).map(([roomId, room]) => {
            const occupants = agents.filter(a => a.currentRoom === roomId)
            const isActive = roomId === 'great-hall' && occupants.length > 0
            return (
              <div
                key={roomId}
                className={`absolute rounded-lg border transition-all duration-500 ${room.bg} ${room.border} ${
                  isActive ? 'shadow-xl shadow-blue-500/20' : ''
                }`}
                style={{ ...room.style, margin: '4px', width: `calc(${room.style.width} - 8px)`, height: `calc(${room.style.height} - 8px)` }}
              >
                {/* Room label */}
                <div className="absolute top-2 left-3 flex items-center gap-1.5 pointer-events-none">
                  <span className="text-sm leading-none">{room.emoji}</span>
                  <div>
                    <p className={`text-[10px] font-bold tracking-wide leading-tight ${room.textColor}`}>{room.label}</p>
                    <p className="text-[8px] text-gray-700 uppercase tracking-widest">{room.sublabel}</p>
                  </div>
                  {isActive && (
                    <span className="flex items-center gap-0.5 text-[8px] text-blue-400 bg-blue-900/40 rounded px-1 py-0.5 border border-blue-800/40 ml-1">
                      <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" /> LIVE
                    </span>
                  )}
                </div>

                {/* Furniture */}
                <Furniture roomId={roomId} hasAgents={occupants.length > 0} />
              </div>
            )
          })}

          {/* Hallway dividers — subtle lines */}
          <div className="absolute pointer-events-none" style={{ left: '22%', top: '2%', width: '1px', height: '40%', background: 'linear-gradient(to bottom, transparent, #2a2d3a, transparent)' }} />
          <div className="absolute pointer-events-none" style={{ left: '64%', top: '2%', width: '1px', height: '40%', background: 'linear-gradient(to bottom, transparent, #2a2d3a, transparent)' }} />
          <div className="absolute pointer-events-none" style={{ left: '28%', top: '46%', width: '1px', height: '34%', background: 'linear-gradient(to bottom, transparent, #2a2d3a, transparent)' }} />
          <div className="absolute pointer-events-none" style={{ left: '64%', top: '46%', width: '1px', height: '34%', background: 'linear-gradient(to bottom, transparent, #2a2d3a, transparent)' }} />
          <div className="absolute pointer-events-none" style={{ left: '2%', top: '82%', width: '96%', height: '1px', background: 'linear-gradient(to right, transparent, #2a2d3a, transparent)' }} />

          {/* Agent tokens — absolutely positioned, animated */}
          {agents.map(agent => (
            <AgentToken
              key={agent.name}
              agent={agent}
              isMoving={moving.has(agent.name)}
              onClick={() => handleAgentClick(agent.name)}
            />
          ))}
        </div>

        {/* ── Right Sidebar ──────────────────────────────────────── */}
        <div className="w-[200px] flex-shrink-0 flex flex-col gap-3">

          {/* Agent status list */}
          <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-3 flex flex-col gap-2">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Team</p>
            {agents.map(agent => (
              <div key={agent.name} className="flex items-center gap-2">
                <div className="relative flex-shrink-0">
                  <Image
                    src={agent.avatar}
                    alt={agent.name}
                    width={24}
                    height={24}
                    className="rounded-full object-cover object-top"
                  />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#1a1d27] ${
                    agent.status === 'online' ? 'bg-green-400' :
                    agent.status === 'working' ? 'bg-amber-400' :
                    agent.status === 'in-meeting' ? 'bg-blue-400' : 'bg-gray-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-gray-300 truncate">{agent.name === 'McGONAGALL' ? 'McGONAGALL' : agent.name}</p>
                  <p className={`text-[8px] truncate ${
                    agent.status === 'online' ? 'text-green-600' :
                    agent.status === 'working' ? 'text-amber-500' :
                    agent.status === 'in-meeting' ? 'text-blue-400' : 'text-gray-600'
                  }`}>
                    {agent.currentRoom === 'great-hall' ? '📍 Great Hall' : `📍 ${ROOMS[agent.currentRoom].label.split(' ').slice(0,2).join(' ')}`}
                  </p>
                </div>
                <button onClick={() => toggleAway(agent.name)} className="text-gray-700 hover:text-gray-400 transition-colors flex-shrink-0">
                  {agent.status === 'away' ? <WifiOff size={9} /> : <Wifi size={9} />}
                </button>
              </div>
            ))}
          </div>

          {/* Activity log */}
          <div className="flex-1 min-h-0 bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-3 flex flex-col gap-2 overflow-hidden">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex-shrink-0">Activity</p>
            <div className="overflow-y-auto flex flex-col gap-1.5 [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a]">
              {log.map((entry, i) => (
                <div key={i} className="flex gap-1.5">
                  <span className="text-[7px] text-gray-700 font-mono flex-shrink-0 mt-0.5 leading-snug">{entry.time}</span>
                  <p className={`text-[9px] leading-snug ${
                    entry.type === 'meeting' ? 'text-blue-400' :
                    entry.type === 'move' ? 'text-amber-500' : 'text-gray-500'
                  }`}>{entry.msg}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hint */}
          <p className="text-[9px] text-gray-700 text-center leading-snug px-2">
            Click any agent to move them to/from the Great Hall meeting room
          </p>
        </div>
      </main>
    </div>
  )
}
