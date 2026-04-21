import type { ComponentType } from 'react'
import {
  DumbledoreCharacter, HermioneCharacter, HarryCharacter,
  RonCharacter, McGonagallCharacter, SnapeCharacter, HagridCharacter,
  LunaCharacter, GinnyCharacter, NevilleCharacter, DracoCharacter,
  SiriusCharacter, LupinCharacter, FredCharacter, GeorgeCharacter,
  FleurCharacter, MoodyCharacter, TrelawneyCharacter, DobbyCharacter,
  ArthurCharacter, TonksCharacter, KingsleyCharacter,
} from '../OfficeCharacters'

// ─── Office types ─────────────────────────────────────────────────────────────

export type RoomId      = 'headmaster' | 'great-hall' | 'library' | 'lab' | 'requirement' | 'auror' | 'clocktower' | 'broomsticks'
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
  label: string; sublabel: string; emoji: string; num: number
  style: React.CSSProperties; border: string; bg: string; textColor: string
  zoomOrigin: string
  isMeeting?: boolean
}

// ─── Agent master data ────────────────────────────────────────────────────────

export const AGENTS_DEF = [
  { name: 'DUMBLEDORE', role: 'Chief of Staff',          commands: ['/brief', '/eod'],         color: 'purple',  homeRoom: 'headmaster'  as const, avatar: '/agents/DUMBLEDORE_Cyborg.png'  },
  { name: 'HERMIONE',   role: 'Production Controller',   commands: ['/status', '/blockers'],    color: 'amber',   homeRoom: 'library'     as const, avatar: '/agents/HERMIONE_Cyborg.png'    },
  { name: 'HARRY',      role: 'Creative Review',         commands: ['/review'],                color: 'red',     homeRoom: 'clocktower'  as const, avatar: '/agents/HARRY_Cyborg.png'       },
  { name: 'RON',        role: 'Strategic Ideation',      commands: ['/brainstorm'],            color: 'orange',  homeRoom: 'clocktower'  as const, avatar: '/agents/RON_Cyborg.png'         },
  { name: 'McGONAGALL', role: 'SOP Builder',             commands: ['/sop', '/workflow'],      color: 'green',   homeRoom: 'requirement' as const, avatar: '/agents/McGONAGALL_Cyborg.png'  },
  { name: 'SNAPE',      role: 'AI Scout',                commands: ['/ai-scout', '/mp'],       color: 'slate',   homeRoom: 'lab'         as const, avatar: '/agents/SNAPE_Cyborg.png'       },
  { name: 'HAGRID',     role: 'People Manager',          commands: ['/1on1-prep'],             color: 'brown',   homeRoom: 'auror'       as const, avatar: '/agents/HAGRID_Cyborg.png'      },
  { name: 'LUNA',       role: 'GFX Director',            commands: ['/gfx', '/motion'],        color: 'teal',    homeRoom: 'lab'         as const, avatar: '/agents/LUNA_Cyborg.png'        },
  { name: 'GINNY',      role: 'Social Media & Growth',   commands: ['/social', '/reels'],      color: 'crimson', homeRoom: 'clocktower'  as const, avatar: '/agents/GINNY_Cyborg.png'       },
  { name: 'NEVILLE',    role: 'QA & Research',           commands: ['/qa', '/research'],       color: 'lime',    homeRoom: 'requirement' as const, avatar: '/agents/NEVILLE_Cyborg.png'     },
  { name: 'DRACO',      role: "Devil's Advocate",        commands: ['/challenge', '/critique'], color: 'silver', homeRoom: 'broomsticks' as const, avatar: '/agents/DRACO_Cyborg.png'       },
  { name: 'SIRIUS',     role: 'Brand Strategist',        commands: ['/brand', '/position'],    color: 'indigo',  homeRoom: 'broomsticks' as const, avatar: '/agents/SIRIUS_Cyborg.png'      },
  { name: 'LUPIN',      role: 'Onboarding & Training',   commands: ['/onboard', '/train'],     color: 'stone',   homeRoom: 'requirement' as const, avatar: '/agents/LUPIN_Cyborg.png'       },
  { name: 'FRED',       role: 'Viral Content',           commands: ['/viral', '/hooks'],       color: 'coral',   homeRoom: 'clocktower'  as const, avatar: '/agents/FRED & GEORGE_Cyborg.png'   },
  { name: 'GEORGE',     role: 'Content Experiments',     commands: ['/experiment', '/ab'],     color: 'tangerine', homeRoom: 'clocktower' as const, avatar: '/agents/FRED & GEORGE_Cyborg.png' },
  { name: 'FLEUR',      role: 'Brand & Naming',          commands: ['/name', '/copy'],         color: 'sky',     homeRoom: 'clocktower'  as const, avatar: '/agents/FLEUR_Cyborg.png'       },
  { name: 'MOODY',      role: 'Audit & Risk',            commands: ['/audit', '/qc'],          color: 'zinc',    homeRoom: 'lab'         as const, avatar: '/agents/MOODY_Cyborg.png'       },
  { name: 'TRELAWNEY',  role: 'Trends & Forecasting',    commands: ['/trends', '/forecast'],   color: 'violet',  homeRoom: 'lab'         as const, avatar: '/agents/TRELAWNEY_Cyborg.png'   },
  { name: 'DOBBY',      role: 'Task Automator',          commands: ['/tasks', '/automate'],    color: 'sage',    homeRoom: 'auror'       as const, avatar: '/agents/DOBBY_Cyborg.png'       },
  { name: 'ARTHUR',     role: 'Legal & Compliance',      commands: ['/legal', '/policy'],      color: 'maroon',  homeRoom: 'requirement' as const, avatar: '/agents/ARTHUR_Cyborg.png'      },
  { name: 'TONKS',      role: 'Wildcard Agent',          commands: ['/anything', '/flex'],     color: 'pink',    homeRoom: 'broomsticks' as const, avatar: '/agents/TONKS_Cyborg.png'       },
  { name: 'KINGSLEY',   role: 'Crisis Manager',          commands: ['/crisis', '/escalate'],   color: 'gold',    homeRoom: 'library'     as const, avatar: '/agents/KINGSLEY_Cyborg.png'    },
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
  teal:      'bg-teal-900/30 border-teal-800/50 text-teal-300',
  crimson:   'bg-red-900/30 border-red-700/50 text-red-200',
  lime:      'bg-lime-900/30 border-lime-800/50 text-lime-300',
  silver:    'bg-slate-800/40 border-slate-500/50 text-slate-200',
  indigo:    'bg-indigo-900/30 border-indigo-800/50 text-indigo-300',
  stone:     'bg-stone-800/40 border-stone-700/50 text-stone-300',
  coral:     'bg-orange-900/25 border-orange-700/40 text-orange-200',
  tangerine: 'bg-orange-800/30 border-orange-600/40 text-orange-300',
  sky:       'bg-sky-900/30 border-sky-800/50 text-sky-300',
  zinc:      'bg-zinc-800/50 border-zinc-600/50 text-zinc-200',
  violet:    'bg-violet-900/30 border-violet-800/50 text-violet-300',
  sage:      'bg-teal-900/20 border-teal-700/30 text-teal-200',
  maroon:    'bg-rose-900/30 border-rose-800/50 text-rose-300',
  pink:      'bg-pink-900/30 border-pink-800/50 text-pink-300',
  gold:      'bg-yellow-800/25 border-yellow-700/40 text-yellow-200',
}
export const RING_MAP: Record<string, string> = {
  purple: 'ring-purple-700/60', amber: 'ring-amber-700/60', red: 'ring-red-700/60',
  orange: 'ring-orange-700/60', green: 'ring-emerald-700/60', slate: 'ring-slate-600/60', brown: 'ring-yellow-700/60',
  teal: 'ring-teal-700/60', crimson: 'ring-red-600/60', lime: 'ring-lime-700/60',
  silver: 'ring-slate-500/60', indigo: 'ring-indigo-700/60', stone: 'ring-stone-600/60',
  coral: 'ring-orange-600/60', tangerine: 'ring-orange-500/60', sky: 'ring-sky-600/60',
  zinc: 'ring-zinc-500/60', violet: 'ring-violet-700/60', sage: 'ring-teal-600/50',
  maroon: 'ring-rose-700/60', pink: 'ring-pink-700/60', gold: 'ring-yellow-600/60',
}
export const TEXT_MAP: Record<string, string> = {
  purple: 'text-purple-300', amber: 'text-amber-300', red: 'text-red-300',
  orange: 'text-orange-300', green: 'text-emerald-300', slate: 'text-slate-300', brown: 'text-yellow-300',
  teal: 'text-teal-300', crimson: 'text-red-200', lime: 'text-lime-300',
  silver: 'text-slate-200', indigo: 'text-indigo-300', stone: 'text-stone-300',
  coral: 'text-orange-200', tangerine: 'text-orange-300', sky: 'text-sky-300',
  zinc: 'text-zinc-200', violet: 'text-violet-300', sage: 'text-teal-200',
  maroon: 'text-rose-300', pink: 'text-pink-300', gold: 'text-yellow-200',
}
export const BADGE_MAP: Record<string, string> = {
  purple: 'bg-purple-900/50 text-purple-400', amber: 'bg-amber-900/50 text-amber-400',
  red: 'bg-red-900/50 text-red-400', orange: 'bg-orange-900/50 text-orange-400',
  green: 'bg-emerald-900/50 text-emerald-400', slate: 'bg-slate-800 text-slate-400',
  brown: 'bg-yellow-900/40 text-yellow-400',
  teal: 'bg-teal-900/50 text-teal-400', crimson: 'bg-red-900/50 text-red-300',
  lime: 'bg-lime-900/50 text-lime-400', silver: 'bg-slate-700 text-slate-300',
  indigo: 'bg-indigo-900/50 text-indigo-400', stone: 'bg-stone-800 text-stone-300',
  coral: 'bg-orange-900/40 text-orange-300', tangerine: 'bg-orange-800/40 text-orange-400',
  sky: 'bg-sky-900/50 text-sky-400', zinc: 'bg-zinc-800 text-zinc-300',
  violet: 'bg-violet-900/50 text-violet-400', sage: 'bg-teal-900/40 text-teal-300',
  maroon: 'bg-rose-900/50 text-rose-400', pink: 'bg-pink-900/50 text-pink-400',
  gold: 'bg-yellow-800/40 text-yellow-300',
}

// ─── Room config ──────────────────────────────────────────────────────────────

// Room positions calibrated to hogwarts-bg_Clean.png (1402×1122px, background-size:100% 100%)
// Col dividers: ~30% and ~69% | Row dividers: ~8% (post-title), ~48%, ~77%
export const ROOMS: Record<RoomId, RoomConfig> = {
  'headmaster': {
    num: 1, label: "The Headmaster's Tower", sublabel: 'Private', emoji: '🔮',
    style: { left: '1.5%', top: '8%', width: '28.5%', height: '40%' },
    border: 'border-purple-600/40', bg: 'bg-purple-950/20', textColor: 'text-purple-300',
    zoomOrigin: '15.5% 28%',
  },
  'great-hall': {
    num: 2, label: 'The Great Hall', sublabel: 'Meeting Room', emoji: '🏛️',
    style: { left: '30%', top: '8%', width: '39%', height: '69%' },
    border: 'border-blue-500/40', bg: 'bg-blue-950/15', textColor: 'text-blue-300',
    zoomOrigin: '49.5% 42.5%', isMeeting: true,
  },
  'library': {
    num: 3, label: 'The Library', sublabel: 'Restricted Section', emoji: '📚',
    style: { left: '1.5%', top: '48%', width: '28.5%', height: '29%' },
    border: 'border-amber-700/40', bg: 'bg-amber-950/15', textColor: 'text-amber-300',
    zoomOrigin: '15.5% 62.5%',
  },
  'lab': {
    num: 4, label: "Snape's Dungeons", sublabel: 'AI Research', emoji: '⚗️',
    style: { left: '69%', top: '8%', width: '29.5%', height: '40%' },
    border: 'border-slate-500/40', bg: 'bg-slate-900/20', textColor: 'text-slate-300',
    zoomOrigin: '83.5% 28%',
  },
  'requirement': {
    num: 5, label: 'The Room of Requirement', sublabel: 'Tools & Resources', emoji: '✨',
    style: { left: '69%', top: '48%', width: '29.5%', height: '29%' },
    border: 'border-fuchsia-600/40', bg: 'bg-fuchsia-950/15', textColor: 'text-fuchsia-300',
    zoomOrigin: '83.5% 62.5%',
  },
  'auror': {
    num: 6, label: 'The Auror Office', sublabel: 'Operations', emoji: '🛡️',
    style: { left: '1.5%', top: '77%', width: '28.5%', height: '21%' },
    border: 'border-green-700/40', bg: 'bg-green-950/15', textColor: 'text-green-300',
    zoomOrigin: '15.5% 87.5%',
  },
  'clocktower': {
    num: 7, label: 'The Clock Tower', sublabel: 'Creative Studio', emoji: '🕰️',
    style: { left: '30%', top: '77%', width: '39%', height: '21%' },
    border: 'border-orange-700/40', bg: 'bg-orange-950/15', textColor: 'text-orange-300',
    zoomOrigin: '49.5% 87.5%',
  },
  'broomsticks': {
    num: 8, label: 'The Three Broomsticks', sublabel: 'Common Room', emoji: '🍺',
    style: { left: '69%', top: '77%', width: '29.5%', height: '21%' },
    border: 'border-yellow-700/40', bg: 'bg-yellow-950/15', textColor: 'text-yellow-300',
    zoomOrigin: '83.5% 87.5%',
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
  teal:      'drop-shadow(0 0 6px rgba(45,212,191,0.8))',
  crimson:   'drop-shadow(0 0 6px rgba(239,68,68,0.7))',
  lime:      'drop-shadow(0 0 6px rgba(163,230,53,0.8))',
  silver:    'drop-shadow(0 0 6px rgba(203,213,225,0.6))',
  indigo:    'drop-shadow(0 0 6px rgba(99,102,241,0.8))',
  stone:     'drop-shadow(0 0 6px rgba(168,162,158,0.6))',
  coral:     'drop-shadow(0 0 6px rgba(251,146,60,0.7))',
  tangerine: 'drop-shadow(0 0 6px rgba(249,115,22,0.7))',
  sky:       'drop-shadow(0 0 6px rgba(56,189,248,0.8))',
  zinc:      'drop-shadow(0 0 6px rgba(161,161,170,0.6))',
  violet:    'drop-shadow(0 0 6px rgba(167,139,250,0.8))',
  sage:      'drop-shadow(0 0 6px rgba(94,234,212,0.6))',
  maroon:    'drop-shadow(0 0 6px rgba(251,113,133,0.7))',
  pink:      'drop-shadow(0 0 6px rgba(244,114,182,0.8))',
  gold:      'drop-shadow(0 0 6px rgba(251,191,36,0.8))',
}

export const CHARACTER_MAP: Record<string, ComponentType<{ avatar: string; isWalking: boolean; status: AgentStatus }>> = {
  DUMBLEDORE: DumbledoreCharacter, HERMIONE: HermioneCharacter, HARRY: HarryCharacter,
  RON: RonCharacter, McGONAGALL: McGonagallCharacter, SNAPE: SnapeCharacter, HAGRID: HagridCharacter,
  LUNA: LunaCharacter, GINNY: GinnyCharacter, NEVILLE: NevilleCharacter, DRACO: DracoCharacter,
  SIRIUS: SiriusCharacter, LUPIN: LupinCharacter, FRED: FredCharacter, GEORGE: GeorgeCharacter,
  FLEUR: FleurCharacter, MOODY: MoodyCharacter, TRELAWNEY: TrelawneyCharacter, DOBBY: DobbyCharacter,
  ARTHUR: ArthurCharacter, TONKS: TonksCharacter, KINGSLEY: KingsleyCharacter,
}

// ─── Position maps (% of floor plan) ─────────────────────────────────────────

export const DESK_POS: Record<string, Pos> = {
  // Headmaster (0-27%, 0-45%)
  DUMBLEDORE:  { x: 13, y: 22 },
  // Lab / Snape's Dungeons (64-100%, 0-45%)
  SNAPE:       { x: 80, y: 12 }, LUNA:       { x: 72, y: 24 },
  MOODY:       { x: 90, y: 24 }, TRELAWNEY:  { x: 82, y: 38 },
  // Library (0-27%, 45-77%)
  HERMIONE:    { x: 8,  y: 56 }, KINGSLEY:   { x: 20, y: 66 },
  // Room of Requirement (64-100%, 45-77%)
  McGONAGALL:  { x: 74, y: 53 }, NEVILLE:    { x: 68, y: 63 },
  LUPIN:       { x: 82, y: 63 }, ARTHUR:     { x: 90, y: 53 },
  // Auror Office (0-27%, 77-100%)
  HAGRID:      { x: 8,  y: 85 }, DOBBY:      { x: 20, y: 85 },
  // Clock Tower / Creative (27-64%, 77-100%)
  HARRY:       { x: 33, y: 84 }, RON:        { x: 43, y: 84 },
  GINNY:       { x: 35, y: 93 }, FLEUR:      { x: 53, y: 84 },
  FRED:        { x: 45, y: 93 }, GEORGE:     { x: 57, y: 93 },
  // Three Broomsticks (64-100%, 77-100%)
  DRACO:       { x: 70, y: 84 }, TONKS:      { x: 80, y: 84 },
  SIRIUS:      { x: 90, y: 84 },
}
export const MEETING_POS: Record<string, Pos> = {
  // Row 1 (y=9)
  DUMBLEDORE: { x: 29, y: 9  }, HERMIONE:  { x: 35, y: 9  }, HARRY:    { x: 41, y: 9  },
  RON:        { x: 47, y: 9  }, McGONAGALL:{ x: 53, y: 9  }, SNAPE:    { x: 59, y: 9  },
  // Row 2 (y: 19)
  HAGRID:     { x: 29, y: 19 }, LUNA:      { x: 35, y: 19 }, GINNY:    { x: 41, y: 19 },
  NEVILLE:    { x: 47, y: 19 }, DRACO:     { x: 53, y: 19 }, SIRIUS:   { x: 59, y: 19 },
  // Row 3 (y=29)
  LUPIN:      { x: 29, y: 29 }, FRED:      { x: 35, y: 29 }, GEORGE:   { x: 41, y: 29 },
  FLEUR:      { x: 47, y: 29 }, MOODY:     { x: 53, y: 29 }, TRELAWNEY:{ x: 59, y: 29 },
  // Row 4 (y=38)
  DOBBY:      { x: 29, y: 38 }, ARTHUR:     { x: 35, y: 38 }, TONKS:    { x: 41, y: 38 },
  KINGSLEY:   { x: 47, y: 38 },
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
  {
    name: 'LUNA', role: 'GFX — visual opportunities', color: 'teal',
    avatar: '/agents/LUNA_Cyborg.png',
    prompt: 'You are contributing to an end-of-week executive brief. In 3–4 sentences MAX, identify the #1 visual/GFX opportunity this week — where motion graphics, lower-thirds, or visual explainers would have the biggest impact on content quality or clarity.',
  },
  {
    name: 'GINNY', role: 'Social — growth signals', color: 'crimson',
    avatar: '/agents/GINNY_Cyborg.png',
    prompt: 'You are contributing to an end-of-week executive brief. In 3–4 sentences MAX, report on the top short-form or social media opportunity this week. Which content angle or platform trend should Revenue Rush or The Process capitalize on right now?',
  },
  {
    name: 'CEDRIC', role: 'Analytics — performance', color: 'gold',
    avatar: '/agents/CEDRIC_Cyborg.png',
    prompt: 'You are contributing to an end-of-week executive brief. In 3–4 sentences MAX, give a performance snapshot: what content performed best, what underperformed, and one metric Jay should track more closely next week.',
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
