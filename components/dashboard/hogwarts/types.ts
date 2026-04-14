import type { ComponentType } from 'react'
import {
  DumbledoreCharacter, HermioneCharacter, HarryCharacter,
  RonCharacter, McGonagallCharacter, SnapeCharacter, HagridCharacter,
} from '../OfficeCharacters'

// ─── Office types ─────────────────────────────────────────────────────────────

export type RoomId      = 'headmaster' | 'great-hall' | 'lab' | 'operations' | 'creative' | 'archive' | 'common'
export type AgentStatus = 'online' | 'working' | 'in-meeting' | 'away'
export interface Pos { x: number; y: number }
export interface AgentState {
  name: string; role: string; homeRoom: RoomId; currentRoom: RoomId
  status: AgentStatus; color: string; avatar: string
}
export interface LogEntry  { time: string; msg: string; type: 'move' | 'status' | 'meeting' | 'chat' }
export interface BriefEntry { agent: string; role: string; color: string; avatar: string; text: string; loading: boolean }

export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  agent?: string
  agentColor?: string
  agentAvatar?: string
  attachments?: { dataUrl: string; name: string; type: string }[]
  timestamp: string
}
export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface RoomConfig {
  label: string; sublabel: string; emoji: string
  style: React.CSSProperties; border: string; bg: string; textColor: string; isMeeting?: boolean
}

// ─── Agent master data ────────────────────────────────────────────────────────

export const AGENTS_DEF = [
  { name: 'DUMBLEDORE', role: 'Chief of Staff',        commands: ['/brief', '/eod'],      color: 'purple', homeRoom: 'headmaster' as const,  avatar: '/agents/DUMBLEDORE_Cyborg.png' },
  { name: 'HERMIONE',   role: 'Production Controller', commands: ['/status', '/blockers'], color: 'amber',  homeRoom: 'operations' as const,  avatar: '/agents/HERMIONE_Cyborg.png'   },
  { name: 'HARRY',      role: 'Creative Review',       commands: ['/review'],             color: 'red',    homeRoom: 'creative' as const,    avatar: '/agents/HARRY_Cyborg.png'      },
  { name: 'RON',        role: 'Strategic Ideation',    commands: ['/brainstorm'],         color: 'orange', homeRoom: 'creative' as const,    avatar: '/agents/RON_Cyborg.png'        },
  { name: 'McGONAGALL', role: 'SOP Builder',           commands: ['/sop', '/workflow'],   color: 'green',  homeRoom: 'archive' as const,     avatar: '/agents/McGONAGALL_Cyborg.png' },
  { name: 'SNAPE',      role: 'AI Scout',              commands: ['/ai-scout'],           color: 'slate',  homeRoom: 'lab' as const,         avatar: '/agents/SNAPE_Cyborg.png'      },
  { name: 'HAGRID',     role: 'People Manager',        commands: ['/1on1-prep'],          color: 'brown',  homeRoom: 'common' as const,      avatar: '/agents/HAGRID_Cyborg.png'     },
]

// ─── Colour maps ──────────────────────────────────────────────────────────────

export const COLOR_MAP: Record<string, string> = {
  purple: 'bg-purple-900/30 border-purple-800/50 text-purple-300',
  amber:  'bg-amber-900/30 border-amber-800/50 text-amber-300',
  red:    'bg-red-900/30 border-red-800/50 text-red-300',
  orange: 'bg-orange-900/30 border-orange-800/50 text-orange-300',
  green:  'bg-emerald-900/30 border-emerald-800/50 text-emerald-300',
  slate:  'bg-slate-800/50 border-slate-700/50 text-slate-300',
  brown:  'bg-yellow-900/20 border-yellow-800/30 text-yellow-300',
}
export const RING_MAP: Record<string, string> = {
  purple: 'ring-purple-700/60', amber: 'ring-amber-700/60', red: 'ring-red-700/60',
  orange: 'ring-orange-700/60', green: 'ring-emerald-700/60', slate: 'ring-slate-600/60', brown: 'ring-yellow-700/60',
}
export const TEXT_MAP: Record<string, string> = {
  purple: 'text-purple-300', amber: 'text-amber-300', red: 'text-red-300',
  orange: 'text-orange-300', green: 'text-emerald-300', slate: 'text-slate-300', brown: 'text-yellow-300',
}
export const BADGE_MAP: Record<string, string> = {
  purple: 'bg-purple-900/50 text-purple-400', amber: 'bg-amber-900/50 text-amber-400',
  red: 'bg-red-900/50 text-red-400', orange: 'bg-orange-900/50 text-orange-400',
  green: 'bg-emerald-900/50 text-emerald-400', slate: 'bg-slate-800 text-slate-400',
  brown: 'bg-yellow-900/40 text-yellow-400',
}

// ─── Room config ──────────────────────────────────────────────────────────────

export const ROOMS: Record<RoomId, RoomConfig> = {
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

export const GLOW: Record<string, string> = {
  purple: 'drop-shadow(0 0 6px rgba(139,92,246,0.8))',
  amber:  'drop-shadow(0 0 6px rgba(251,191,36,0.8))',
  red:    'drop-shadow(0 0 6px rgba(239,68,68,0.8))',
  orange: 'drop-shadow(0 0 6px rgba(249,115,22,0.8))',
  green:  'drop-shadow(0 0 6px rgba(52,211,153,0.8))',
  slate:  'drop-shadow(0 0 6px rgba(148,163,184,0.6))',
  brown:  'drop-shadow(0 0 6px rgba(234,179,8,0.6))',
}

export const CHARACTER_MAP: Record<string, ComponentType<{ avatar: string; isWalking: boolean; status: AgentStatus }>> = {
  DUMBLEDORE: DumbledoreCharacter, HERMIONE: HermioneCharacter, HARRY: HarryCharacter,
  RON: RonCharacter, McGONAGALL: McGonagallCharacter, SNAPE: SnapeCharacter, HAGRID: HagridCharacter,
}

// ─── Position maps (% of floor plan) ─────────────────────────────────────────

export const DESK_POS: Record<string, Pos> = {
  DUMBLEDORE: { x: 9,  y: 24 }, SNAPE:      { x: 80, y: 24 },
  HERMIONE:   { x: 12, y: 63 }, HARRY:      { x: 34, y: 62 },
  RON:        { x: 46, y: 70 }, McGONAGALL: { x: 74, y: 62 },
  HAGRID:     { x: 11, y: 90 },
}
export const MEETING_POS: Record<string, Pos> = {
  DUMBLEDORE: { x: 30, y: 14 }, HERMIONE:   { x: 38, y: 14 },
  HARRY:      { x: 46, y: 14 }, RON:        { x: 54, y: 14 },
  McGONAGALL: { x: 34, y: 32 }, SNAPE:      { x: 46, y: 34 },
  HAGRID:     { x: 56, y: 22 },
}
export function getPos(agent: AgentState): Pos {
  return agent.currentRoom === 'great-hall' ? MEETING_POS[agent.name] : DESK_POS[agent.name]
}

// ─── /brief command — agent sequence + prompts ────────────────────────────────

export const BRIEF_SEQUENCE: { name: string; role: string; color: string; avatar: string; prompt: string }[] = [
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

// ─── Initial state ────────────────────────────────────────────────────────────

export const INITIAL_AGENTS: AgentState[] = AGENTS_DEF.map(a => ({
  name: a.name, role: a.role, homeRoom: a.homeRoom, currentRoom: a.homeRoom,
  status: 'online' as AgentStatus, color: a.color, avatar: a.avatar,
}))

// ─── Conversation persistence ─────────────────────────────────────────────────

export const HW_CONVO_KEY = 'hw-conversations'
export function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(HW_CONVO_KEY) ?? '[]') } catch { return [] }
}
export function saveConversations(convos: Conversation[]) {
  try { localStorage.setItem(HW_CONVO_KEY, JSON.stringify(convos.slice(0, 60))) } catch {}
}
