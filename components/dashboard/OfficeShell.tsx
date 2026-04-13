'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { NavTabs } from './NavTabs'
import { Users, Zap, RotateCcw, Wifi, WifiOff } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type RoomId = 'headmaster' | 'great-hall' | 'lab' | 'operations' | 'creative' | 'archive' | 'common'
type AgentStatus = 'online' | 'working' | 'in-meeting' | 'away'
interface Pos { x: number; y: number }

interface AgentState {
  name: string; role: string
  homeRoom: RoomId; currentRoom: RoomId
  status: AgentStatus; color: string; avatar: string
}

// ─── Position maps (% of floor-plan container) ───────────────────────────────

const DESK_POS: Record<string, Pos> = {
  DUMBLEDORE: { x: 10,  y: 25  },
  SNAPE:      { x: 82,  y: 25  },
  HERMIONE:   { x: 13,  y: 64  },
  HARRY:      { x: 35,  y: 63  },
  RON:        { x: 46,  y: 72  },
  McGONAGALL: { x: 76,  y: 63  },
  HAGRID:     { x: 12,  y: 91  },
}

// Seats around the conference table in Great Hall
const MEETING_POS: Record<string, Pos> = {
  DUMBLEDORE: { x: 30,  y: 13  },
  HERMIONE:   { x: 38,  y: 13  },
  HARRY:      { x: 46,  y: 13  },
  RON:        { x: 54,  y: 13  },
  McGONAGALL: { x: 34,  y: 32  },
  SNAPE:      { x: 46,  y: 34  },
  HAGRID:     { x: 57,  y: 23  },
}

function getPos(agent: AgentState): Pos {
  return agent.currentRoom === 'great-hall' ? MEETING_POS[agent.name] : DESK_POS[agent.name]
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

// ─── Agent colour maps ────────────────────────────────────────────────────────

const OUTFIT: Record<string, { body: string; pants: string; skin: string }> = {
  purple: { body: '#7c3aed', pants: '#4c1d95', skin: '#e2b896' },
  amber:  { body: '#d97706', pants: '#92400e', skin: '#e2c4a0' },
  red:    { body: '#dc2626', pants: '#7f1d1d', skin: '#e2b896' },
  orange: { body: '#ea580c', pants: '#7c2d12', skin: '#e2b896' },
  green:  { body: '#059669', pants: '#064e3b', skin: '#e2c4a0' },
  slate:  { body: '#475569', pants: '#1e293b', skin: '#c8c8c8' },
  brown:  { body: '#92400e', pants: '#451a03', skin: '#c8a060' },
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

// ─── Mini Character SVG ───────────────────────────────────────────────────────

function MiniCharacter({
  agent,
  isWalking,
  facingLeft,
  onClick,
}: {
  agent: AgentState
  isWalking: boolean
  facingLeft: boolean
  onClick: () => void
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const outfit = OUTFIT[agent.color]

  const headSize = 26
  const bodyW = 18
  const bodyH = 16
  const legW = 7
  const legH = 15
  const armW = 5
  const armH = 12
  const totalW = bodyW + armW * 2 + 4
  const totalH = headSize + bodyH + legH + 4

  return (
    <button
      onClick={onClick}
      className={`
        absolute select-none cursor-pointer focus:outline-none group
        transition-[left,top] duration-[750ms] ease-[cubic-bezier(0.4,0,0.2,1)]
      `}
      style={{
        left: `${getPos(agent).x}%`,
        top: `${getPos(agent).y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: isWalking ? 50 : 10,
        // Use will-change for GPU acceleration of the movement
        willChange: isWalking ? 'left, top' : 'auto',
      }}
      title={`${agent.name} — click to ${agent.currentRoom === 'great-hall' ? 'return to desk' : 'call to meeting'}`}
    >
      <div className="flex flex-col items-center gap-0">

        {/* Status bubble above head */}
        <div className="h-4 flex items-center justify-center mb-0.5">
          {agent.status === 'working' && (
            <span className="text-[10px] status-pulse">💭</span>
          )}
          {agent.status === 'in-meeting' && (
            <span className="text-[10px] status-pulse">🗣️</span>
          )}
          {agent.status === 'away' && (
            <span className="text-[10px] status-pulse opacity-60">💤</span>
          )}
        </div>

        {/* The character — flip horizontally if walking left */}
        <div
          className={isWalking ? 'agent-walking' : ''}
          style={{
            transform: facingLeft ? 'scaleX(-1)' : 'scaleX(1)',
            transition: 'transform 0.15s',
            filter: agent.status !== 'away' ? GLOW[agent.color] : 'grayscale(1) opacity(0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Head — portrait image */}
          <div
            className={`rounded-full overflow-hidden border-2 flex-shrink-0 ${
              agent.status === 'online'      ? 'border-green-400' :
              agent.status === 'working'     ? 'border-amber-400' :
              agent.status === 'in-meeting'  ? 'border-blue-400'  :
                                               'border-gray-600'
            }`}
            style={{ width: headSize, height: headSize }}
          >
            {imgFailed ? (
              <div
                className="w-full h-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: outfit.body, color: '#fff' }}
              >
                {agent.name[0]}
              </div>
            ) : (
              <Image
                src={agent.avatar}
                alt={agent.name}
                width={headSize}
                height={headSize}
                className="object-cover object-top w-full h-full"
                onError={() => setImgFailed(true)}
              />
            )}
          </div>

          {/* Torso + arms row */}
          <div className="flex items-center" style={{ marginTop: 1 }}>
            {/* Left arm */}
            <div
              className="arm-left rounded-full flex-shrink-0"
              style={{
                width: armW, height: armH,
                background: outfit.body,
                borderRadius: 3,
                transformOrigin: 'top center',
                marginRight: 1,
                marginTop: 2,
              }}
            />
            {/* Body */}
            <div
              className="char-body rounded-sm flex-shrink-0"
              style={{
                width: bodyW, height: bodyH,
                background: outfit.body,
                borderRadius: '3px 3px 2px 2px',
              }}
            />
            {/* Right arm */}
            <div
              className="arm-right rounded-full flex-shrink-0"
              style={{
                width: armW, height: armH,
                background: outfit.body,
                borderRadius: 3,
                transformOrigin: 'top center',
                marginLeft: 1,
                marginTop: 2,
              }}
            />
          </div>

          {/* Legs row */}
          <div className="flex gap-[2px]" style={{ marginTop: 1 }}>
            <div
              className="leg-left"
              style={{
                width: legW, height: legH,
                background: outfit.pants,
                borderRadius: '2px 2px 4px 4px',
                transformOrigin: 'top center',
              }}
            />
            <div
              className="leg-right"
              style={{
                width: legW, height: legH,
                background: outfit.pants,
                borderRadius: '2px 2px 4px 4px',
                transformOrigin: 'top center',
              }}
            />
          </div>
        </div>

        {/* Ground shadow */}
        <div
          className="rounded-full"
          style={{
            width: 20, height: 4,
            background: 'rgba(0,0,0,0.35)',
            marginTop: 1,
            filter: 'blur(1px)',
          }}
        />

        {/* Name tag (never flipped) */}
        <div className="mt-0.5 pointer-events-none">
          <span className="text-[7px] font-bold text-gray-400 bg-[#0a0c14]/90 rounded px-1 py-0.5 whitespace-nowrap border border-[#2a2d3a]/50">
            {agent.name === 'McGONAGALL' ? 'McGON.' : agent.name.slice(0, 7)}
          </span>
        </div>

      </div>
    </button>
  )
}

// ─── Character wrapper — tracks direction ─────────────────────────────────────

function TrackedCharacter({
  agent, isMoving, onClick,
}: {
  agent: AgentState; isMoving: boolean; onClick: () => void
}) {
  const pos = getPos(agent)
  const prevPos = useRef(pos)
  const [facingLeft, setFacingLeft] = useState(false)

  useEffect(() => {
    const dx = pos.x - prevPos.current.x
    if (Math.abs(dx) > 0.5) setFacingLeft(dx < 0)
    prevPos.current = pos
  }, [pos.x, pos.y]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MiniCharacter
      agent={agent}
      isWalking={isMoving}
      facingLeft={facingLeft}
      onClick={onClick}
    />
  )
}

// ─── Furniture ────────────────────────────────────────────────────────────────

function Furniture({ roomId, occupied }: { roomId: RoomId; occupied: boolean }) {
  if (roomId === 'great-hall') return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingTop: '18%' }}>
      <div
        className={`rounded-xl border-2 transition-all duration-500 ${
          occupied
            ? 'border-blue-500/50 bg-blue-900/20 shadow-lg shadow-blue-500/20'
            : 'border-[#2a2d3a]/60 bg-[#1a1d27]/20'
        }`}
        style={{ width: '62%', height: '44%' }}
      >
        {/* Table surface dots */}
        <div className="w-full h-full flex items-center justify-center gap-3 opacity-30">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${occupied ? 'bg-blue-400' : 'bg-gray-600'}`} />
          ))}
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
        <div className="m-1 w-6 h-1 bg-amber-700/40 rounded" />
        <div className="m-1 w-8 h-1 bg-amber-700/30 rounded" />
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
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-2 h-3 rounded-t-full border border-slate-500/30 bg-slate-700/30" />
        ))}
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

// ─── Activity log ─────────────────────────────────────────────────────────────

interface LogEntry { time: string; msg: string; type: 'move' | 'status' | 'meeting' }

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_AGENTS: AgentState[] = [
  { name: 'DUMBLEDORE', role: 'Chief of Staff',        homeRoom: 'headmaster',  currentRoom: 'headmaster',  status: 'online', color: 'purple', avatar: '/agents/DUMBLEDORE_Cyborg.png' },
  { name: 'HERMIONE',   role: 'Production Controller', homeRoom: 'operations',  currentRoom: 'operations',  status: 'online', color: 'amber',  avatar: '/agents/HERMIONE_Cyborg.png'   },
  { name: 'HARRY',      role: 'Creative Review',       homeRoom: 'creative',    currentRoom: 'creative',    status: 'online', color: 'red',    avatar: '/agents/HARRY_Cyborg.png'      },
  { name: 'RON',        role: 'Strategic Ideation',    homeRoom: 'creative',    currentRoom: 'creative',    status: 'online', color: 'orange', avatar: '/agents/RON_Cyborg.png'        },
  { name: 'McGONAGALL', role: 'SOP Builder',           homeRoom: 'archive',     currentRoom: 'archive',     status: 'online', color: 'green',  avatar: '/agents/McGONAGALL_Cyborg.png' },
  { name: 'SNAPE',      role: 'AI Scout',              homeRoom: 'lab',         currentRoom: 'lab',         status: 'online', color: 'slate',  avatar: '/agents/SNAPE_Cyborg.png'      },
  { name: 'HAGRID',     role: 'People Manager',        homeRoom: 'common',      currentRoom: 'common',      status: 'online', color: 'brown',  avatar: '/agents/HAGRID_Cyborg.png'     },
]

// ─── Main Shell ───────────────────────────────────────────────────────────────

export function OfficeShell() {
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENTS)
  const [moving, setMoving] = useState<Set<string>>(new Set())
  const [log, setLog] = useState<LogEntry[]>([
    { time: format(new Date(), 'HH:mm'), msg: 'All agents online and at their desks.', type: 'status' },
  ])

  function pushLog(msg: string, type: LogEntry['type']) {
    setLog(p => [{ time: format(new Date(), 'HH:mm:ss'), msg, type }, ...p].slice(0, 30))
  }

  function startMoving(names: string[]) {
    setMoving(p => new Set([...p, ...names]))
    setTimeout(() => setMoving(p => {
      const n = new Set(p); names.forEach(x => n.delete(x)); return n
    }), 800)
  }

  function handleAgentClick(name: string) {
    const agent = agents.find(a => a.name === name)!
    startMoving([name])
    if (agent.currentRoom === 'great-hall') {
      setAgents(p => p.map(a => a.name === name ? { ...a, currentRoom: a.homeRoom, status: 'online' } : a))
      pushLog(`${name} walked back to ${ROOMS[agent.homeRoom].label}.`, 'move')
    } else {
      setAgents(p => p.map(a => a.name === name ? { ...a, currentRoom: 'great-hall', status: 'in-meeting' } : a))
      pushLog(`${name} walked to Great Hall.`, 'move')
    }
  }

  function assembleMeeting() {
    startMoving(agents.map(a => a.name))
    setAgents(p => p.map(a => ({ ...a, currentRoom: 'great-hall', status: 'in-meeting' })))
    pushLog('Full team meeting — everyone heading to Great Hall.', 'meeting')
  }

  function dismissMeeting() {
    const inMeeting = agents.filter(a => a.currentRoom === 'great-hall').map(a => a.name)
    if (!inMeeting.length) return
    startMoving(inMeeting)
    setAgents(p => p.map(a => ({ ...a, currentRoom: a.homeRoom, status: 'online' })))
    pushLog('Meeting dismissed — agents heading back to desks.', 'meeting')
  }

  function simulateWork() {
    const workers = ['HERMIONE', 'HARRY', 'SNAPE']
    setAgents(p => p.map(a => workers.includes(a.name) ? { ...a, status: 'working' } : a))
    pushLog('HERMIONE, HARRY and SNAPE are working on tasks.', 'status')
    setTimeout(() => {
      setAgents(p => p.map(a => a.status === 'working' ? { ...a, status: 'online' } : a))
      pushLog('Work burst complete.', 'status')
    }, 6000)
  }

  function toggleAway(name: string) {
    setAgents(p => p.map(a => {
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
              <Wifi size={11} /> {onlineCount}/7 Online
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

      {/* Canvas */}
      <main className="flex-1 min-h-0 flex gap-3 p-4">

        {/* ── Floor plan ─────────────────────────────────────── */}
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
            const occupied = agents.filter(a => a.currentRoom === roomId)
            const isLive = roomId === 'great-hall' && occupied.length > 0
            return (
              <div
                key={roomId}
                className={`absolute rounded-lg border transition-all duration-500 ${room.bg} ${room.border} ${isLive ? 'shadow-xl shadow-blue-500/20' : ''}`}
                style={{
                  ...room.style,
                  margin: 4,
                  width: `calc(${room.style.width} - 8px)`,
                  height: `calc(${room.style.height} - 8px)`,
                }}
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
                <Furniture roomId={roomId} occupied={occupied.length > 0} />
              </div>
            )
          })}

          {/* Divider lines */}
          {[
            { style: { left: '22%', top: '2%',  width: 1, height: '40%' } },
            { style: { left: '64%', top: '2%',  width: 1, height: '40%' } },
            { style: { left: '28%', top: '46%', width: 1, height: '34%' } },
            { style: { left: '64%', top: '46%', width: 1, height: '34%' } },
            { style: { left: '2%',  top: '82%', width: '96%', height: 1 } },
          ].map((d, i) => (
            <div
              key={i}
              className="absolute pointer-events-none"
              style={{
                ...d.style,
                background: 'linear-gradient(to bottom, transparent, #2a2d3a55, transparent)',
              }}
            />
          ))}

          {/* Mini characters — all absolutely positioned, CSS-transitioned */}
          {agents.map(agent => (
            <TrackedCharacter
              key={agent.name}
              agent={agent}
              isMoving={moving.has(agent.name)}
              onClick={() => handleAgentClick(agent.name)}
            />
          ))}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <div className="w-[196px] flex-shrink-0 flex flex-col gap-3">

          <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-3 flex flex-col gap-2">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Team</p>
            {agents.map(agent => (
              <div key={agent.name} className="flex items-center gap-2">
                <div className="relative flex-shrink-0">
                  <Image src={agent.avatar} alt={agent.name} width={22} height={22} className="rounded-full object-cover object-top" />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#1a1d27] ${
                    agent.status === 'online' ? 'bg-green-400' :
                    agent.status === 'working' ? 'bg-amber-400 animate-pulse' :
                    agent.status === 'in-meeting' ? 'bg-blue-400' : 'bg-gray-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-gray-300 truncate">{agent.name}</p>
                  <p className={`text-[8px] truncate ${
                    agent.status === 'online' ? 'text-green-600' :
                    agent.status === 'working' ? 'text-amber-500' :
                    agent.status === 'in-meeting' ? 'text-blue-400' : 'text-gray-600'
                  }`}>
                    {agent.currentRoom === 'great-hall' ? '📍 Great Hall' : `📍 ${ROOMS[agent.currentRoom].label.split(' ').slice(0, 2).join(' ')}`}
                  </p>
                </div>
                <button onClick={() => toggleAway(agent.name)} className="text-gray-700 hover:text-gray-400 flex-shrink-0">
                  {agent.status === 'away' ? <WifiOff size={9} /> : <Wifi size={9} />}
                </button>
              </div>
            ))}
          </div>

          <div className="flex-1 min-h-0 bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-3 flex flex-col gap-2 overflow-hidden">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex-shrink-0">Activity</p>
            <div className="overflow-y-auto flex flex-col gap-1.5 [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a]">
              {log.map((entry, i) => (
                <div key={i} className="flex gap-1.5">
                  <span className="text-[7px] text-gray-700 font-mono mt-0.5 flex-shrink-0">{entry.time}</span>
                  <p className={`text-[9px] leading-snug ${
                    entry.type === 'meeting' ? 'text-blue-400' :
                    entry.type === 'move'    ? 'text-amber-500' : 'text-gray-500'
                  }`}>{entry.msg}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[8px] text-gray-700 text-center px-2 leading-snug">
            Click any character to send them to / from the Great Hall
          </p>
        </div>
      </main>
    </div>
  )
}
