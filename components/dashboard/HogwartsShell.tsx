'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import {
  Loader2, Send, Users, Zap, RotateCcw, Wifi,
  Home, Bot, MessageSquare, Layers, Globe, Activity, Settings2, Monitor,
} from 'lucide-react'
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
  purple: 'ring-purple-700/60', amber: 'ring-amber-700/60', red: 'ring-red-700/60',
  orange: 'ring-orange-700/60', green: 'ring-emerald-700/60', slate: 'ring-slate-600/60', brown: 'ring-yellow-700/60',
}
const TEXT_MAP: Record<string, string> = {
  purple: 'text-purple-300', amber: 'text-amber-300', red: 'text-red-300',
  orange: 'text-orange-300', green: 'text-emerald-300', slate: 'text-slate-300', brown: 'text-yellow-300',
}
const BADGE_MAP: Record<string, string> = {
  purple: 'bg-purple-900/50 text-purple-400', amber: 'bg-amber-900/50 text-amber-400',
  red: 'bg-red-900/50 text-red-400', orange: 'bg-orange-900/50 text-orange-400',
  green: 'bg-emerald-900/50 text-emerald-400', slate: 'bg-slate-800 text-slate-400',
  brown: 'bg-yellow-900/40 text-yellow-400',
}

// ─── Office types ─────────────────────────────────────────────────────────────

type RoomId      = 'headmaster' | 'great-hall' | 'lab' | 'operations' | 'creative' | 'archive' | 'common'
type AgentStatus = 'online' | 'working' | 'in-meeting' | 'away'
interface Pos { x: number; y: number }
interface AgentState {
  name: string; role: string; homeRoom: RoomId; currentRoom: RoomId
  status: AgentStatus; color: string; avatar: string
}
interface LogEntry  { time: string; msg: string; type: 'move' | 'status' | 'meeting' | 'chat' }
interface BriefEntry { agent: string; role: string; color: string; avatar: string; text: string; loading: boolean }

// ─── /brief command — agent sequence + prompts ────────────────────────────────

const BRIEF_SEQUENCE: { name: string; role: string; color: string; avatar: string; prompt: string }[] = [
  {
    name: 'SNAPE', role: 'AI Scout — tech & tools', color: 'slate',
    avatar: '/agents/SNAPE_Cyborg.png',
    prompt: 'You are contributing to an end-of-week executive brief. In 3–4 sentences MAX, report on the most relevant AI tools or tech updates from this week that matter for content production, video editing, or marketing ops. Be specific and ruthlessly concise.',
  },
  {
    name: 'HERMIONE', role: 'Production — status & risks', color: 'amber',
    avatar: '/agents/HERMIONE_Cyborg.png',
    prompt: 'You are contributing to an end-of-week executive brief. In 3–4 sentences MAX, summarise production status: what shipped, what is blocked, and any timeline or capacity risks to flag right now.',
  },
  {
    name: 'HARRY', role: 'Creative — quality & brand', color: 'red',
    avatar: '/agents/HARRY_Cyborg.png',
    prompt: 'You are contributing to an end-of-week executive brief. In 3–4 sentences MAX, review creative output quality this week across Revenue Rush and The Process. Call out anything that missed the brief or needs a re-do.',
  },
  {
    name: 'RON', role: 'Strategy — ideas & angles', color: 'orange',
    avatar: '/agents/RON_Cyborg.png',
    prompt: 'You are contributing to an end-of-week executive brief. In 3–4 sentences MAX, name the top 1–2 strategic opportunities or campaign angles worth pursuing next week. Be specific enough for a brief.',
  },
  {
    name: 'McGONAGALL', role: 'Ops — workflow gaps', color: 'green',
    avatar: '/agents/McGONAGALL_Cyborg.png',
    prompt: 'You are contributing to an end-of-week executive brief. In 3–4 sentences MAX, identify the #1 workflow or process gap observed this week and give a concrete fix Jay can implement immediately.',
  },
  {
    name: 'HAGRID', role: 'People — team health', color: 'brown',
    avatar: '/agents/HAGRID_Cyborg.png',
    prompt: 'You are contributing to an end-of-week executive brief. In 3–4 sentences MAX, give a team health snapshot: capacity, morale signal, and the one specific thing Jay should acknowledge or address with the team.',
  },
]

// ─── Position maps (% of floor plan) ─────────────────────────────────────────

const DESK_POS: Record<string, Pos> = {
  DUMBLEDORE: { x: 9,  y: 24 }, SNAPE:      { x: 80, y: 24 },
  HERMIONE:   { x: 12, y: 63 }, HARRY:      { x: 34, y: 62 },
  RON:        { x: 46, y: 70 }, McGONAGALL: { x: 74, y: 62 },
  HAGRID:     { x: 11, y: 90 },
}
const MEETING_POS: Record<string, Pos> = {
  DUMBLEDORE: { x: 30, y: 14 }, HERMIONE:   { x: 38, y: 14 },
  HARRY:      { x: 46, y: 14 }, RON:        { x: 54, y: 14 },
  McGONAGALL: { x: 34, y: 32 }, SNAPE:      { x: 46, y: 34 },
  HAGRID:     { x: 56, y: 22 },
}
function getPos(agent: AgentState): Pos {
  return agent.currentRoom === 'great-hall' ? MEETING_POS[agent.name] : DESK_POS[agent.name]
}

// ─── Room config ──────────────────────────────────────────────────────────────

interface RoomConfig {
  label: string; sublabel: string; emoji: string
  style: React.CSSProperties; border: string; bg: string; textColor: string; isMeeting?: boolean
}
const ROOMS: Record<RoomId, RoomConfig> = {
  'headmaster': {
    label: "Director's Office", sublabel: 'Private', emoji: '🪑',
    style: { left: '0%', top: '0%', width: '22%', height: '44%' },
    border: 'border-[#3d2010]', bg: 'bg-[#6b3c1a]/15', textColor: 'text-[#f5c88a]',
  },
  'great-hall': {
    label: 'Conference Room', sublabel: 'Meeting', emoji: '🏢',
    style: { left: '22%', top: '0%', width: '42%', height: '44%' },
    border: 'border-[#1a3a5c]', bg: 'bg-[#1e4060]/20', textColor: 'text-[#7ec8f5]', isMeeting: true,
  },
  'lab': {
    label: 'Research Lab', sublabel: 'AI & Tech', emoji: '💻',
    style: { left: '64%', top: '0%', width: '36%', height: '44%' },
    border: 'border-[#2a2a40]', bg: 'bg-[#1a1a35]/25', textColor: 'text-[#a0a8d8]',
  },
  'operations': {
    label: 'Operations', sublabel: 'Production', emoji: '📋',
    style: { left: '0%', top: '44%', width: '28%', height: '38%' },
    border: 'border-[#4a3010]', bg: 'bg-[#7a5020]/15', textColor: 'text-[#f0c060]',
  },
  'creative': {
    label: 'Creative Studio', sublabel: 'Design', emoji: '🎨',
    style: { left: '28%', top: '44%', width: '36%', height: '38%' },
    border: 'border-[#4a2010]', bg: 'bg-[#7a3510]/15', textColor: 'text-[#f0a060]',
  },
  'archive': {
    label: 'Library', sublabel: 'Docs & SOPs', emoji: '📚',
    style: { left: '64%', top: '44%', width: '36%', height: '38%' },
    border: 'border-[#1a3a28]', bg: 'bg-[#1a4028]/20', textColor: 'text-[#60d898]',
  },
  'common': {
    label: 'Break Room', sublabel: 'Lounge', emoji: '☕',
    style: { left: '0%', top: '82%', width: '100%', height: '18%' },
    border: 'border-[#3a2810]', bg: 'bg-[#5c3818]/15', textColor: 'text-[#d4a060]',
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

// ─── Agent avatar (chat panel) ────────────────────────────────────────────────

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

// ─── Pixel-art furniture SVGs ─────────────────────────────────────────────────
// All use shapeRendering="crispEdges" + imageRendering:pixelated for clean 8-bit look

const CRSP = { shapeRendering: 'crispEdges' as const, style: { imageRendering: 'pixelated' } as React.CSSProperties }

/** Top-down office desk with monitor, keyboard, mug, floor shadow */
function PxDesk({ style, screenColor = '#1e4888' }: { style?: React.CSSProperties; screenColor?: string }) {
  return (
    <svg width="68" height="56" viewBox="0 0 17 14" {...CRSP} style={{ ...CRSP.style, ...style }}>
      {/* desk surface */}
      <rect x="0" y="4"  width="17" height="10" fill="#8b5c30" />
      <rect x="0" y="4"  width="17" height="1"  fill="#a87040" /> {/* top highlight */}
      <rect x="0" y="12" width="17" height="2"  fill="#5c3010" /> {/* front shadow */}
      <rect x="1"  y="13" width="2"  height="1"  fill="#4a2808" /> {/* leg L */}
      <rect x="14" y="13" width="2"  height="1"  fill="#4a2808" /> {/* leg R */}
      {/* monitor shell */}
      <rect x="2"  y="0"  width="13" height="6"  fill="#1e2535" />
      {/* screen */}
      <rect x="3"  y="1"  width="11" height="4"  fill={screenColor} />
      <rect x="4"  y="1"  width="9"  height="1"  fill="#2860d8" opacity="0.55" />
      <rect x="4"  y="3"  width="9"  height="1"  fill="#1848b0" opacity="0.35" />
      {/* stand */}
      <rect x="7"  y="6"  width="3"  height="1"  fill="#374151" />
      {/* keyboard */}
      <rect x="1"  y="7"  width="11" height="4"  fill="#d4c9b0" />
      <rect x="2"  y="8"  width="9"  height="2"  fill="#c0b098" />
      {[2,5,8].map(x => <rect key={x} x={x} y="8" width="2" height="1" fill="#a89878" />)}
      {/* mouse */}
      <rect x="13" y="7"  width="3"  height="4"  fill="#9ca3af" />
      <rect x="14" y="8"  width="1"  height="2"  fill="#6b7280" />
      {/* desk mug */}
      <rect x="14" y="4"  width="2"  height="2"  fill="#dc4444" />
      <rect x="14" y="3"  width="2"  height="1"  fill="#f87171" />
    </svg>
  )
}

/** Chair (top-down view) */
function PxChair({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="28" height="32" viewBox="0 0 7 8" {...CRSP} style={{ ...CRSP.style, ...style }}>
      <rect x="0" y="0" width="7" height="3" fill="#6b3010" />
      <rect x="0" y="0" width="7" height="1" fill="#8b4018" />
      <rect x="0" y="3" width="7" height="4" fill="#7c3a18" />
      <rect x="0" y="6" width="7" height="1" fill="#5c2c10" />
      <rect x="0" y="7" width="2" height="1" fill="#4a2010" />
      <rect x="5" y="7" width="2" height="1" fill="#4a2010" />
    </svg>
  )
}

/** Potted plant */
function PxPlant({ style, leafColor = '#15803d' }: { style?: React.CSSProperties; leafColor?: string }) {
  return (
    <svg width="28" height="40" viewBox="0 0 7 10" {...CRSP} style={{ ...CRSP.style, ...style }}>
      {/* foliage */}
      <rect x="1" y="0" width="5" height="6" fill={leafColor} />
      <rect x="2" y="0" width="3" height="1" fill="#166534" />
      <rect x="0" y="2" width="2" height="3" fill={leafColor} />
      <rect x="5" y="2" width="2" height="3" fill={leafColor} />
      <rect x="1" y="1" width="1" height="1" fill="#22c55e" opacity="0.7" />
      <rect x="4" y="1" width="2" height="1" fill="#22c55e" opacity="0.6" />
      {/* pot rim */}
      <rect x="0" y="6" width="7" height="1" fill="#9a340a" />
      {/* pot body */}
      <rect x="1" y="6" width="5" height="4" fill="#c2410c" />
      <rect x="1" y="7" width="5" height="1" fill="#b43c0c" />
      <rect x="1" y="9" width="5" height="1" fill="#7c2c08" />
      {/* soil */}
      <rect x="1" y="6" width="5" height="2" fill="#3d1a06" />
    </svg>
  )
}

/** Bookshelf — rich colorful spines */
function PxBookshelf({ style, rows = 2 }: { style?: React.CSSProperties; rows?: number }) {
  const palette = ['#dc2626','#2563eb','#16a34a','#d97706','#7c3aed','#db2777',
                   '#0891b2','#65a30d','#9333ea','#ea580c','#0284c7','#b91c1c',
                   '#15803d','#7c2d12','#1d4ed8','#854d0e']
  const h = rows === 2 ? 72 : 40
  const vh = rows === 2 ? 18 : 10
  return (
    <svg width="64" height={h} viewBox={`0 0 16 ${vh}`} {...CRSP} style={{ ...CRSP.style, ...style }}>
      {/* frame */}
      <rect width="16" height={vh} fill="#5c3010" />
      {rows === 2 && <rect x="0" y="9" width="16" height="1" fill="#3d1e08" />}
      {/* row 1 books */}
      {palette.slice(0, 8).map((c, i) => (
        <rect key={i} x={i * 2} y="1" width="2" height={rows === 2 ? 7 : vh - 2} fill={c} opacity="0.9" />
      ))}
      {/* row 2 books */}
      {rows === 2 && palette.slice(8, 16).map((c, i) => (
        <rect key={i} x={i * 2} y="10" width="2" height="7" fill={c} opacity="0.9" />
      ))}
      {/* spine highlights */}
      {[0,2,4,6,8,10,12,14].map(x => (
        <rect key={x} x={x} y="1" width="1" height="1" fill="rgba(255,255,255,0.2)" />
      ))}
    </svg>
  )
}

/** Filing cabinet */
function PxCabinet({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="36" height="48" viewBox="0 0 9 12" {...CRSP} style={{ ...CRSP.style, ...style }}>
      <rect width="9" height="12" fill="#6b3c1a" />
      {[1,4,8].map(y => (
        <rect key={y} x="1" y={y} width="7" height="2" fill="#4a2808" />
      ))}
      {[1,4,8].map(y => (
        <rect key={y} x="3" y={y + 0.5} width="3" height="1" fill="#8b5c2a" />
      ))}
      <rect x="0" y="0" width="9" height="1" fill="#8b5030" />
    </svg>
  )
}

/** Couch (top-down, horizontal) */
function PxCouch({ style, tileW = 3 }: { style?: React.CSSProperties; tileW?: number }) {
  const vw = tileW * 8
  const pw = tileW * 32
  return (
    <svg width={pw} height={40} viewBox={`0 0 ${vw} 10`} {...CRSP} style={{ ...CRSP.style, ...style }}>
      {/* back */}
      <rect x="0" y="0" width={vw} height="3" fill="#8b4513" />
      <rect x="0" y="0" width={vw} height="1" fill="#a05520" />
      {/* seat */}
      <rect x="0" y="3" width={vw} height="6" fill="#7c3c18" />
      {/* cushion dividers */}
      {[Math.floor(vw/3), Math.floor(2*vw/3)].map(x => (
        <rect key={x} x={x} y="3" width="1" height="6" fill="#5c2c10" />
      ))}
      {/* armrests */}
      <rect x="0"    y="2" width="2" height="8" fill="#6b3010" />
      <rect x={vw-2} y="2" width="2" height="8" fill="#6b3010" />
      {/* cushion texture */}
      <rect x="3" y="4" width={Math.floor(vw/3)-4} height="3" fill="#9b4d24" opacity="0.4" />
    </svg>
  )
}

/** Coffee table */
function PxCoffeeTable({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="64" height="32" viewBox="0 0 16 8" {...CRSP} style={{ ...CRSP.style, ...style }}>
      <rect width="16" height="8" fill="#6b3c1a" />
      <rect y="0" width="16" height="1" fill="#8b5c2a" />
      <rect y="7" width="16" height="1" fill="#4a2810" />
      <rect x="1" y="1" width="14" height="6" fill="#7c4820" />
      {/* coffee cup + magazine */}
      <rect x="5" y="3" width="3" height="3" fill="#f5f5f0" />
      <rect x="9" y="3" width="4" height="2" fill="#d0c8b0" />
      <rect x="9" y="3" width="4" height="1" fill="#60a0c0" opacity="0.7" />
    </svg>
  )
}

/** Kitchen counter strip */
function PxCounter({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="128" height="36" viewBox="0 0 32 9" {...CRSP} style={{ ...CRSP.style, ...style }}>
      {/* surface */}
      <rect width="32" height="9" fill="#b0a080" />
      <rect y="0" width="32" height="1" fill="#c8b898" />
      <rect y="8" width="32" height="1" fill="#8a7860" />
      {/* sink */}
      <rect x="1" y="1" width="7" height="7" fill="#8a9090" />
      <rect x="2" y="2" width="5" height="5" fill="#707878" />
      <rect x="4" y="2" width="2" height="1" fill="#909898" />
      {/* coffee machine */}
      <rect x="10" y="1" width="5" height="7" fill="#2d2d2d" />
      <rect x="11" y="2" width="3" height="3" fill="#1a1a1a" />
      <rect x="11" y="2" width="3" height="1" fill="#60a0c0" opacity="0.9" />
      <rect x="12" y="5" width="1" height="3" fill="#444" />
      {/* toaster */}
      <rect x="17" y="2" width="5" height="5" fill="#c0b898" />
      <rect x="18" y="2" width="1" height="3" fill="#888070" />
      <rect x="20" y="2" width="1" height="3" fill="#888070" />
      {/* items on right */}
      <rect x="24" y="2" width="3" height="5" fill="#f5f0e0" />
      <rect x="28" y="3" width="3" height="4" fill="#e8dfd0" />
    </svg>
  )
}

/** Fridge */
function PxFridge({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="36" height="56" viewBox="0 0 9 14" {...CRSP} style={{ ...CRSP.style, ...style }}>
      <rect width="9" height="14" fill="#dce8e8" />
      <rect y="0" width="9" height="1" fill="#b8d0d0" />
      <rect y="13" width="9" height="1" fill="#98b8b8" />
      <rect y="5" width="9" height="1" fill="#a0b8b8" />
      {/* handles */}
      <rect x="7" y="1" width="1" height="3" fill="#7a8888" />
      <rect x="7" y="6" width="1" height="7" fill="#7a8888" />
      {/* panels */}
      <rect x="1" y="1" width="5" height="3" fill="#cce0e0" />
      <rect x="1" y="6" width="5" height="7" fill="#d4e8e8" />
    </svg>
  )
}

/** Conference table with chairs */
function PxMeetingTable({ style, occupied }: { style?: React.CSSProperties; occupied: boolean }) {
  const tc = occupied ? '#96632a' : '#7c4820'
  return (
    <svg width="208" height="100" viewBox="0 0 52 25" {...CRSP} style={{ ...CRSP.style, ...style }}>
      {/* chairs — north row */}
      {[2,10,18,26,34,42].map(x => (
        <g key={x}>
          <rect x={x} y="0" width="8" height="5" fill="#6b3010" />
          <rect x={x} y="0" width="8" height="1" fill="#8b4020" />
          <rect x={x+1} y="1" width="6" height="3" fill="#7c3818" />
        </g>
      ))}
      {/* table */}
      <rect x="0" y="6"  width="52" height="13" fill={tc} />
      <rect x="0" y="6"  width="52" height="1"  fill="#b07840" />
      <rect x="0" y="17" width="52" height="2"  fill="#5c3010" />
      {/* table grain */}
      {[8,17,26,35,44].map(x => (
        <rect key={x} x={x} y="7" width="1" height="11" fill="rgba(0,0,0,0.08)" />
      ))}
      {/* table center line */}
      <rect x="0" y="12" width="52" height="1" fill="rgba(0,0,0,0.07)" />
      {/* papers on table */}
      {[3,14,25,36].map(x => (
        <rect key={x} x={x} y="8"  width="6" height="8" fill="#f0e8d0" opacity="0.55" />
      ))}
      {/* laptop */}
      <rect x="44" y="8"  width="6" height="4" fill="#1e2535" />
      <rect x="45" y="9"  width="4" height="2" fill="#1e3060" />
      {/* chairs — south row */}
      {[2,10,18,26,34,42].map(x => (
        <g key={x}>
          <rect x={x} y="20" width="8" height="5" fill="#6b3010" />
          <rect x={x} y="24" width="8" height="1" fill="#4a2010" />
          <rect x={x+1} y="20" width="6" height="3" fill="#7c3818" />
        </g>
      ))}
    </svg>
  )
}

/** Server/equipment rack */
function PxServerRack({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="40" height="80" viewBox="0 0 10 20" {...CRSP} style={{ ...CRSP.style, ...style }}>
      <rect width="10" height="20" fill="#1a1c2c" />
      <rect y="0" width="10" height="1" fill="#252840" />
      {[1,4,7,10,13,16].map(y => (
        <rect key={y} x="1" y={y} width="8" height="2" fill="#141628" />
      ))}
      {/* LED status lights */}
      {[1,4,7,10,13,16].map((y, i) => (
        <rect key={y} x="8" y={y} width="1" height="1"
          fill={i % 3 === 0 ? '#22c55e' : i % 3 === 1 ? '#3b82f6' : '#f59e0b'} opacity="0.95" />
      ))}
      {/* drive bays */}
      {[1,4,7,10].map(y => (
        <rect key={y} x="1" y={y} width="6" height="1" fill="#1e2030" />
      ))}
      <rect x="0" y="19" width="10" height="1" fill="#252840" />
    </svg>
  )
}

/** Dual-monitor workstation */
function PxDualDesk({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="96" height="56" viewBox="0 0 24 14" {...CRSP} style={{ ...CRSP.style, ...style }}>
      {/* desk */}
      <rect x="0" y="4" width="24" height="10" fill="#8b5c30" />
      <rect x="0" y="4" width="24" height="1"  fill="#a87040" />
      <rect x="0" y="12" width="24" height="2" fill="#5c3010" />
      {/* monitor L */}
      <rect x="1" y="0" width="10" height="6" fill="#1e2535" />
      <rect x="2" y="1" width="8"  height="4" fill="#1e3060" />
      <rect x="3" y="1" width="6"  height="1" fill="#2860d8" opacity="0.5" />
      <rect x="4" y="6" width="2"  height="1" fill="#374151" />
      {/* monitor R */}
      <rect x="13" y="0" width="10" height="6" fill="#1e2535" />
      <rect x="14" y="1" width="8"  height="4" fill="#10b981" opacity="0.6" />
      <rect x="15" y="1" width="6"  height="1" fill="#34d399" opacity="0.5" />
      <rect x="17" y="6" width="2"  height="1" fill="#374151" />
      {/* keyboard */}
      <rect x="2" y="7" width="10" height="4" fill="#d4c9b0" />
      <rect x="14" y="7" width="8"  height="4" fill="#d4c9b0" />
      {/* mouse pads */}
      <rect x="13" y="7" width="1" height="4" fill="#9ca3af" opacity="0.4" />
    </svg>
  )
}

/** Pinboard / mood board */
function PxPinboard({ style }: { style?: React.CSSProperties }) {
  const pins = [
    [8, 12, '#e07050'], [40, 20, '#50a0d0'], [18, 45, '#60c060'],
    [52, 50, '#d0a030'], [30, 28, '#c060c0'], [60, 20, '#e86030'],
  ]
  return (
    <div className="absolute pointer-events-none" style={style}>
      <svg width="64" height="72" viewBox="0 0 16 18" {...CRSP} style={CRSP.style}>
        {/* board surface */}
        <rect width="16" height="18" fill="#c8a060" />
        <rect y="0" width="16" height="1" fill="#d8b070" />
        <rect y="17" width="16" height="1" fill="#8a7040" />
        {/* frame */}
        <rect x="0" y="0" width="1" height="18" fill="#7c5020" />
        <rect x="15" y="0" width="1" height="18" fill="#7c5020" />
        {/* sticky notes */}
        <rect x="1" y="2" width="4" height="4" fill="#fde68a" opacity="0.9" />
        <rect x="6" y="1" width="4" height="5" fill="#bfdbfe" opacity="0.85" />
        <rect x="11" y="2" width="4" height="4" fill="#bbf7d0" opacity="0.85" />
        <rect x="2" y="8" width="5" height="4" fill="#fca5a5" opacity="0.85" />
        <rect x="9" y="7" width="5" height="5" fill="#ddd6fe" opacity="0.85" />
        <rect x="1" y="14" width="7" height="3" fill="#fed7aa" opacity="0.85" />
        {/* lines on notes */}
        <rect x="2" y="3" width="2" height="1" fill="rgba(0,0,0,0.2)" />
        <rect x="7" y="2" width="2" height="1" fill="rgba(0,0,0,0.2)" />
        <rect x="10" y="9" width="3" height="1" fill="rgba(0,0,0,0.2)" />
      </svg>
    </div>
  )
}

// ─── Room furniture layouts ───────────────────────────────────────────────────

function Furniture({ roomId, occupied }: { roomId: RoomId; occupied: boolean }) {
  if (roomId === 'great-hall') return (
    <div className="absolute inset-0 pointer-events-none">
      <PxMeetingTable
        occupied={occupied}
        style={{ position: 'absolute', left: '12%', top: '20%' }}
      />
      {/* whiteboard */}
      <svg width="52" height="32" viewBox="0 0 13 8"
        style={{ position: 'absolute', top: '6%', right: '4%', imageRendering: 'pixelated' }}
        shapeRendering="crispEdges">
        <rect width="13" height="8" fill="#f5f0e8" />
        <rect y="0" width="13" height="1" fill="#d8d0b8" />
        <rect y="7" width="13" height="1" fill="#b8b0a0" />
        <rect x="0" y="0" width="1" height="8" fill="#5c3010" />
        <rect x="12" y="0" width="1" height="8" fill="#5c3010" />
        <rect x="1" y="2" width="8" height="1" fill="#8090b0" opacity="0.7" />
        <rect x="1" y="4" width="5" height="1" fill="#a0b0d0" opacity="0.5" />
        <rect x="1" y="6" width="9" height="1" fill="#7088a0" opacity="0.4" />
      </svg>
      {/* projector screen hint */}
      <svg width="40" height="8" viewBox="0 0 10 2"
        style={{ position: 'absolute', top: '4%', left: '35%', imageRendering: 'pixelated' }}
        shapeRendering="crispEdges">
        <rect width="10" height="2" fill="#e8e0d0" />
        <rect y="0" width="10" height="1" fill="#d0c8b8" />
      </svg>
    </div>
  )

  if (roomId === 'headmaster') return (
    <div className="absolute inset-0 pointer-events-none">
      <PxDesk style={{ position: 'absolute', left: '22%', top: '28%' }} screenColor="#3060c0" />
      <PxChair style={{ position: 'absolute', left: '27%', top: '56%' }} />
      <PxBookshelf style={{ position: 'absolute', right: '4%', top: '10%' }} rows={2} />
      <PxCabinet style={{ position: 'absolute', left: '4%', top: '18%' }} />
      <PxPlant style={{ position: 'absolute', left: '6%', bottom: '10%' }} />
      {/* name plaque */}
      <svg width="40" height="10" viewBox="0 0 10 2.5"
        style={{ position: 'absolute', bottom: '8%', right: '20%', imageRendering: 'pixelated' }}
        shapeRendering="crispEdges">
        <rect width="10" height="3" fill="#c8a040" />
        <rect x="1" y="1" width="8" height="1" fill="#8b6820" opacity="0.6" />
      </svg>
    </div>
  )

  if (roomId === 'lab') return (
    <div className="absolute inset-0 pointer-events-none">
      <PxDualDesk style={{ position: 'absolute', left: '5%', top: '18%' }} />
      <PxChair style={{ position: 'absolute', left: '14%', top: '52%' }} />
      <PxServerRack style={{ position: 'absolute', right: '6%', top: '8%' }} />
      <PxServerRack style={{ position: 'absolute', right: '18%', top: '8%' }} />
      <PxPlant style={{ position: 'absolute', left: '4%', bottom: '8%' }} leafColor="#166534" />
      {/* cable tray / floor strip */}
      <svg width="4" height="56" viewBox="0 0 1 14"
        style={{ position: 'absolute', right: '30%', top: '10%', imageRendering: 'pixelated' }}
        shapeRendering="crispEdges">
        <rect width="1" height="14" fill="#1a1a2a" opacity="0.6" />
        {[1,3,5,7,9,11].map(y => <rect key={y} x="0" y={y} width="1" height="1" fill="#3b82f6" opacity="0.6" />)}
      </svg>
    </div>
  )

  if (roomId === 'operations') return (
    <div className="absolute inset-0 pointer-events-none">
      <PxDesk style={{ position: 'absolute', left: '8%', top: '15%' }} screenColor="#d97706" />
      <PxChair style={{ position: 'absolute', left: '13%', top: '50%' }} />
      <PxDesk style={{ position: 'absolute', left: '52%', top: '15%' }} screenColor="#f59e0b" />
      <PxChair style={{ position: 'absolute', left: '57%', top: '50%' }} />
      <PxPlant style={{ position: 'absolute', right: '5%', bottom: '8%' }} />
    </div>
  )

  if (roomId === 'creative') return (
    <div className="absolute inset-0 pointer-events-none">
      <PxDesk style={{ position: 'absolute', left: '8%', top: '15%' }} screenColor="#7c3aed" />
      <PxChair style={{ position: 'absolute', left: '13%', top: '50%' }} />
      <PxDesk style={{ position: 'absolute', left: '48%', top: '15%' }} screenColor="#db2777" />
      <PxChair style={{ position: 'absolute', left: '53%', top: '50%' }} />
      <PxPinboard style={{ position: 'absolute', right: '4%', top: '10%' }} />
    </div>
  )

  if (roomId === 'archive') return (
    <div className="absolute inset-0 pointer-events-none">
      <PxBookshelf style={{ position: 'absolute', left: '4%', top: '8%' }} rows={2} />
      <PxBookshelf style={{ position: 'absolute', left: '24%', top: '8%' }} rows={2} />
      <PxDesk style={{ position: 'absolute', right: '6%', top: '18%' }} screenColor="#10a060" />
      <PxChair style={{ position: 'absolute', right: '9%', top: '52%' }} />
      <PxCabinet style={{ position: 'absolute', right: '4%', bottom: '8%' }} />
    </div>
  )

  if (roomId === 'common') return (
    <div className="absolute inset-0 pointer-events-none">
      {/* couch + coffee table */}
      <PxCouch style={{ position: 'absolute', left: '2%', top: '12%' }} tileW={3} />
      <PxCoffeeTable style={{ position: 'absolute', left: '15%', top: '35%' }} />
      {/* plants flanking kitchen */}
      <PxPlant style={{ position: 'absolute', left: '27%', top: '5%' }} />
      <PxPlant style={{ position: 'absolute', left: '58%', top: '5%' }} />
      {/* kitchen area */}
      <PxCounter style={{ position: 'absolute', right: '4%', top: '12%' }} />
      <PxFridge style={{ position: 'absolute', right: '2%', bottom: '5%' }} />
    </div>
  )
  return null
}

// ─── Left toolbar ─────────────────────────────────────────────────────────────

function LeftToolbar({ active, setActive }: { active: string; setActive: (k: string) => void }) {
  const tools: ({ key: string; icon: React.ElementType; label: string } | null)[] = [
    { key: 'office',   icon: Monitor,       label: 'Office Map' },
    { key: 'agents',   icon: Bot,           label: 'Agents' },
    { key: 'chat',     icon: MessageSquare, label: 'Chat' },
    null,
    { key: 'env',      icon: Globe,         label: 'Environment' },
    { key: 'layout',   icon: Layers,        label: 'Layout' },
    { key: 'activity', icon: Activity,      label: 'Activity' },
    null,
    { key: 'settings', icon: Settings2,     label: 'Settings' },
  ]
  return (
    <aside className="w-11 flex-shrink-0 flex flex-col items-center py-2 gap-0.5 bg-[#0a0c14] border-r border-[#1e2030]">
      {/* logo */}
      <div className="w-7 h-7 rounded-md bg-purple-900/60 border border-purple-800/50 flex items-center justify-center mb-2">
        <span className="text-[11px]">⚡</span>
      </div>
      {tools.map((t, i) =>
        t === null
          ? <div key={i} className="w-6 h-px bg-[#1e2030] my-1 flex-shrink-0" />
          : (
            <button
              key={t.key}
              title={t.label}
              onClick={() => setActive(t.key)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                active === t.key
                  ? 'bg-[#2a2d3a] text-gray-200 shadow-inner'
                  : 'text-gray-600 hover:text-gray-400 hover:bg-[#141824]'
              }`}
            >
              <t.icon size={14} />
            </button>
          )
      )}
    </aside>
  )
}

// ─── Bottom bar ───────────────────────────────────────────────────────────────

function BottomBar({
  onlineCount, inMeetingCount, activeBotTab, setActiveBotTab,
}: {
  onlineCount: number; inMeetingCount: number
  activeBotTab: string; setActiveBotTab: (t: string) => void
}) {
  const tabs = [
    { key: 'environment', label: 'Environment', icon: Globe },
    { key: 'layout',      label: 'Layout',      icon: Layers },
    { key: 'settings',    label: 'Settings',    icon: Settings2 },
  ]
  return (
    <div className="flex-shrink-0 border-t border-[#1a1c28]">
      {/* button row */}
      <div className="flex items-center gap-1.5 px-3 h-9 bg-[#0d0f1a]">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveBotTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 h-6 rounded text-[11px] font-medium border transition-all ${
              activeBotTab === tab.key
                ? 'bg-[#2a2d3a] border-[#3a3d50] text-gray-200'
                : 'bg-[#161928] border-[#2a2d3a] text-gray-500 hover:text-gray-300 hover:bg-[#1e2130]'
            }`}
          >
            <tab.icon size={10} />
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[10px] text-green-500/80">{onlineCount}/7 online</span>
          {inMeetingCount > 0 && (
            <span className="text-[10px] text-blue-400/80 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse inline-block" />
              {inMeetingCount} in meeting
            </span>
          )}
        </div>
      </div>
      {/* status bar */}
      <div className="flex items-center gap-4 px-3 h-5 bg-[#07080e] border-t border-[#1a1c28]">
        <span className="text-[9px] text-purple-500/80 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse inline-block" />
          Hogwarts AI — active
        </span>
        <span className="text-[9px] text-gray-700">Next.js 14</span>
        <span className="text-[9px] text-gray-700">TypeScript</span>
        <span className="ml-auto text-[9px] text-gray-700">
          {format(new Date(), 'EEE MMM d · HH:mm')}
        </span>
        <span className="text-[9px] text-gray-700">UTF-8</span>
      </div>
    </div>
  )
}

// ─── MiniCharacter (floor plan sprite) ────────────────────────────────────────

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
      title={`${agent.name} — ${agent.currentRoom === 'great-hall' ? 'return to desk' : 'call to conference room'}`}
      style={{
        left: `${getPos(agent).x}%`, top: `${getPos(agent).y}%`,
        transform: 'translate(-50%, -50%)',
        transition: 'left 0.75s cubic-bezier(0.4,0,0.2,1), top 0.75s cubic-bezier(0.4,0,0.2,1)',
        zIndex: highlighted ? 100 : isWalking ? 50 : 10,
        willChange: isWalking ? 'left, top' : 'auto',
      }}
    >
      <div className="flex flex-col items-center">
        {/* status bubble */}
        <div style={{ height: 14, display: 'flex', alignItems: 'center', marginBottom: 1 }}>
          {highlighted                                   && <span className="status-pulse text-[11px]">💬</span>}
          {!highlighted && agent.status === 'working'    && <span className="status-pulse text-[11px]">💭</span>}
          {!highlighted && agent.status === 'in-meeting' && <span className="status-pulse text-[11px]">🗣️</span>}
          {!highlighted && agent.status === 'away'       && <span className="status-pulse text-[11px] opacity-60">💤</span>}
        </div>
        {/* sprite */}
        <div style={{
          transform: facingLeft ? 'scaleX(-1)' : 'scaleX(1)', transition: 'transform 0.12s',
          filter: agent.status === 'away' ? 'grayscale(1) opacity(0.45)' : glow,
        }}>
          {CharSVG && <CharSVG avatar={agent.avatar} isWalking={isWalking} status={agent.status} />}
        </div>
        {/* ground shadow */}
        <div style={{
          width: agent.name === 'HAGRID' ? 52 : 34, height: 5,
          background: 'rgba(0,0,0,0.4)', borderRadius: '50%', marginTop: 1, filter: 'blur(2.5px)',
        }} />
        {/* name tag */}
        <div style={{ marginTop: 2, pointerEvents: 'none' }}>
          <span style={{
            fontSize: 8, fontWeight: 700, color: highlighted ? '#93c5fd' : '#9ca3af',
            background: 'rgba(7,8,14,0.92)', borderRadius: 3, padding: '1px 4px', whiteSpace: 'nowrap',
            border: `1px solid ${highlighted ? 'rgba(96,165,250,0.4)' : 'rgba(30,32,48,0.8)'}`,
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
  // ── Office state ────────────────────────────────────────────────────────
  const [agents, setAgents]   = useState<AgentState[]>(INITIAL_AGENTS)
  const [moving, setMoving]   = useState<Set<string>>(new Set())
  const [log, setLog]         = useState<LogEntry[]>([
    { time: format(new Date(), 'HH:mm'), msg: 'All agents online and at their desks.', type: 'status' },
  ])

  // ── Chat state ──────────────────────────────────────────────────────────
  const [question, setQuestion]         = useState('')
  const [answer, setAnswer]             = useState('')
  const [respondingAgent, setRespondingAgent] = useState('')
  const [respondingColor, setRespondingColor] = useState('purple')
  const [respondingAvatar, setRespondingAvatar] = useState('')
  const [loading, setLoading]     = useState(false)
  const [chatError, setChatError] = useState('')
  const [activeAgent, setActiveAgent]   = useState<string | null>(null)
  const [responseId, setResponseId]     = useState(0)

  // ── Brief state ─────────────────────────────────────────────────────────
  const [briefActive, setBriefActive]   = useState(false)
  const [briefEntries, setBriefEntries] = useState<BriefEntry[]>([])
  const [briefDone, setBriefDone]       = useState(false)
  const briefScrollRef = useRef<HTMLDivElement>(null)

  // ── UI state ────────────────────────────────────────────────────────────
  const [activeTool, setActiveTool]     = useState('office')
  const [activeBotTab, setActiveBotTab] = useState('environment')

  // When a new response arrives → agent walks to conference room and starts talking
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

  // ── Office helpers ───────────────────────────────────────────────────────
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
      pushLog(`${name} walked to the Conference Room.`, 'move')
    }
  }
  function assembleMeeting() {
    startMoving(agents.map(a => a.name))
    setAgents(p => p.map(a => ({ ...a, currentRoom: 'great-hall', status: 'in-meeting' })))
    pushLog('Full team assembled in the Conference Room.', 'meeting')
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

  // ── /brief — sequential multi-agent briefing ──────────────────────────────
  async function runBrief() {
    setBriefActive(true)
    setBriefDone(false)
    setBriefEntries([])
    setAnswer('')
    setChatError('')

    // Move all specialist agents to the conference room to kick things off
    const specialistNames = BRIEF_SEQUENCE.map(s => s.name)
    startMoving(specialistNames)
    setAgents(p => p.map(a =>
      specialistNames.includes(a.name) ? { ...a, currentRoom: 'great-hall', status: 'in-meeting' } : a
    ))
    pushLog('📋 /brief initiated — all agents assembling.', 'meeting')

    // Small stagger so the walking animations look natural
    await new Promise(r => setTimeout(r, 700))

    const collected: { name: string; text: string }[] = []

    for (const step of BRIEF_SEQUENCE) {
      // Add a loading card for this agent
      setBriefEntries(p => [
        ...p,
        { agent: step.name, role: step.role, color: step.color, avatar: step.avatar, text: '', loading: true },
      ])
      // Scroll to the new card
      setTimeout(() => {
        briefScrollRef.current?.scrollTo({ top: briefScrollRef.current.scrollHeight, behavior: 'smooth' })
      }, 50)

      // Call the API with a forced @mention so the correct agent responds
      let text = ''
      try {
        const res  = await fetch('/api/agents/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: `@${step.name.toLowerCase()} ${step.prompt}` }),
        })
        const data = await res.json()
        text = data.answer ?? '(no response)'
      } catch {
        text = '(error fetching response)'
      }

      collected.push({ name: step.name, text })
      setBriefEntries(p => p.map(e => e.agent === step.name ? { ...e, text, loading: false } : e))
      setTimeout(() => {
        briefScrollRef.current?.scrollTo({ top: briefScrollRef.current.scrollHeight, behavior: 'smooth' })
      }, 50)
    }

    // ── Dumbledore synthesis ─────────────────────────────────────────────────
    setBriefEntries(p => [
      ...p,
      { agent: 'DUMBLEDORE', role: 'Executive synthesis', color: 'purple', avatar: '/agents/DUMBLEDORE_Cyborg.png', text: '', loading: true },
    ])
    startMoving(['DUMBLEDORE'])
    setAgents(p => p.map(a => a.name === 'DUMBLEDORE' ? { ...a, currentRoom: 'great-hall', status: 'in-meeting' } : a))
    pushLog('DUMBLEDORE synthesising the brief.', 'chat')
    setTimeout(() => {
      briefScrollRef.current?.scrollTo({ top: briefScrollRef.current.scrollHeight, behavior: 'smooth' })
    }, 50)

    const synthesisPrompt = [
      'Here are this week\'s team reports:',
      '',
      ...collected.map(c => `**${c.name}:** ${c.text}`),
      '',
      'Now write the executive brief synthesizing all of the above. Use these exact sections:',
      '🔮 HIGHLIGHTS — top 2–3 wins or notable moments',
      '⚠️ RISKS & BLOCKERS — what needs Jay\'s immediate attention',
      '🎯 FOCUS — the single #1 priority for next week',
      '👥 TEAM HEALTH — one sentence',
      '🚀 NEXT WEEK — exactly 3 action bullets',
      '',
      'Be direct, sharp, and actionable. Jay reads this in under 60 seconds.',
    ].join('\n')

    let synthesis = ''
    try {
      const synthRes  = await fetch('/api/agents/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: `@dumbledore ${synthesisPrompt}` }),
      })
      const synthData = await synthRes.json()
      synthesis = synthData.answer ?? '(no response)'
    } catch {
      synthesis = '(error fetching synthesis)'
    }

    setBriefEntries(p => p.map(e => e.agent === 'DUMBLEDORE' ? { ...e, text: synthesis, loading: false } : e))
    setBriefDone(true)
    pushLog('📋 /brief complete — executive brief ready.', 'meeting')
    setTimeout(() => {
      briefScrollRef.current?.scrollTo({ top: briefScrollRef.current.scrollHeight, behavior: 'smooth' })
    }, 50)

    // Return everyone to their desks after 60 s
    setTimeout(() => {
      const allNames = [...specialistNames, 'DUMBLEDORE']
      startMoving(allNames)
      setAgents(p => p.map(a => ({ ...a, currentRoom: a.homeRoom, status: 'online' })))
      pushLog('Brief done — agents back to their desks.', 'move')
    }, 60_000)
  }

  // ── Chat helpers ─────────────────────────────────────────────────────────
  function mentionAgent(name: string) {
    setQuestion(`@${name.toLowerCase()} `)
    setActiveAgent(name)
    setTimeout(() => { const el = document.getElementById('hw-input'); if (el) (el as HTMLInputElement).focus() }, 50)
  }

  async function ask() {
    if (!question.trim() || loading) return

    // ── /brief command ────────────────────────────────────────────────────
    if (question.trim().toLowerCase() === '/brief') {
      setQuestion('')
      runBrief()
      return
    }

    setLoading(true); setChatError(''); setAnswer(''); setRespondingAgent(''); setActiveAgent(null)
    setBriefActive(false)
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
    finally { setLoading(false); setQuestion('') }
  }

  const onlineCount    = agents.filter(a => a.status !== 'away').length
  const inMeetingCount = agents.filter(a => a.currentRoom === 'great-hall').length

  return (
    <div className="h-screen flex flex-col bg-[#0a0c14] overflow-hidden">

      {/* ── Title bar ──────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-[#0d0f1a] border-b border-[#1e2030] px-4 py-2 z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">Hogwarts AI</span>
              <span className="text-[10px] text-gray-700 font-mono">v1.0</span>
            </div>
            <span className="text-gray-700 text-sm">·</span>
            <span className="text-[11px] text-gray-600 hidden sm:block font-mono">
              {format(new Date(), 'EEE MMM d')}
            </span>
            <NavTabs active="hogwarts" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-green-400 bg-green-900/15 border border-green-800/30 rounded px-2 py-0.5">
              <Wifi size={9} /> {onlineCount}/7
            </div>
            {inMeetingCount > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-900/15 border border-blue-800/30 rounded px-2 py-0.5">
                <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" /> {inMeetingCount} meeting
              </div>
            )}
            <button onClick={simulateWork}    className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 border border-amber-800/40 bg-amber-900/15 rounded px-2 py-0.5 transition-colors"><Zap size={9} /> Work</button>
            <button onClick={assembleMeeting} className="flex items-center gap-1 text-[10px] text-blue-400  hover:text-blue-300  border border-blue-800/40  bg-blue-900/15  rounded px-2 py-0.5 transition-colors"><Users size={9} /> Meet</button>
            <button onClick={dismissMeeting}  className="flex items-center gap-1 text-[10px] text-gray-400  hover:text-gray-300  border border-[#2a2d3a]    bg-[#161928]    rounded px-2 py-0.5 transition-colors"><RotateCcw size={9} /> Dismiss</button>
          </div>
        </div>
      </header>

      {/* ── Body: toolbar + content ─────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">

        {/* ── Left toolbar ──────────────────────────────────────────────────── */}
        <LeftToolbar active={activeTool} setActive={setActiveTool} />

        {/* ── Content area ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">

          {/* ── Main canvas ─────────────────────────────────────────────────── */}
          <main className="flex-1 min-h-0 flex gap-3 p-3">

            {/* ── Floor plan ────────────────────────────────────────────────── */}
            <div
              className="flex-1 min-w-0 relative rounded-xl overflow-hidden border-2 border-[#1a0e06]"
              style={{
                background: '#8b5c30',
                backgroundImage: [
                  // wood plank horizontal grain lines (every 16px)
                  'repeating-linear-gradient(0deg, rgba(0,0,0,0.07) 0px, rgba(0,0,0,0.07) 1px, transparent 1px, transparent 16px)',
                  // subtle vertical plank separators (every 64px)
                  'repeating-linear-gradient(90deg, rgba(80,40,5,0.2) 0px, rgba(80,40,5,0.2) 2px, transparent 2px, transparent 64px)',
                  // faint 32px tile grid overlay
                  'repeating-linear-gradient(90deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 32px)',
                  'repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 32px)',
                ].join(', '),
              }}
            >
              {/* ── Room zones ──────────────────────────────────────────────── */}
              {(Object.entries(ROOMS) as [RoomId, RoomConfig][]).map(([roomId, room]) => {
                const occupants = agents.filter(a => a.currentRoom === roomId)
                const isLive    = roomId === 'great-hall' && occupants.length > 0
                return (
                  <div
                    key={roomId}
                    className={`absolute border-2 transition-all duration-500 ${room.bg} ${room.border} ${isLive ? 'shadow-xl shadow-blue-400/25' : ''}`}
                    style={{ ...room.style, margin: 3, width: `calc(${room.style.width} - 6px)`, height: `calc(${room.style.height} - 6px)` }}
                  >
                    {/* room label */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none z-10"
                      style={{ background: 'rgba(7,8,14,0.6)', borderRadius: 4, padding: '2px 5px' }}>
                      <span className="text-[10px] leading-none">{room.emoji}</span>
                      <div>
                        <p className={`text-[9px] font-bold tracking-wide ${room.textColor}`}>{room.label}</p>
                        <p className="text-[7px] text-[#9a8060] uppercase tracking-widest">{room.sublabel}</p>
                      </div>
                      {isLive && (
                        <span className="flex items-center gap-0.5 text-[8px] text-blue-400 bg-blue-900/40 rounded px-1 border border-blue-800/40 ml-1">
                          <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" /> LIVE
                        </span>
                      )}
                    </div>
                    {/* furniture */}
                    <Furniture roomId={roomId} occupied={occupants.length > 0} />
                  </div>
                )
              })}

              {/* ── Walls (thick dark dividers) ──────────────────────────────── */}
              {[
                { left: '22%', top: '0%',  width: 4, height: '44%' },
                { left: '64%', top: '0%',  width: 4, height: '44%' },
                { left: '28%', top: '44%', width: 4, height: '38%' },
                { left: '64%', top: '44%', width: 4, height: '38%' },
                { left: '0%',  top: '82%', width: '100%', height: 4 },
              ].map((d, i) => (
                <div key={i} className="absolute pointer-events-none"
                  style={{ ...d, background: '#1a0e06', opacity: 0.9 }} />
              ))}

              {/* ── Agent sprites ────────────────────────────────────────────── */}
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

            {/* ── Right panel (chat) ────────────────────────────────────────── */}
            <div className="w-[376px] flex-shrink-0 flex flex-col gap-2">

              {/* Agent roster */}
              <div className="flex-shrink-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-2.5">
                <p className="text-[9px] font-semibold text-gray-700 uppercase tracking-wider mb-2">
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
                          ${activeAgent === agent.name ? 'ring-2 ring-offset-1 ring-offset-[#0d0f1a] ' + RING_MAP[agent.color] : ''}
                        `}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="relative flex-shrink-0">
                            <AgentAvatar avatar={agent.avatar} name={agent.name} color={agent.color} size={24} />
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-[#0d0f1a] ${
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

              {/* ── Response area: brief thread OR single answer ──────────── */}
              <div
                ref={briefScrollRef}
                className="flex-1 min-h-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] overflow-y-auto p-3
                  [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent
                  [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full"
              >

                {/* ── /brief thread ──────────────────────────────────────── */}
                {briefActive && (
                  <div className="space-y-2">
                    {/* header */}
                    <div className="flex items-center gap-2 pb-2 border-b border-[#1e2030]">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">📋 End-of-Week Brief</span>
                      {!briefDone && <Loader2 size={10} className="animate-spin text-purple-500 ml-auto" />}
                      {briefDone && (
                        <button
                          onClick={() => {
                            const text = briefEntries.map(e => `— ${e.agent} (${e.role})\n${e.text}`).join('\n\n')
                            navigator.clipboard.writeText(text)
                          }}
                          className="ml-auto text-[9px] text-gray-500 hover:text-gray-300 border border-[#2a2d3a] rounded px-2 py-0.5 transition-colors"
                        >
                          Copy brief
                        </button>
                      )}
                    </div>

                    {/* agent report cards */}
                    {briefEntries.map((entry, i) => {
                      const isDumbledore = entry.agent === 'DUMBLEDORE'
                      return (
                        <div
                          key={i}
                          className={`rounded-lg border p-2.5 transition-all ${
                            isDumbledore
                              ? 'border-purple-700/50 bg-purple-900/20'
                              : 'border-[#1e2030] bg-[#0a0c14]'
                          }`}
                        >
                          {/* card header */}
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <AgentAvatar
                              avatar={entry.avatar}
                              name={entry.agent}
                              color={entry.color}
                              size={isDumbledore ? 26 : 20}
                            />
                            <div className="flex-1 min-w-0">
                              <span className={`text-[10px] font-bold uppercase tracking-wide ${TEXT_MAP[entry.color] ?? 'text-gray-300'}`}>
                                {entry.agent === 'McGONAGALL' ? 'McGONAGALL' : entry.agent}
                              </span>
                              <span className="text-[8px] text-gray-600 ml-1.5">{entry.role}</span>
                            </div>
                            {entry.loading && <Loader2 size={9} className="animate-spin text-gray-600 flex-shrink-0" />}
                          </div>
                          {/* card body */}
                          {entry.loading && (
                            <div className="space-y-1">
                              <div className="h-2 bg-[#1e2030] rounded animate-pulse w-full" />
                              <div className="h-2 bg-[#1e2030] rounded animate-pulse w-4/5" />
                              <div className="h-2 bg-[#1e2030] rounded animate-pulse w-3/5" />
                            </div>
                          )}
                          {!entry.loading && entry.text && (
                            <p className={`leading-relaxed whitespace-pre-wrap ${isDumbledore ? 'text-[11px] text-gray-200' : 'text-[10px] text-gray-400'}`}>
                              {entry.text}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ── Single agent answer ────────────────────────────────── */}
                {!briefActive && !answer && !chatError && !loading && (
                  <div className="flex flex-col items-center justify-center h-full gap-2.5 text-center">
                    <Image src="/agents/Hogwarts_Cyborg.png" alt="Hogwarts" width={40} height={40}
                      className="rounded-xl object-cover object-top opacity-40" />
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Ask a question or type <span className="text-purple-500 font-mono">/brief</span><br />
                      to run the full team briefing.
                    </p>
                  </div>
                )}
                {!briefActive && loading && (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <Loader2 size={22} className="animate-spin text-purple-500 opacity-70" />
                    <p className="text-xs text-gray-600">Consulting agents…</p>
                  </div>
                )}
                {!briefActive && chatError && !loading && (
                  <div className="rounded-lg border border-red-800/40 bg-red-900/20 p-3 text-xs text-red-300">⚠️ {chatError}</div>
                )}
                {!briefActive && answer && !loading && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-[#1e2030]">
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
              <div className="flex-shrink-0 h-[72px] bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-2 overflow-y-auto
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
                  placeholder="@mention an agent, ask anything, or /brief…"
                  className="flex-1 bg-[#07080e] border border-[#1e2030] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-purple-700/60 transition-colors"
                />
                <button
                  onClick={ask}
                  disabled={!question.trim() || loading}
                  className="flex-shrink-0 bg-purple-800/80 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 transition-colors"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </main>

          {/* ── Bottom bar ──────────────────────────────────────────────────── */}
          <BottomBar
            onlineCount={onlineCount}
            inMeetingCount={inMeetingCount}
            activeBotTab={activeBotTab}
            setActiveBotTab={setActiveBotTab}
          />

        </div>
      </div>
    </div>
  )
}
