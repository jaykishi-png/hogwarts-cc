'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { NavTabs } from './NavTabs'
import { Users, Zap, RotateCcw, Coffee, Wifi, WifiOff } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type RoomId = 'headmaster' | 'great-hall' | 'lab' | 'operations' | 'creative' | 'archive' | 'common'
type AgentStatus = 'online' | 'working' | 'in-meeting' | 'away'

interface AgentState {
  name: string
  role: string
  homeRoom: RoomId
  currentRoom: RoomId
  status: AgentStatus
  color: string
  avatar: string
}

// ─── Config ──────────────────────────────────────────────────────────────────

const INITIAL_AGENTS: AgentState[] = [
  { name: 'DUMBLEDORE', role: 'Chief of Staff',        homeRoom: 'headmaster',  currentRoom: 'headmaster',  status: 'online', color: 'purple', avatar: '/agents/DUMBLEDORE_Cyborg.png' },
  { name: 'HERMIONE',   role: 'Production Controller', homeRoom: 'operations',  currentRoom: 'operations',  status: 'online', color: 'amber',  avatar: '/agents/HERMIONE_Cyborg.png'   },
  { name: 'HARRY',      role: 'Creative Review',       homeRoom: 'creative',    currentRoom: 'creative',    status: 'online', color: 'red',    avatar: '/agents/HARRY_Cyborg.png'      },
  { name: 'RON',        role: 'Strategic Ideation',    homeRoom: 'creative',    currentRoom: 'creative',    status: 'online', color: 'orange', avatar: '/agents/RON_Cyborg.png'        },
  { name: 'McGONAGALL', role: 'SOP Builder',           homeRoom: 'archive',     currentRoom: 'archive',     status: 'online', color: 'green',  avatar: '/agents/McGONAGALL_Cyborg.png' },
  { name: 'SNAPE',      role: 'AI Scout',              homeRoom: 'lab',         currentRoom: 'lab',         status: 'online', color: 'slate',  avatar: '/agents/SNAPE_Cyborg.png'      },
  { name: 'HAGRID',     role: 'People Manager',        homeRoom: 'common',      currentRoom: 'common',      status: 'online', color: 'brown',  avatar: '/agents/HAGRID_Cyborg.png'     },
]

interface RoomConfig {
  label: string
  sublabel: string
  emoji: string
  border: string
  bg: string
  labelColor: string
  isMeeting?: boolean
}

const ROOMS: Record<RoomId, RoomConfig> = {
  'headmaster': {
    label: "Headmaster's Office",  sublabel: 'Private',
    emoji: '🔮',
    border: 'border-purple-700/60',  bg: 'bg-purple-950/30',  labelColor: 'text-purple-400',
  },
  'great-hall': {
    label: 'Great Hall',  sublabel: 'Meeting Room',
    emoji: '🏛️',
    border: 'border-blue-600/70',  bg: 'bg-blue-950/30',  labelColor: 'text-blue-300',
    isMeeting: true,
  },
  'lab': {
    label: "Snape's Lab",  sublabel: 'AI Research',
    emoji: '⚗️',
    border: 'border-slate-600/60',  bg: 'bg-slate-900/40',  labelColor: 'text-slate-400',
  },
  'operations': {
    label: 'Operations Room',  sublabel: 'Production Tracking',
    emoji: '📊',
    border: 'border-amber-700/60',  bg: 'bg-amber-950/25',  labelColor: 'text-amber-400',
  },
  'creative': {
    label: 'Creative Studio',  sublabel: 'Design & Strategy',
    emoji: '🎨',
    border: 'border-orange-700/60',  bg: 'bg-orange-950/25',  labelColor: 'text-orange-400',
  },
  'archive': {
    label: 'The Archive',  sublabel: 'SOPs & Docs',
    emoji: '📚',
    border: 'border-emerald-700/60',  bg: 'bg-emerald-950/25',  labelColor: 'text-emerald-400',
  },
  'common': {
    label: 'Common Room',  sublabel: 'People & Team',
    emoji: '☕',
    border: 'border-yellow-700/40',  bg: 'bg-yellow-950/15',  labelColor: 'text-yellow-500',
  },
}

const STATUS_RING: Record<AgentStatus, string> = {
  online:      'ring-2 ring-green-400',
  working:     'ring-2 ring-amber-400 animate-pulse',
  'in-meeting':'ring-2 ring-blue-400',
  away:        'ring-1 ring-gray-600 opacity-50',
}

const STATUS_DOT: Record<AgentStatus, string> = {
  online:       'bg-green-400',
  working:      'bg-amber-400 animate-pulse',
  'in-meeting': 'bg-blue-400',
  away:         'bg-gray-600',
}

const STATUS_LABEL: Record<AgentStatus, string> = {
  online:       'Online',
  working:      'Working…',
  'in-meeting': 'In Meeting',
  away:         'Away',
}

// ─── Agent Avatar ─────────────────────────────────────────────────────────────

function AgentAvatar({
  agent,
  size = 48,
  onClick,
  selected,
}: {
  agent: AgentState
  size?: number
  onClick?: () => void
  selected?: boolean
}) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <button
      onClick={onClick}
      title={`${agent.name} — ${STATUS_LABEL[agent.status]}\nClick to ${agent.currentRoom === 'great-hall' ? 'return to desk' : 'call to meeting'}`}
      className={`relative flex-shrink-0 rounded-full transition-all duration-300 cursor-pointer
        ${STATUS_RING[agent.status]}
        ${selected ? 'scale-110 shadow-lg shadow-blue-500/30' : 'hover:scale-105'}
        ${agent.status === 'away' ? 'grayscale' : ''}
      `}
      style={{ width: size, height: size }}
    >
      {imgFailed ? (
        <div
          className="w-full h-full rounded-full bg-[#2a2d3a] flex items-center justify-center text-xs font-bold text-gray-400"
        >
          {agent.name[0]}
        </div>
      ) : (
        <Image
          src={agent.avatar}
          alt={agent.name}
          width={size}
          height={size}
          className="rounded-full object-cover object-top w-full h-full"
          onError={() => setImgFailed(true)}
        />
      )}
      {/* Status dot */}
      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0f1117] ${STATUS_DOT[agent.status]}`} />
    </button>
  )
}

// ─── Room ─────────────────────────────────────────────────────────────────────

function Room({
  roomId,
  config,
  agents,
  onAgentClick,
  selectedAgents,
  style,
}: {
  roomId: RoomId
  config: RoomConfig
  agents: AgentState[]
  onAgentClick: (name: string) => void
  selectedAgents: Set<string>
  style?: React.CSSProperties
}) {
  const inMeeting = roomId === 'great-hall' && agents.length > 0

  return (
    <div
      className={`
        relative rounded-xl border p-3 flex flex-col gap-2 transition-all duration-500
        ${config.bg} ${config.border}
        ${inMeeting ? 'shadow-lg shadow-blue-500/20' : ''}
      `}
      style={style}
    >
      {/* Room label */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{config.emoji}</span>
        <div>
          <p className={`text-[11px] font-bold tracking-wide ${config.labelColor}`}>{config.label}</p>
          <p className="text-[9px] text-gray-600 uppercase tracking-widest">{config.sublabel}</p>
        </div>
        {inMeeting && (
          <span className="ml-auto flex items-center gap-1 text-[9px] text-blue-400 bg-blue-900/30 rounded px-1.5 py-0.5 border border-blue-800/40">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* Agents in this room */}
      <div className="flex flex-wrap gap-2 items-center min-h-[48px]">
        {agents.map(agent => (
          <div key={agent.name} className="flex flex-col items-center gap-1">
            <AgentAvatar
              agent={agent}
              size={44}
              onClick={() => onAgentClick(agent.name)}
              selected={selectedAgents.has(agent.name)}
            />
            <span className={`text-[8px] font-semibold tracking-wide truncate max-w-[48px] text-center ${
              agent.status === 'away' ? 'text-gray-600' : 'text-gray-400'
            }`}>
              {agent.name.split('G')[0] === 'McGONA' ? 'McGON.' : agent.name.slice(0, 6)}
            </span>
          </div>
        ))}
        {agents.length === 0 && roomId !== 'great-hall' && (
          <span className="text-[10px] text-gray-700 italic">Empty</span>
        )}
        {agents.length === 0 && roomId === 'great-hall' && (
          <span className="text-[10px] text-gray-700 italic">No meeting in progress</span>
        )}
      </div>
    </div>
  )
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

interface LogEntry {
  time: string
  message: string
  type: 'move' | 'status' | 'meeting'
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function OfficeShell() {
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENTS)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [log, setLog] = useState<LogEntry[]>([
    { time: format(new Date(), 'HH:mm'), message: 'All agents online and at their desks.', type: 'status' },
  ])

  function addLog(message: string, type: LogEntry['type']) {
    setLog(prev => [{ time: format(new Date(), 'HH:mm:ss'), message, type }, ...prev].slice(0, 20))
  }

  // Toggle agent into/out of meeting room
  function handleAgentClick(name: string) {
    setAgents(prev => prev.map(a => {
      if (a.name !== name) return a
      if (a.currentRoom === 'great-hall') {
        addLog(`${name} returned to ${ROOMS[a.homeRoom].label}.`, 'move')
        return { ...a, currentRoom: a.homeRoom, status: 'online' }
      } else {
        addLog(`${name} moved to Great Hall.`, 'move')
        return { ...a, currentRoom: 'great-hall', status: 'in-meeting' }
      }
    }))
  }

  // Call all to meeting
  function assembleMeeting() {
    setAgents(prev => prev.map(a => ({ ...a, currentRoom: 'great-hall', status: 'in-meeting' })))
    addLog('All agents called to Great Hall — full team meeting.', 'meeting')
  }

  // Dismiss meeting
  function dismissMeeting() {
    setAgents(prev => prev.map(a => ({ ...a, currentRoom: a.homeRoom, status: 'online' })))
    addLog('Meeting dismissed — agents returned to desks.', 'meeting')
  }

  // Simulate work burst
  function simulateWork() {
    const workers = ['HERMIONE', 'HARRY', 'SNAPE']
    setAgents(prev => prev.map(a => ({
      ...a,
      status: workers.includes(a.name) ? 'working' : a.status,
    })))
    addLog('HERMIONE, HARRY, SNAPE are now working on tasks.', 'status')
    setTimeout(() => {
      setAgents(prev => prev.map(a => ({
        ...a,
        status: a.status === 'working' ? 'online' : a.status,
      })))
      addLog('Work burst complete — agents back to standby.', 'status')
    }, 6000)
  }

  // Toggle away
  function toggleAway(name: string) {
    setAgents(prev => prev.map(a => {
      if (a.name !== name) return a
      const next = a.status === 'away' ? 'online' : 'away'
      addLog(`${name} is now ${next === 'away' ? 'away' : 'back online'}.`, 'status')
      return { ...a, status: next }
    }))
  }

  // Group agents by room
  const byRoom = (roomId: RoomId) => agents.filter(a => a.currentRoom === roomId)

  const inMeeting = agents.filter(a => a.currentRoom === 'great-hall')
  const onlineCount = agents.filter(a => a.status !== 'away').length

  return (
    <div className="h-screen flex flex-col bg-[#0f1117] overflow-hidden">

      {/* Header */}
      <header className="flex-shrink-0 bg-[#13151e] border-b border-[#2a2d3a] px-6 py-3 z-10">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-semibold text-gray-100">Dashboard</h1>
              <span className="text-sm text-gray-500 hidden sm:block">
                {format(new Date(), 'EEEE, MMMM d')}
              </span>
            </div>
            <NavTabs active="office" />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-900/20 border border-green-800/40 rounded-lg px-2.5 py-1.5">
              <Wifi size={11} />
              {onlineCount}/7 Online
            </div>
            <button
              onClick={simulateWork}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 border border-amber-800/50 bg-amber-900/20 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <Zap size={11} />
              Simulate Work
            </button>
            <button
              onClick={assembleMeeting}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-800/50 bg-blue-900/20 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <Users size={11} />
              Full Meeting
            </button>
            <button
              onClick={dismissMeeting}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300 border border-[#2a2d3a] bg-[#1a1d27] rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <RotateCcw size={11} />
              Dismiss
            </button>
          </div>
        </div>
      </header>

      {/* Canvas */}
      <main className="flex-1 min-h-0 flex gap-4 p-4">

        {/* ── Floor Plan ─────────────────────────────────────── */}
        <div
          className="flex-1 min-w-0 grid gap-3"
          style={{
            gridTemplateAreas: `
              "headmaster great-hall great-hall lab"
              "operations creative   archive   archive"
              "common     common     common    common"
            `,
            gridTemplateColumns: '0.85fr 1.3fr 0.85fr 0.85fr',
            gridTemplateRows: '1fr 1fr 0.55fr',
          }}
        >
          {(Object.entries(ROOMS) as [RoomId, RoomConfig][]).map(([roomId, config]) => (
            <Room
              key={roomId}
              roomId={roomId}
              config={config}
              agents={byRoom(roomId)}
              onAgentClick={handleAgentClick}
              selectedAgents={selected}
              style={{ gridArea: roomId }}
            />
          ))}
        </div>

        {/* ── Right Sidebar ───────────────────────────────────── */}
        <div className="w-[220px] flex-shrink-0 flex flex-col gap-3">

          {/* Agent roster */}
          <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-3 flex flex-col gap-2">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Agents</p>
            {agents.map(agent => (
              <div key={agent.name} className="flex items-center gap-2">
                <AgentAvatar agent={agent} size={28} onClick={() => handleAgentClick(agent.name)} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-gray-300 truncate">{agent.name}</p>
                  <p className={`text-[9px] truncate ${
                    agent.status === 'online' ? 'text-green-500' :
                    agent.status === 'working' ? 'text-amber-500' :
                    agent.status === 'in-meeting' ? 'text-blue-400' :
                    'text-gray-600'
                  }`}>
                    {agent.currentRoom === 'great-hall'
                      ? '📍 Great Hall'
                      : `📍 ${ROOMS[agent.currentRoom].label.split(' ')[0]}`}
                    {' · '}{STATUS_LABEL[agent.status]}
                  </p>
                </div>
                <button
                  onClick={() => toggleAway(agent.name)}
                  title="Toggle away"
                  className="text-gray-700 hover:text-gray-400 transition-colors"
                >
                  {agent.status === 'away' ? <WifiOff size={10} /> : <Wifi size={10} />}
                </button>
              </div>
            ))}
          </div>

          {/* Activity log */}
          <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-3 flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex-shrink-0">Activity Log</p>
            <div className="overflow-y-auto flex flex-col gap-1.5
              [&::-webkit-scrollbar]:w-[2px]
              [&::-webkit-scrollbar-track]:bg-transparent
              [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a]">
              {log.map((entry, i) => (
                <div key={i} className="flex gap-1.5">
                  <span className="text-[8px] text-gray-700 font-mono flex-shrink-0 mt-0.5">{entry.time}</span>
                  <p className={`text-[9px] leading-snug ${
                    entry.type === 'meeting' ? 'text-blue-400' :
                    entry.type === 'move' ? 'text-amber-400' :
                    'text-gray-500'
                  }`}>
                    {entry.message}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
