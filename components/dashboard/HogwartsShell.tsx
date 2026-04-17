'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import {
  Loader2, Send, Users, Zap, RotateCcw, Wifi,
  Home, Bot, MessageSquare, Layers, Globe, Activity, Settings2, Monitor,
  Clapperboard, ChevronRight, ExternalLink, RefreshCw, Terminal,
  Cpu, Database, Bell, Palette, SlidersHorizontal, BookOpen,
  CheckCircle2, XCircle, Clock, BarChart2, Paperclip, Link2, X as XIcon, Plus,
  Wand2, Sparkles, Tag, Trash2, Brain, Mail, Calendar, Film,
  PlayCircle, BookMarked, Fish, Mic, MicOff, Download, BarChart,
} from 'lucide-react'
import { NavTabs } from './NavTabs'
import VideoQCProcessor from './VideoQCProcessor'
import KnowledgePanel from './KnowledgePanel'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AgentAvatar } from './hogwarts/AgentAvatar'
import { PanelErrorBoundary } from './hogwarts/PanelErrorBoundary'
import { Furniture } from './hogwarts/PixelFurniture'
import { CommandPalette } from './hogwarts/CommandPalette'
import { NotificationFeed } from './hogwarts/NotificationFeed'
import { GFXGeneratorPanel } from './hogwarts/GFXGeneratorPanel'
import { ProductNamePanel } from './hogwarts/ProductNamePanel'
import { MemoryPanel } from './hogwarts/MemoryPanel'
import { QuickActionsPanel } from './hogwarts/QuickActionsPanel'
import { SavedPromptsPanel } from './hogwarts/SavedPromptsPanel'
import { BatchHookPanel } from './hogwarts/BatchHookPanel'
import { CollaborationPanel } from './hogwarts/CollaborationPanel'
import { UnifiedInboxPanel } from './hogwarts/UnifiedInboxPanel'
import { ProactiveAlerts } from './hogwarts/ProactiveAlerts'
import { ContentCalendarPanel } from './hogwarts/ContentCalendarPanel'
import { AgentStatsPanel } from './hogwarts/AgentStatsPanel'
import { ScheduledBriefPanel } from './hogwarts/ScheduledBriefPanel'
import { YouTubePanel } from './hogwarts/YouTubePanel'
import { FrameioPanel } from './hogwarts/FrameioPanel'
import { TranscriptionPanel } from './hogwarts/TranscriptionPanel'
import { VoiceInput } from '@/lib/voice-input'
import {
  AGENTS_DEF, COLOR_MAP, RING_MAP, TEXT_MAP, BADGE_MAP, ROOMS, GLOW,
  CHARACTER_MAP, DESK_POS, MEETING_POS, BRIEF_SEQUENCE, INITIAL_AGENTS,
  getPos, HW_CONVO_KEY, loadConversations, saveConversations,
} from './hogwarts/types'
import type { RoomId, AgentStatus, AgentState, LogEntry, BriefEntry, ChatMessage, Conversation, RoomConfig, Pos } from './hogwarts/types'



// ─── Setting toggle (used in Settings panel) ─────────────────────────────────

function SettingToggle({ label, sub, defaultOn = false, disabled = false }: { label: string; sub: string; defaultOn?: boolean; disabled?: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className={`flex items-center justify-between gap-3 ${disabled ? 'opacity-40' : ''}`}>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-300 leading-tight">{label}</p>
        <p className="text-[9px] text-gray-600 leading-tight">{sub}</p>
      </div>
      <button
        disabled={disabled}
        onClick={() => !disabled && setOn(p => !p)}
        role="switch"
        aria-checked={on}
        style={{
          flexShrink: 0,
          width: 34,
          height: 20,
          borderRadius: 10,
          position: 'relative',
          background: on ? '#7c3aed' : '#1a1c2e',
          border: `1px solid ${on ? '#9c59ff' : '#2e3050'}`,
          cursor: disabled ? 'default' : 'pointer',
          transition: 'background 0.18s, border-color 0.18s',
        }}
      >
        <span style={{
          position: 'absolute',
          top: 2,
          left: on ? 15 : 2,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: on ? '#ffffff' : '#4b5563',
          transition: 'left 0.18s, background 0.18s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }} />
      </button>
    </div>
  )
}

// ─── Saved Prompts inline picker (used inside the chat input) ────────────────

const AGENT_NAMES = ['DUMBLEDORE','HERMIONE','HARRY','RON','McGONAGALL','SNAPE','HAGRID',
  'LUNA','GINNY','NEVILLE','DRACO','SIRIUS','LUPIN','FRED','GEORGE','FLEUR',
  'MOODY','TRELAWNEY','DOBBY','ARTHUR','TONKS','KINGSLEY']

interface SavedPrompt { id: string; agent: string; label: string; prompt: string }

function SavedPromptsPickerInline({ onSelect, onClose }: { onSelect: (text: string) => void; onClose: () => void }) {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [newPrompt, setNewPrompt] = useState('')
  const [newAgent, setNewAgent] = useState('DUMBLEDORE')
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    try { const s = localStorage.getItem('hw-saved-prompts'); if (s) setPrompts(JSON.parse(s)) } catch {}
  }, [])

  function save(p: SavedPrompt[]) {
    setPrompts(p)
    try { localStorage.setItem('hw-saved-prompts', JSON.stringify(p)) } catch {}
  }

  function addPrompt() {
    if (!newLabel.trim() || !newPrompt.trim()) return
    const np = [...prompts, { id: Date.now().toString(36), agent: newAgent, label: newLabel.trim(), prompt: newPrompt.trim() }]
    save(np)
    setNewLabel(''); setNewPrompt(''); setShowAdd(false)
  }

  const filtered = filter
    ? prompts.filter(p => p.label.toLowerCase().includes(filter.toLowerCase()) || p.agent.toLowerCase().includes(filter.toLowerCase()))
    : prompts

  return (
    <div className="relative mb-1">
      <div className="absolute bottom-full left-0 right-0 mb-1 z-50 bg-[#0d0f1a] border border-[#2a2d3a] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e2030]">
          <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookMarked size={10} /> Saved Prompts
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowAdd(p => !p)}
              className="text-[9px] text-gray-500 hover:text-gray-300 border border-[#2a2d3a] rounded px-1.5 py-0.5 transition-colors">
              + Add
            </button>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors p-0.5">
              <XIcon size={11} />
            </button>
          </div>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="px-3 py-2 border-b border-[#1e2030] space-y-1.5">
            <div className="flex gap-1.5">
              <select value={newAgent} onChange={e => setNewAgent(e.target.value)}
                className="bg-[#07080e] border border-[#1e2030] rounded px-2 py-1 text-[10px] text-gray-300 focus:outline-none">
                {AGENT_NAMES.map(a => <option key={a} value={a}>{a === 'McGONAGALL' ? 'McGON.' : a.slice(0,8)}</option>)}
              </select>
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Label…"
                className="flex-1 bg-[#07080e] border border-[#1e2030] rounded px-2 py-1 text-[10px] text-gray-300 placeholder-gray-700 focus:outline-none" />
            </div>
            <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)} rows={2} placeholder="Prompt text…"
              className="w-full bg-[#07080e] border border-[#1e2030] rounded px-2 py-1 text-[10px] text-gray-300 placeholder-gray-700 focus:outline-none resize-none" />
            <button onClick={addPrompt}
              className="w-full text-[9px] py-1 rounded bg-amber-900/30 border border-amber-700/40 text-amber-300 hover:bg-amber-900/50 transition-colors">
              Save prompt
            </button>
          </div>
        )}

        {/* Search */}
        {prompts.length > 3 && (
          <div className="px-3 py-1.5 border-b border-[#1e2030]">
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search prompts…"
              className="w-full bg-transparent text-[10px] text-gray-300 placeholder-gray-600 focus:outline-none" />
          </div>
        )}

        {/* Prompt list */}
        <div className="max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a]">
          {filtered.length === 0 && (
            <p className="text-[10px] text-gray-600 text-center py-4">
              {prompts.length === 0 ? 'No saved prompts yet. Click + Add to create one.' : 'No matches.'}
            </p>
          )}
          {filtered.map(p => (
            <div key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-[#141824] border-b border-[#1e2030]/60 last:border-0 group">
              <button onClick={() => onSelect(`@${p.agent.toLowerCase()} ${p.prompt}`)}
                className="flex-1 text-left min-w-0">
                <p className="text-[10px] font-medium text-gray-300 truncate">{p.label}</p>
                <p className="text-[9px] text-gray-600 truncate">{p.agent} · {p.prompt.slice(0, 50)}{p.prompt.length > 50 ? '…' : ''}</p>
              </button>
              <button onClick={() => save(prompts.filter(x => x.id !== p.id))}
                className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all p-0.5">
                <XIcon size={9} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Left toolbar ─────────────────────────────────────────────────────────────

function LeftToolbar({ active, setActive }: { active: string; setActive: (k: string) => void }) {
  const tools: ({ key: string; icon: React.ElementType; label: string } | null)[] = [
    { key: 'office',       icon: Monitor,      label: 'Office Map' },
    { key: 'agents',       icon: Bot,          label: 'Agents' },
    { key: 'chat',         icon: MessageSquare,label: 'Chat' },
    { key: 'inbox',        icon: Mail,         label: 'Unified Inbox' },
    { key: 'collaborate',  icon: Users,        label: 'Collaborate' },
    null,
    { key: 'quick',        icon: Zap,          label: 'Quick Actions' },
    { key: 'batch-hooks',  icon: Fish,         label: 'Batch Hooks' },
    { key: 'calendar',     icon: Calendar,     label: 'Content Calendar' },
    null,
    { key: 'qc',           icon: Clapperboard, label: 'Video QC' },
    { key: 'transcribe',   icon: Mic,          label: 'Transcribe' },
    { key: 'frameio',      icon: Film,         label: 'Frame.io Reviews' },
    { key: 'gfx',         icon: Sparkles,     label: 'GFX Generator' },
    { key: 'product',     icon: Tag,          label: 'Product Names' },
    null,
    { key: 'knowledge',   icon: BookOpen,     label: 'Knowledge Base' },
    { key: 'memory',      icon: Brain,        label: 'Agent Memory' },
    { key: 'stats',       icon: BarChart,     label: 'Agent Stats' },
    { key: 'brief-sched', icon: Clock,        label: 'Scheduled Brief' },
    null,
    { key: 'env',         icon: Globe,        label: 'Environment' },
    { key: 'layout',      icon: Layers,       label: 'Layout' },
    { key: 'activity',    icon: Activity,     label: 'Activity' },
    null,
    { key: 'settings',    icon: Settings2,    label: 'Settings' },
  ]
  return (
    <aside className="
      flex-shrink-0 bg-[#0a0c14]
      flex flex-row items-center px-2 py-1 gap-0 overflow-x-auto overflow-y-hidden border-t border-[#1e2030]
      md:flex-col md:items-center md:px-0 md:py-2 md:overflow-x-hidden md:overflow-y-auto md:w-11 md:border-t-0 md:border-r md:border-[#1e2030]
    ">
      {/* logo */}
      <div className="w-7 h-7 rounded-md bg-purple-900/60 border border-purple-800/50 flex items-center justify-center mr-1 flex-shrink-0 md:mr-0 md:mb-2">
        <span className="text-[11px]">⚡</span>
      </div>
      {tools.map((t, i) =>
        t === null
          ? <div key={i} className="h-6 w-px bg-[#1e2030] mx-0.5 flex-shrink-0 md:h-px md:w-6 md:my-0.5 md:mx-0" />
          : (
            <button
              key={t.key}
              title={t.label}
              onClick={() => setActive(t.key)}
              className={`w-9 h-8 flex items-center justify-center rounded-lg transition-all flex-shrink-0 ${
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

function MiniCharacter({ agent, isWalking, facingLeft, onClick, highlighted, posOverride }: {
  agent: AgentState; isWalking: boolean; facingLeft: boolean; onClick: () => void; highlighted: boolean
  posOverride?: Pos
}) {
  const CharSVG = CHARACTER_MAP[agent.name]
  const glow = highlighted
    ? 'drop-shadow(0 0 10px rgba(96,165,250,1)) drop-shadow(0 0 22px rgba(96,165,250,0.55))'
    : GLOW[agent.color]
  const pos = posOverride ?? getPos(agent)

  return (
    <button
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('agent', agent.name)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={onClick}
      className="absolute select-none focus:outline-none hover:brightness-110 active:scale-95"
      title={`${agent.name} — drag to reposition · click to ${agent.currentRoom === 'great-hall' ? 'return to desk' : 'call to meeting'}`}
      style={{
        left: `${pos.x}%`, top: `${pos.y}%`,
        transform: 'translate(-50%, -50%)',
        cursor: 'grab',
        transition: posOverride ? 'none' : 'left 0.75s cubic-bezier(0.4,0,0.2,1), top 0.75s cubic-bezier(0.4,0,0.2,1)',
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
          ['--blink-offset' as string]: `${BLINK_OFFSET[agent.name] ?? 0}s`,
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

function TrackedCharacter({ agent, isMoving, onClick, highlighted, posOverride }: {
  agent: AgentState; isMoving: boolean; onClick: () => void; highlighted: boolean
  posOverride?: Pos
}) {
  const pos = posOverride ?? getPos(agent)
  const prevPos = useRef(pos)
  const [facingLeft, setFacingLeft] = useState(false)
  useEffect(() => {
    const dx = pos.x - prevPos.current.x
    if (Math.abs(dx) > 0.5) setFacingLeft(dx < 0)
    prevPos.current = pos
  }, [pos.x, pos.y]) // eslint-disable-line react-hooks/exhaustive-deps
  return <MiniCharacter agent={agent} isWalking={isMoving} facingLeft={facingLeft} onClick={onClick} highlighted={highlighted} posOverride={posOverride} />
}


// ─── Per-agent blink offset (so each agent blinks at a different time) ───────
const BLINK_OFFSET: Record<string, number> = {
  DUMBLEDORE: 0.0,  HERMIONE:  0.7,  HARRY:     1.4,  RON:       2.1,
  McGONAGALL: 2.8,  SNAPE:     0.3,  HAGRID:    1.0,  LUNA:      1.7,
  GINNY:      2.4,  NEVILLE:   3.1,  DRACO:     0.5,  SIRIUS:    1.2,
  LUPIN:      1.9,  FRED:      2.6,  GEORGE:    3.3,  FLEUR:     0.2,
  MOODY:      0.9,  TRELAWNEY: 1.6,  DOBBY:     2.3,  ARTHUR:    3.0,
  TONKS:      0.4,  KINGSLEY:  1.1,
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function HogwartsShell() {
  // ── Office state ────────────────────────────────────────────────────────
  const [agents, setAgents]   = useState<AgentState[]>(INITIAL_AGENTS)
  const [moving, setMoving]   = useState<Set<string>>(new Set())
  const [log, setLog]         = useState<LogEntry[]>([
    { time: format(new Date(), 'HH:mm'), msg: 'All agents online and at their desks.', type: 'status' },
  ])

  // ── Chat state ──────────────────────────────────────────────────────────
  const [question, setQuestion]               = useState('')
  const [messages, setMessages]               = useState<ChatMessage[]>([])
  const [conversations, setConversations]     = useState<Conversation[]>([])
  const [currentConvoId, setCurrentConvoId]   = useState('')
  const [showHistory, setShowHistory]         = useState(false)
  const [isDragOver, setIsDragOver]           = useState(false)
  const [respondingAgent, setRespondingAgent] = useState('')
  const [respondingColor, setRespondingColor] = useState('purple')
  const [respondingAvatar, setRespondingAvatar] = useState('')
  const [loading, setLoading]                 = useState(false)
  const [chatError, setChatError]             = useState('')
  const [activeAgent, setActiveAgent]         = useState<string | null>(null)
  const [responseId, setResponseId]           = useState(0)
  const [attachments, setAttachments]         = useState<{dataUrl: string; name: string; type: string}[]>([])
  const attachInputRef = useRef<HTMLInputElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)

  // ── Brief state ─────────────────────────────────────────────────────────
  const [briefActive, setBriefActive]   = useState(false)
  const [briefEntries, setBriefEntries] = useState<BriefEntry[]>([])
  const [briefDone, setBriefDone]       = useState(false)
  const briefScrollRef = useRef<HTMLDivElement>(null)

  // QC panel state lives in VideoQCProcessor component

  // ── UI state ────────────────────────────────────────────────────────────
  const [activeTool, setActiveTool]     = useState('office')
  const [activeBotTab, setActiveBotTab] = useState('environment')

  // ── Command palette state ────────────────────────────────────────────────
  const [paletteOpen, setPaletteOpen] = useState(false)

  // ── Prompt Builder state ─────────────────────────────────────────────────
  const [promptBuilderOpen, setPromptBuilderOpen]       = useState(false)
  const [promptBuilderInput, setPromptBuilderInput]     = useState('')
  const [promptBuilderResult, setPromptBuilderResult]   = useState('')
  const [promptBuilderLoading, setPromptBuilderLoading] = useState(false)

  // ── Drag-to-reposition state ─────────────────────────────────────────
  const [dragPos, setDragPos] = useState<Record<string, Pos>>(() => {
    if (typeof window === 'undefined') return {}
    try { const s = localStorage.getItem('hw-drag-pos'); return s ? JSON.parse(s) : {} } catch { return {} }
  })
  const floorRef = useRef<HTMLDivElement>(null)

  // ── Voice input state ────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false)
  const voiceInputRef = useRef<VoiceInput | null>(null)
  const voiceSupported = typeof window !== 'undefined' && VoiceInput.isSupported()

  // ── Saved-to-Notion state (per message) ─────────────────────────────
  const [savedMsgIds, setSavedMsgIds] = useState<Set<string>>(new Set())

  // ── Saved prompts picker state ────────────────────────────────────────
  const [showSavedPicker, setShowSavedPicker] = useState(false)

  // ── Toolbar order state ──────────────────────────────────────────────────
  const DEFAULT_TOOL_ORDER = ['office', 'agents', 'chat', 'qc', 'knowledge', 'env', 'layout', 'activity', 'notifications', 'settings']
  const [toolOrder, setToolOrder] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_TOOL_ORDER
    try {
      const saved = localStorage.getItem('hw-tool-order')
      return saved ? JSON.parse(saved) : DEFAULT_TOOL_ORDER
    } catch { return DEFAULT_TOOL_ORDER }
  })

  function handleReorder(newOrder: string[]) {
    setToolOrder(newOrder)
    try { localStorage.setItem('hw-tool-order', JSON.stringify(newOrder)) } catch {}
  }

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

  // ── Load conversations from localStorage on mount ────────────────────────
  useEffect(() => { setConversations(loadConversations()) }, [])

  // ── Auto-scroll chat thread when messages change ─────────────────────────
  useEffect(() => {
    if (!briefActive && !showHistory)
      briefScrollRef.current?.scrollTo({ top: briefScrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── ⌘K / Ctrl+K → command palette ───────────────────────────────────────
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(p => !p)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // ── Auto-resize textarea ─────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [question])

  // ── Office helpers ───────────────────────────────────────────────────────
  function getRoomFromPos(x: number, y: number): RoomId {
    if (y < 44) {
      if (x < 22) return 'headmaster'
      if (x < 64) return 'great-hall'
      return 'lab'
    }
    if (y < 82) {
      if (x < 28) return 'operations'
      if (x < 64) return 'creative'
      return 'archive'
    }
    return 'common'
  }

  function updateDragPos(name: string, pos: Pos) {
    setDragPos(p => {
      const next = { ...p, [name]: pos }
      try { localStorage.setItem('hw-drag-pos', JSON.stringify(next)) } catch {}
      return next
    })
  }

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
  function triggerRandomMeeting() {
    const subset = [...agents].sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 3))
    const names  = subset.map(a => a.name)
    startMoving(names)
    setAgents(p => p.map(a => names.includes(a.name) ? { ...a, currentRoom: 'great-hall', status: 'in-meeting' } : a))
    pushLog(`Random meeting: ${names.join(', ')} assembled.`, 'meeting')
    setTimeout(() => {
      startMoving(names)
      setAgents(p => p.map(a => names.includes(a.name) ? { ...a, currentRoom: a.homeRoom, status: 'online' } : a))
      pushLog('Meeting adjourned — agents back to desks.', 'move')
    }, 30_000)
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
    setTimeout(() => { const el = document.getElementById('hw-input'); if (el) (el as HTMLTextAreaElement).focus() }, 50)
  }

  function newConversation() {
    setMessages([])
    setCurrentConvoId('')
    setChatError('')
    setShowHistory(false)
    setBriefActive(false)
  }

  function loadConversation(convo: Conversation) {
    setMessages(convo.messages)
    setCurrentConvoId(convo.id)
    setChatError('')
    setShowHistory(false)
    setBriefActive(false)
  }

  function deleteConversation(id: string) {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id)
      saveConversations(updated)
      return updated
    })
    if (currentConvoId === id) {
      setMessages([])
      setCurrentConvoId('')
      setChatError('')
    }
  }

  async function ask() {
    const q = question.trim()
    const att = [...attachments]
    if (!q && att.length === 0) return
    if (loading) return

    if (q === '/brief') { setQuestion(''); runBrief(); return }

    // ── /rr command — Revenue Rush knowledge base ─────────────────────────
    if (q.toLowerCase().startsWith('/rr ') || q.toLowerCase() === '/rr') {
      setQuestion('')
      setActiveTool('knowledge')
      return
    }

    setLoading(true)
    setChatError('')
    setQuestion('')
    setAttachments([])
    setRespondingAgent('')
    setActiveAgent(null)
    setBriefActive(false)

    const now = format(new Date(), 'HH:mm')
    const convoId = currentConvoId || Date.now().toString(36)
    if (!currentConvoId) setCurrentConvoId(convoId)

    // Build context from last 6 messages for memory
    const contextMsgs = messages.slice(-6)
    const context = contextMsgs.length > 0
      ? contextMsgs.map(m => m.role === 'user' ? `[USER]: ${m.content}` : `[${m.agent ?? 'AGENT'}]: ${m.content}`).join('\n')
      : undefined

    const userMsg: ChatMessage = {
      id: Date.now().toString(36) + 'u',
      role: 'user',
      content: q,
      attachments: att.length > 0 ? att : undefined,
      timestamp: now,
    }
    const withUser = [...messages, userMsg]
    setMessages(withUser)
    pushLog(`You: "${q.slice(0, 60)}${q.length > 60 ? '…' : ''}"`, 'chat')

    const agentMsgId = Date.now().toString(36) + 'a'
    let agentName = 'DUMBLEDORE'
    let agentColor = 'purple'
    let agentDef: typeof AGENTS_DEF[0] | undefined

    // Add placeholder message immediately so cursor appears
    setMessages([...withUser, {
      id: agentMsgId, role: 'agent', content: '', agent: agentName,
      agentColor, agentAvatar: '', timestamp: format(new Date(), 'HH:mm'),
    }])

    try {
      const res = await fetch('/api/agents/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, attachments: att, stream: true, context }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let streamedContent = ''

      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'agent') {
              agentName = event.agent
              agentColor = event.color
              agentDef = AGENTS_DEF.find(a => a.name === agentName)
              setRespondingAgent(agentName)
              setRespondingColor(agentColor)
              setRespondingAvatar(agentDef?.avatar ?? '')
              setResponseId(p => p + 1)
              setMessages(prev => prev.map(m => m.id === agentMsgId
                ? { ...m, agent: agentName, agentColor, agentAvatar: agentDef?.avatar ?? '' } : m))
            } else if (event.type === 'delta') {
              streamedContent += event.content
              setMessages(prev => prev.map(m => m.id === agentMsgId
                ? { ...m, content: streamedContent } : m))
            } else if (event.type === 'done') {
              break outer
            }
          } catch { /* ignore parse errors */ }
        }
      }

      const finalMsg: ChatMessage = {
        id: agentMsgId, role: 'agent', content: streamedContent,
        agent: agentName, agentColor, agentAvatar: agentDef?.avatar ?? '',
        timestamp: format(new Date(), 'HH:mm'),
      }
      const finalMsgs = [...withUser, finalMsg]
      setMessages(finalMsgs)

      // Persist conversation
      const title = withUser[0]?.content?.slice(0, 40) ?? 'Chat'
      setConversations(convos => {
        const existing = convos.find(c => c.id === convoId)
        const now2 = new Date().toISOString()
        const newConvos = existing
          ? convos.map(c => c.id === convoId ? { ...c, messages: finalMsgs, updatedAt: now2 } : c)
          : [{ id: convoId, title, messages: finalMsgs, createdAt: now2, updatedAt: now2 }, ...convos]
        saveConversations(newConvos)
        return newConvos
      })

    } catch (err) {
      setChatError(String(err))
      setMessages(withUser) // remove placeholder on error
    } finally {
      setLoading(false)
    }
  }

  // ── Prompt Builder ───────────────────────────────────────────────────────
  async function buildPrompt() {
    const raw = promptBuilderInput.trim()
    if (!raw || promptBuilderLoading) return
    setPromptBuilderLoading(true)
    setPromptBuilderResult('')
    try {
      const res = await fetch('/api/agents/expand-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawPrompt: raw }),
      })
      const data = await res.json()
      setPromptBuilderResult(data.expandedPrompt ?? data.error ?? 'No result')
    } catch (err) {
      setPromptBuilderResult(String(err))
    } finally {
      setPromptBuilderLoading(false)
    }
  }

  // ── Fire a preset prompt directly ───────────────────────────────────────
  function firePrompt(prompt: string) {
    setQuestion(prompt)
    setActiveTool('office')
    setTimeout(() => {
      const el = document.getElementById('hw-input') as HTMLTextAreaElement | null
      if (el) { el.focus(); el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) }
    }, 60)
  }

  // ── Voice input toggle ───────────────────────────────────────────────────
  function toggleVoice() {
    if (!voiceSupported) return
    if (isListening) {
      voiceInputRef.current?.stop()
      voiceInputRef.current = null
      setIsListening(false)
    } else {
      const vi = new VoiceInput({
        onResult: (t) => { setQuestion(q => q + t); setIsListening(false) },
        onEnd:    ()  => setIsListening(false),
        onError:  ()  => setIsListening(false),
      })
      voiceInputRef.current = vi
      vi.start()
      setIsListening(true)
    }
  }

  // ── Save message to Notion ────────────────────────────────────────────────
  async function saveToNotion(msgId: string, content: string, agentName: string) {
    try {
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `[${agentName}]: ${content}`, type: 'insight', tags: [agentName, 'saved'] }),
      })
      setSavedMsgIds(p => new Set([...p, msgId]))
    } catch { /* silently fail */ }
  }

  const onlineCount    = agents.filter(a => a.status !== 'away').length
  const inMeetingCount = agents.filter(a => a.currentRoom === 'great-hall').length

  return (
    <div className="h-screen flex flex-col bg-[#0a0c14] overflow-hidden">

      {/* ── Title bar ──────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-[#0d0f1a] border-b border-[#1e2030] px-3 sm:px-4 py-2 z-10">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">Hogwarts AI</span>
              <span className="text-[10px] text-gray-700 font-mono hidden sm:inline">v1.0</span>
            </div>
            <span className="text-gray-700 text-sm hidden sm:inline">·</span>
            <span className="text-[11px] text-gray-600 hidden md:block font-mono">
              {format(new Date(), 'EEE MMM d')}
            </span>
            <NavTabs active="hogwarts" />
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-[10px] text-green-400 bg-green-900/15 border border-green-800/30 rounded px-2 py-0.5">
              <Wifi size={9} /> {onlineCount}/7
            </div>
            {inMeetingCount > 0 && (
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-blue-400 bg-blue-900/15 border border-blue-800/30 rounded px-2 py-0.5">
                <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" /> {inMeetingCount} meeting
              </div>
            )}
            <button onClick={simulateWork}    className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 border border-amber-800/40 bg-amber-900/15 rounded px-2 py-0.5 transition-colors"><Zap size={9} /><span className="hidden sm:inline"> Work</span></button>
            <button onClick={assembleMeeting} className="flex items-center gap-1 text-[10px] text-blue-400  hover:text-blue-300  border border-blue-800/40  bg-blue-900/15  rounded px-2 py-0.5 transition-colors"><Users size={9} /><span className="hidden sm:inline"> Meet</span></button>
            <button onClick={dismissMeeting}  className="flex items-center gap-1 text-[10px] text-gray-400  hover:text-gray-300  border border-[#2a2d3a]    bg-[#161928]    rounded px-2 py-0.5 transition-colors"><RotateCcw size={9} /><span className="hidden sm:inline"> Dismiss</span></button>
          </div>
        </div>
      </header>

      {/* ── Body: toolbar + content ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col-reverse min-h-0 md:flex-row">

        {/* ── Left toolbar ──────────────────────────────────────────────────── */}
        <LeftToolbar active={activeTool} setActive={setActiveTool} />

        {/* ── Content area ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">

          {/* ── Main canvas ─────────────────────────────────────────────────── */}
          <main className="flex-1 min-h-0 flex gap-3 p-3 overflow-hidden">

            {/* ── QC Panel ──────────────────────────────────────────────────── */}
            {activeTool === 'qc' && (
              <PanelErrorBoundary panelName="Video QC">
                <VideoQCProcessor pushLog={pushLog} />
              </PanelErrorBoundary>
            )}

            {/* ── Knowledge Base Panel ───────────────────────────────────────── */}
            {activeTool === 'knowledge' && (
              <PanelErrorBoundary panelName="Knowledge">
                <KnowledgePanel pushLog={pushLog} />
              </PanelErrorBoundary>
            )}

            {/* ── GFX Generator Panel ────────────────────────────────────────── */}
            {activeTool === 'gfx' && (
              <PanelErrorBoundary panelName="GFX Generator">
                <GFXGeneratorPanel pushLog={pushLog} />
              </PanelErrorBoundary>
            )}

            {/* ── Product Name Panel ─────────────────────────────────────────── */}
            {activeTool === 'product' && (
              <PanelErrorBoundary panelName="Product Names">
                <ProductNamePanel pushLog={pushLog} />
              </PanelErrorBoundary>
            )}

            {/* ── Memory Panel ─────────────────────────────────────────────── */}
            {activeTool === 'memory' && (
              <PanelErrorBoundary panelName="Agent Memory">
                <div className="flex-1 overflow-hidden flex flex-col h-full">
                  <MemoryPanel />
                </div>
              </PanelErrorBoundary>
            )}

            {/* ── Unified Inbox Panel ───────────────────────────────────────── */}
            {activeTool === 'inbox' && (
              <PanelErrorBoundary panelName="Unified Inbox">
                <div className="flex-1 overflow-hidden flex flex-col h-full">
                  <UnifiedInboxPanel />
                </div>
              </PanelErrorBoundary>
            )}

            {/* ── Collaboration Panel ───────────────────────────────────────── */}
            {activeTool === 'collaborate' && (
              <PanelErrorBoundary panelName="Agent Collaboration">
                <div className="flex-1 overflow-hidden flex flex-col h-full">
                  <CollaborationPanel onAction={firePrompt} />
                </div>
              </PanelErrorBoundary>
            )}

            {/* ── Quick Actions Panel ───────────────────────────────────────── */}
            {activeTool === 'quick' && (
              <PanelErrorBoundary panelName="Quick Actions">
                <div className="flex-1 overflow-hidden flex flex-col h-full">
                  <QuickActionsPanel onAction={firePrompt} />
                </div>
              </PanelErrorBoundary>
            )}

            {/* ── Batch Hook Generator Panel ────────────────────────────────── */}
            {activeTool === 'batch-hooks' && (
              <PanelErrorBoundary panelName="Batch Hook Generator">
                <div className="flex-1 overflow-hidden flex flex-col h-full">
                  <BatchHookPanel />
                </div>
              </PanelErrorBoundary>
            )}

            {/* ── Content Calendar Panel ────────────────────────────────────── */}
            {activeTool === 'calendar' && (
              <PanelErrorBoundary panelName="Content Calendar">
                <div className="flex-1 overflow-hidden flex flex-col h-full">
                  <ContentCalendarPanel />
                </div>
              </PanelErrorBoundary>
            )}

            {/* ── Agent Stats Panel ─────────────────────────────────────────── */}
            {activeTool === 'stats' && (
              <PanelErrorBoundary panelName="Agent Stats">
                <div className="flex-1 overflow-hidden flex flex-col h-full">
                  <AgentStatsPanel />
                </div>
              </PanelErrorBoundary>
            )}

            {/* ── Scheduled Brief Panel ─────────────────────────────────────── */}
            {activeTool === 'brief-sched' && (
              <PanelErrorBoundary panelName="Scheduled Brief">
                <div className="flex-1 overflow-hidden flex flex-col h-full">
                  <ScheduledBriefPanel />
                </div>
              </PanelErrorBoundary>
            )}

            {/* ── Transcription Panel ───────────────────────────────────────── */}
            {activeTool === 'transcribe' && (
              <PanelErrorBoundary panelName="Transcribe">
                <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
                  <TranscriptionPanel pushLog={pushLog} />
                </div>
              </PanelErrorBoundary>
            )}

            {/* ── Frame.io Panel ────────────────────────────────────────────── */}
            {activeTool === 'frameio' && (
              <PanelErrorBoundary panelName="Frame.io Reviews">
                <div className="flex-1 overflow-hidden flex flex-col h-full">
                  <FrameioPanel onAction={firePrompt} />
                </div>
              </PanelErrorBoundary>
            )}

            {/* ── Full Chat Panel ───────────────────────────────────────────── */}
            {activeTool === 'chat' && (
              <PanelErrorBoundary panelName="Chat">
              <div
                className="flex-1 min-w-0 flex gap-3 min-h-0 relative"
                onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false) }}
                onDrop={e => {
                  e.preventDefault(); setIsDragOver(false)
                  Array.from(e.dataTransfer.files).forEach(file => {
                    const reader = new FileReader()
                    reader.onload = ev => setAttachments(a => [...a, {
                      dataUrl: ev.target?.result as string, name: file.name, type: file.type,
                    }])
                    reader.readAsDataURL(file)
                  })
                }}
              >
                {isDragOver && (
                  <div className="absolute inset-0 z-50 rounded-xl border-2 border-dashed border-purple-500 bg-purple-900/20 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <Paperclip size={32} className="text-purple-400 mx-auto mb-2 opacity-80" />
                      <p className="text-base font-medium text-purple-300">Drop to attach</p>
                      <p className="text-sm text-purple-500 mt-0.5">images · video · documents</p>
                    </div>
                  </div>
                )}

                {/* Left: conversation history sidebar */}
                <div className="w-[240px] flex-shrink-0 flex flex-col gap-2 min-h-0">
                  <div className="flex-shrink-0 flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider">Conversations</p>
                    <button
                      onClick={newConversation}
                      title="New conversation"
                      className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 border border-purple-800/40 bg-purple-900/15 rounded px-2 py-0.5 transition-colors"
                    >
                      <Plus size={9} /> New
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] overflow-y-auto
                    [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">
                    <div className="p-2 space-y-1">
                      {conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                          <Clock size={22} className="text-gray-700" />
                          <p className="text-[11px] text-gray-600 text-center">No conversations yet.<br />Ask a question to get started.</p>
                        </div>
                      ) : conversations.map(convo => (
                        <div
                          key={convo.id}
                          className={`group relative w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                            convo.id === currentConvoId
                              ? 'border-purple-700/50 bg-purple-900/15'
                              : 'border-[#1e2030] bg-transparent hover:border-[#2a2d3a] hover:bg-[#0a0c14]'
                          }`}
                          onClick={() => loadConversation(convo)}
                        >
                          <p className="text-[11px] text-gray-200 truncate pr-5">{convo.title}</p>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-[9px] text-gray-600">{format(new Date(convo.updatedAt), 'MMM d · h:mm a')}</p>
                            <p className="text-[9px] text-gray-700">{convo.messages.length} msgs</p>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); deleteConversation(convo.id) }}
                            title="Delete conversation"
                            className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded text-gray-700 hover:text-red-400 hover:bg-red-900/30 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: chat thread + input */}
                <div className="flex-1 min-w-0 flex flex-col gap-2 min-h-0">
                  {/* Thread header */}
                  <div className="flex-shrink-0 flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider">
                      {currentConvoId
                        ? (conversations.find(c => c.id === currentConvoId)?.title ?? 'Chat')
                        : 'New Chat'}
                    </p>
                    {messages.length > 0 && (
                      <span className="text-[9px] text-gray-600 font-mono">{messages.length} messages</span>
                    )}
                  </div>

                  {/* Thread scroll area */}
                  <div className="flex-1 min-h-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] overflow-y-auto p-4
                    [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">
                    <div className="space-y-4 max-w-2xl mx-auto">
                      {messages.length === 0 && !loading && !chatError && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                          <Image src="/agents/Hogwarts_Cyborg.png" alt="Hogwarts" width={56} height={56}
                            className="rounded-2xl object-cover object-top opacity-30" />
                          <p className="text-sm text-gray-600 leading-relaxed">
                            Start a conversation with your AI taskforce.<br />
                            Type <span className="text-purple-400 font-mono">/brief</span> for a team briefing,{' '}
                            <span className="text-amber-400 font-mono">/rr</span> for the knowledge base.
                          </p>
                        </div>
                      )}
                      {messages.map(msg => (
                        <div key={msg.id}>
                          {msg.role === 'user' ? (
                            <div className="flex justify-end">
                              <div className="max-w-[75%] bg-[#1a1c2e] border border-[#2a2d3a] rounded-2xl rounded-tr-sm px-4 py-3 space-y-2">
                                {msg.attachments && msg.attachments.filter(a => a.type.startsWith('image/')).length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {msg.attachments.filter(a => a.type.startsWith('image/')).map((att, i) => (
                                      <img key={i} src={att.dataUrl} alt={att.name}
                                        className="max-w-[200px] max-h-[160px] object-cover rounded-xl border border-[#2a2d3a]" />
                                    ))}
                                  </div>
                                )}
                                {msg.attachments && msg.attachments.filter(a => !a.type.startsWith('image/')).map((att, i) => (
                                  <div key={i} className="flex items-center gap-1.5 text-xs text-gray-400 bg-[#0d0f1a] rounded-lg px-3 py-1.5">
                                    <Paperclip size={11} className="text-gray-600" /> {att.name}
                                  </div>
                                ))}
                                {msg.content && (
                                  <p className="text-sm text-gray-200 leading-relaxed break-words">
                                    {msg.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                                      /^https?:\/\//.test(part)
                                        ? <a key={i} href={part} target="_blank" rel="noreferrer"
                                            className="text-purple-400 hover:text-purple-300 underline underline-offset-2 break-all">
                                            <Link2 size={10} className="inline mr-0.5" />{part}
                                          </a>
                                        : part
                                    )}
                                  </p>
                                )}
                                <p className="text-[10px] text-gray-600 text-right">{msg.timestamp}</p>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <AgentAvatar avatar={msg.agentAvatar!} name={msg.agent!} color={msg.agentColor!} size={28} />
                                <span className={`text-xs font-bold uppercase tracking-wide ${TEXT_MAP[msg.agentColor ?? 'purple'] ?? 'text-purple-300'}`}>{msg.agent}</span>
                                <span className="text-[10px] text-gray-600 font-mono ml-auto">{msg.timestamp}</span>
                              </div>
                              <div className="ml-9 prose prose-invert max-w-none text-sm text-gray-300">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                  h1: ({ children }) => <p className="font-bold text-gray-100 mb-2 mt-3 text-base">{children}</p>,
                                  h2: ({ children }) => <p className="font-bold text-gray-200 mb-2 mt-3 text-sm">{children}</p>,
                                  h3: ({ children }) => <p className="font-semibold text-gray-300 mb-1 mt-2 text-sm">{children}</p>,
                                  p:  ({ children }) => <p className="mb-2.5 leading-relaxed">{children}</p>,
                                  ul: ({ children }) => <ul className="list-disc list-inside mb-2.5 space-y-1">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2.5 space-y-1">{children}</ol>,
                                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                  strong: ({ children }) => <strong className="font-semibold text-gray-100">{children}</strong>,
                                  em: ({ children }) => <em className="italic text-gray-400">{children}</em>,
                                  code: ({ children }) => <code className="bg-[#1e2030] text-purple-300 rounded px-1.5 py-0.5 font-mono text-xs">{children}</code>,
                                  pre: ({ children }) => <pre className="bg-[#1e2030] rounded-lg p-3 overflow-x-auto text-xs font-mono my-3">{children}</pre>,
                                  hr: () => <hr className="border-[#2a2d3a] my-4" />,
                                  blockquote: ({ children }) => <blockquote className="border-l-2 border-purple-700 pl-4 text-gray-400 italic my-3">{children}</blockquote>,
                                }}>{msg.content}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {loading && messages.length > 0 && messages[messages.length - 1].role === 'agent' && messages[messages.length - 1].content === '' && (
                        <div className="flex items-center gap-2.5">
                          <Loader2 size={16} className="animate-spin text-purple-500 opacity-70" />
                          <p className="text-sm text-gray-600">Consulting agents…</p>
                        </div>
                      )}
                      {chatError && !loading && (
                        <div className="rounded-xl border border-red-800/40 bg-red-900/20 p-4 text-sm text-red-300">⚠️ {chatError}</div>
                      )}
                    </div>
                  </div>

                  {/* Agent icon row */}
                  <div className="flex-shrink-0 flex items-center gap-1.5 overflow-x-auto pb-0.5
                    [&::-webkit-scrollbar]:h-[2px] [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">
                    {AGENTS_DEF.map(agent => {
                      const live = agents.find(a => a.name === agent.name)!
                      const isResponding = agent.name === respondingAgent && messages.length > 0
                      const isMentioned = activeAgent === agent.name
                      return (
                        <button
                          key={agent.name}
                          onClick={() => mentionAgent(agent.name)}
                          title={`Chat with ${agent.name}`}
                          className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-all duration-150 hover:scale-[1.03] cursor-pointer
                            ${COLOR_MAP[agent.color]}
                            ${isResponding ? 'ring-2 ring-offset-1 ring-offset-[#07080e] ' + RING_MAP[agent.color] + ' shadow-lg' : ''}
                            ${isMentioned && !isResponding ? 'ring-2 ring-offset-1 ring-offset-[#07080e] ' + RING_MAP[agent.color] : ''}
                          `}
                        >
                          <div className="relative flex-shrink-0">
                            <AgentAvatar avatar={agent.avatar} name={agent.name} color={agent.color} size={22} />
                            <span className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ring-1 ring-[#0d0f1a] ${
                              live.status === 'online'     ? 'bg-green-400' :
                              live.status === 'working'    ? 'bg-amber-400 animate-pulse' :
                              live.status === 'in-meeting' ? 'bg-blue-400' : 'bg-gray-600'
                            }`} />
                          </div>
                          <span className={`text-[9px] font-bold whitespace-nowrap ${isResponding ? TEXT_MAP[agent.color] ?? 'text-purple-300' : 'text-gray-400'}`}>
                            {agent.name === 'McGONAGALL' ? 'McGON.' : agent.name.slice(0, 7)}
                          </span>
                          {isResponding && <span className="text-[9px] animate-pulse">💬</span>}
                        </button>
                      )
                    })}
                  </div>

                  {/* Input area */}
                  <div className="flex-shrink-0 space-y-2">
                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((att, i) => (
                          <div key={i} className="relative group flex-shrink-0">
                            {att.type.startsWith('image/') ? (
                              <img src={att.dataUrl} alt={att.name}
                                className="w-16 h-16 object-cover rounded-xl border border-[#2a2d3a]" />
                            ) : (
                              <div className="w-16 h-16 flex flex-col items-center justify-center bg-[#1e2030] rounded-xl border border-[#2a2d3a] gap-1">
                                <Paperclip size={16} className="text-gray-500" />
                                <span className="text-[9px] text-gray-600 truncate w-14 text-center px-1">{att.name}</span>
                              </div>
                            )}
                            <button
                              onClick={() => setAttachments(a => a.filter((_, j) => j !== i))}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#2a2d3a] hover:bg-red-900/60 border border-[#3a3d50] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <XIcon size={9} className="text-gray-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input ref={attachInputRef} type="file" className="hidden"
                        accept="image/*,video/*,.pdf,.doc,.docx,.txt" multiple
                        onChange={e => {
                          Array.from(e.target.files ?? []).forEach(file => {
                            const reader = new FileReader()
                            reader.onload = ev => setAttachments(a => [...a, {
                              dataUrl: ev.target?.result as string, name: file.name, type: file.type,
                            }])
                            reader.readAsDataURL(file)
                          })
                          e.target.value = ''
                        }}
                      />
                      <button
                        onClick={() => { setPromptBuilderOpen(true); setPromptBuilderResult(''); setPromptBuilderInput('') }}
                        className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-[#0d0f1a] border border-[#1e2030] text-gray-600 hover:text-purple-400 hover:border-purple-800/40 transition-all"
                        title="Build / expand a prompt"
                      >
                        <Wand2 size={16} />
                      </button>
                      <button
                        onClick={() => attachInputRef.current?.click()}
                        className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-[#0d0f1a] border border-[#1e2030] text-gray-600 hover:text-gray-300 hover:border-[#2a2d3a] transition-all"
                        title="Attach file"
                      >
                        <Paperclip size={16} />
                      </button>
                      <textarea
                        rows={1}
                        value={question}
                        onChange={e => { setQuestion(e.target.value); if (!e.target.value.startsWith('@')) setActiveAgent(null) }}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() } }}
                        onPaste={e => {
                          const items = Array.from(e.clipboardData.items)
                          const imgItem = items.find(it => it.type.startsWith('image/'))
                          if (imgItem) {
                            e.preventDefault()
                            const file = imgItem.getAsFile()
                            if (!file) return
                            const reader = new FileReader()
                            reader.onload = ev => setAttachments(a => [...a, {
                              dataUrl: ev.target?.result as string, name: 'pasted-image.png', type: 'image/png',
                            }])
                            reader.readAsDataURL(file)
                          }
                        }}
                        placeholder="@mention an agent, ask anything, paste an image…"
                        className="flex-1 bg-[#07080e] border border-[#1e2030] rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-purple-700/60 transition-colors resize-none overflow-hidden leading-relaxed"
                        style={{ minHeight: 40 }}
                      />
                      <button
                        onClick={ask}
                        disabled={(!question.trim() && attachments.length === 0) || loading}
                        className="flex-shrink-0 bg-purple-800/80 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 transition-colors"
                      >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              </PanelErrorBoundary>
            )}

            {/* ── Agents Panel ──────────────────────────────────────────────── */}
            {activeTool === 'agents' && (
              <PanelErrorBoundary panelName="Agents">
              <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0 overflow-y-auto overflow-x-hidden">
                <div className="flex-shrink-0">
                  <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider mb-2">Hogwarts AI Taskforce — 7 Agents</p>
                  <div className="grid grid-cols-1 gap-2">
                    {AGENTS_DEF.map(agent => {
                      const live = agents.find(a => a.name === agent.name)!
                      const statusColor = live.status === 'online' ? 'bg-emerald-400' : live.status === 'working' ? 'bg-amber-400' : live.status === 'in-meeting' ? 'bg-blue-400' : 'bg-gray-500'
                      return (
                        <div key={agent.name} className={`rounded-xl border p-3 ${COLOR_MAP[agent.color]}`}>
                          <div className="flex items-start gap-3">
                            <div className="relative flex-shrink-0">
                              <AgentAvatar avatar={agent.avatar} name={agent.name} color={agent.color} size={36} />
                              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#0d0f1a] ${statusColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`font-bold text-xs uppercase tracking-wider ${TEXT_MAP[agent.color]}`}>{agent.name}</span>
                                <span className="text-[9px] text-gray-600 capitalize">{live.status.replace('-', ' ')}</span>
                              </div>
                              <p className="text-[11px] text-gray-400 mb-1.5">{agent.role}</p>
                              <div className="flex flex-wrap gap-1">
                                {agent.commands.map(cmd => (
                                  <button
                                    key={cmd}
                                    onClick={() => { mentionAgent(agent.name); setActiveTool('office') }}
                                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${BADGE_MAP[agent.color]} border-current/20 hover:opacity-80 transition-opacity`}
                                  >
                                    {cmd}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={() => { mentionAgent(agent.name); setActiveTool('office') }}
                              className="flex-shrink-0 text-gray-600 hover:text-gray-300 transition-colors"
                              title="Chat with agent"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              </PanelErrorBoundary>
            )}

            {/* ── Activity Panel ────────────────────────────────────────────── */}
            {activeTool === 'activity' && (
              <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
                <div className="flex-shrink-0 flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider">Activity Log</p>
                  <div className="flex gap-3 text-[10px] text-gray-600">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />{onlineCount} online</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />{inMeetingCount} in meeting</span>
                  </div>
                </div>
                {/* Stats row */}
                <div className="flex-shrink-0 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Total Events', value: log.length, icon: BarChart2, color: 'text-purple-400' },
                    { label: 'Chat Events', value: log.filter(l => l.type === 'chat').length, icon: MessageSquare, color: 'text-blue-400' },
                    { label: 'Meetings', value: log.filter(l => l.type === 'meeting').length, icon: Users, color: 'text-amber-400' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-3 flex items-center gap-2.5">
                      <stat.icon size={16} className={stat.color} />
                      <div>
                        <p className="text-sm font-bold text-gray-200">{stat.value}</p>
                        <p className="text-[9px] text-gray-600">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Full log */}
                <div className="flex-1 min-h-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] overflow-y-auto overflow-x-hidden">
                  <div className="p-3 space-y-1">
                    {log.length === 0 && <p className="text-[10px] text-gray-700 text-center py-4">No activity yet</p>}
                    {log.map((entry, i) => {
                      const icon = entry.type === 'chat' ? MessageSquare : entry.type === 'meeting' ? Users : entry.type === 'move' ? ChevronRight : Activity
                      const color = entry.type === 'chat' ? 'text-blue-400' : entry.type === 'meeting' ? 'text-amber-400' : entry.type === 'move' ? 'text-emerald-400' : 'text-purple-400'
                      const Icon = icon
                      return (
                        <div key={i} className="flex items-start gap-2 py-1 border-b border-[#1e2030]/60 last:border-0">
                          <Icon size={10} className={`${color} mt-0.5 flex-shrink-0`} />
                          <p className="text-[10px] text-gray-400 leading-relaxed flex-1">{entry.msg}</p>
                          <span className="text-[9px] text-gray-700 flex-shrink-0 font-mono">{entry.time}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Environment Panel ─────────────────────────────────────────── */}
            {activeTool === 'env' && (
              <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0 overflow-y-auto overflow-x-hidden">
                <p className="flex-shrink-0 text-[10px] font-semibold text-gray-700 uppercase tracking-wider">Connected Integrations</p>
                <div className="space-y-2">
                  {[
                    { name: 'OpenAI',    sub: 'GPT-4o · Whisper · Embeddings', icon: Cpu,      color: 'text-emerald-400', status: 'connected', env: 'OPENAI_API_KEY' },
                    { name: 'Notion',    sub: 'Tasks · EOD database',          icon: BookOpen, color: 'text-gray-300',    status: 'connected', env: 'NOTION_TOKEN' },
                    { name: 'Slack',     sub: 'Bot token · DM delivery',       icon: MessageSquare, color: 'text-purple-400', status: 'connected', env: 'SLACK_BOT_TOKEN' },
                    { name: 'Monday',    sub: 'Project boards · items',        icon: BarChart2,color: 'text-amber-400',   status: 'connected', env: 'MONDAY_API_TOKEN' },
                    { name: 'Frame.io',  sub: 'Video QC · review links',       icon: Clapperboard, color: 'text-red-400', status: 'connected', env: 'FRAMEIO_TOKEN' },
                    { name: 'Google',    sub: 'Calendar · Gmail',              icon: Globe,    color: 'text-blue-400',    status: 'connected', env: 'GOOGLE_CLIENT_ID' },
                    { name: 'Anthropic', sub: 'Claude API (backup)',           icon: Terminal, color: 'text-orange-400',  status: 'connected', env: 'ANTHROPIC_API_KEY' },
                  ].map(svc => (
                    <div key={svc.name} className="bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#1e2030] flex items-center justify-center flex-shrink-0">
                        <svc.icon size={14} className={svc.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-200">{svc.name}</p>
                        <p className="text-[10px] text-gray-600 truncate">{svc.sub}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        <span className="text-[10px] text-emerald-400">connected</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex-shrink-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-3">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Agent Models</p>
                  <div className="space-y-1.5">
                    {AGENTS_DEF.map(a => (
                      <div key={a.name} className="flex items-center justify-between">
                        <span className={`text-[10px] font-medium ${TEXT_MAP[a.color]}`}>{a.name}</span>
                        <span className="text-[9px] font-mono text-gray-600 bg-[#07080e] border border-[#1e2030] rounded px-1.5 py-0.5">
                          {a.name === 'DUMBLEDORE' ? 'gpt-4o' : 'gpt-4o-mini'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Layout Panel ──────────────────────────────────────────────── */}
            {activeTool === 'layout' && (
              <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0 overflow-y-auto overflow-x-hidden">
                <p className="flex-shrink-0 text-[10px] font-semibold text-gray-700 uppercase tracking-wider">Office Layout</p>
                <div className="space-y-3">
                  {/* Room overview */}
                  <div className="bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-3">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Room Assignments</p>
                    <div className="space-y-2">
                      {(Object.entries(ROOMS) as [RoomId, RoomConfig][]).map(([roomId, room]) => {
                        const occupants = agents.filter(a => a.homeRoom === roomId)
                        return (
                          <div key={roomId} className="flex items-center gap-2">
                            <span className="text-sm">{room.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[10px] font-medium ${room.textColor}`}>{room.label}</p>
                              <p className="text-[9px] text-gray-700">{room.sublabel}</p>
                            </div>
                            <div className="flex gap-1">
                              {occupants.map(o => (
                                <div key={o.name} className={`text-[8px] font-bold px-1 py-0.5 rounded ${BADGE_MAP[AGENTS_DEF.find(a => a.name === o.name)?.color ?? 'purple']}`}>
                                  {o.name.slice(0, 3)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {/* Agent positions */}
                  <div className="bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-3">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Current Positions</p>
                    <div className="space-y-1.5">
                      {agents.map(agent => {
                        const room = ROOMS[agent.currentRoom]
                        return (
                          <div key={agent.name} className="flex items-center gap-2">
                            <AgentAvatar avatar={AGENTS_DEF.find(a => a.name === agent.name)!.avatar} name={agent.name} color={agent.color} size={20} />
                            <span className={`text-[10px] font-semibold ${TEXT_MAP[agent.color]}`}>{agent.name}</span>
                            <ChevronRight size={10} className="text-gray-700" />
                            <span className="text-[10px] text-gray-500">{room.emoji} {room.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {/* Controls */}
                  <div className="bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-3">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Controls</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => { setAgents(INITIAL_AGENTS); pushLog('Office reset — all agents back to home rooms.', 'status') }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#07080e] border border-[#1e2030] hover:border-purple-700/40 hover:text-gray-200 text-gray-500 text-[11px] transition-all"
                      >
                        <RotateCcw size={11} /> Reset all agents to home rooms
                      </button>
                      <button
                        onClick={() => {
                          setDragPos({})
                          try { localStorage.removeItem('hw-drag-pos') } catch {}
                          pushLog('Agent positions reset to defaults.', 'status')
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#07080e] border border-[#1e2030] hover:border-amber-700/40 hover:text-gray-200 text-gray-500 text-[11px] transition-all"
                      >
                        <RotateCcw size={11} /> Reset custom agent positions
                      </button>
                      <button
                        onClick={() => triggerRandomMeeting()}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#07080e] border border-[#1e2030] hover:border-blue-700/40 hover:text-gray-200 text-gray-500 text-[11px] transition-all"
                      >
                        <Users size={11} /> Trigger random team meeting
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Settings Panel ────────────────────────────────────────────── */}
            {activeTool === 'settings' && (
              <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0 overflow-y-auto overflow-x-hidden">
                <p className="flex-shrink-0 text-[10px] font-semibold text-gray-700 uppercase tracking-wider">Settings</p>
                <div className="space-y-3">
                  <div className="bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-3 space-y-3">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">App</p>
                    {[
                      { label: 'Agent animations', sub: 'Walking & blinking sprites', default: true },
                      { label: 'Random meetings', sub: 'Agents auto-walk to conference room', default: true },
                      { label: 'Activity logging', sub: 'Track all agent events', default: true },
                      { label: 'Sound effects', sub: 'Coming soon', default: false, disabled: true },
                    ].map(s => (
                      <SettingToggle key={s.label} label={s.label} sub={s.sub} defaultOn={s.default} disabled={s.disabled} />
                    ))}
                  </div>
                  <div className="bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-3 space-y-3">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Notifications</p>
                    {[
                      { label: 'Brief complete', sub: 'Alert when /brief finishes', default: true },
                      { label: 'QC complete', sub: 'Alert when video QC finishes', default: true },
                      { label: 'Agent errors', sub: 'Alert on API failures', default: false },
                    ].map(s => (
                      <SettingToggle key={s.label} label={s.label} sub={s.sub} defaultOn={s.default} />
                    ))}
                  </div>
                  <div className="bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-3">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">About</p>
                    <div className="space-y-1.5 text-[10px] text-gray-600">
                      <div className="flex justify-between"><span>Version</span><span className="font-mono text-gray-400">v1.0</span></div>
                      <div className="flex justify-between"><span>Framework</span><span className="font-mono text-gray-400">Next.js 16</span></div>
                      <div className="flex justify-between"><span>AI Models</span><span className="font-mono text-gray-400">GPT-4o · Whisper</span></div>
                      <div className="flex justify-between"><span>Deployment</span><span className="font-mono text-gray-400">Vercel</span></div>
                    </div>
                    <a href="https://github.com/jaykishi-png/hogwarts-cc" target="_blank" rel="noreferrer"
                      className="mt-3 flex items-center gap-1.5 text-[10px] text-purple-400 hover:text-purple-300 transition-colors">
                      <ExternalLink size={10} /> View on GitHub
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* ── Floor plan ────────────────────────────────────────────────── */}
            <div
              ref={floorRef}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const agentName = e.dataTransfer.getData('agent')
                if (!agentName || !floorRef.current) return
                const rect = floorRef.current.getBoundingClientRect()
                const x = Math.max(3, Math.min(97, ((e.clientX - rect.left) / rect.width) * 100))
                const y = Math.max(3, Math.min(97, ((e.clientY - rect.top)  / rect.height) * 100))
                updateDragPos(agentName, { x, y })
                const newRoom = getRoomFromPos(x, y)
                if (newRoom !== 'great-hall') {
                  setAgents(p => p.map(a => a.name === agentName ? { ...a, homeRoom: newRoom, currentRoom: newRoom } : a))
                  pushLog(`${agentName} moved to ${ROOMS[newRoom].label}.`, 'move')
                }
              }}
              className={`flex-1 min-w-0 relative rounded-xl overflow-hidden border-2 border-[#1a0e06] ${['qc','transcribe','agents','activity','env','layout','settings','chat','knowledge','gfx','product','memory','inbox','collaborate','quick','batch-hooks','calendar','stats','brief-sched','frameio'].includes(activeTool) ? 'hidden' : ''}`}
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
                  highlighted={agent.name === respondingAgent && messages.length > 0}
                  posOverride={agent.currentRoom !== 'great-hall' ? dragPos[agent.name] : undefined}
                />
              ))}
            </div>

            {/* ── Right panel (chat) — hidden in full chat view ─────────────── */}
            <div
              className={`w-[376px] flex-shrink-0 flex flex-col gap-2 relative ${activeTool === 'chat' ? 'hidden' : ''}`}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false) }}
              onDrop={e => {
                e.preventDefault(); setIsDragOver(false)
                Array.from(e.dataTransfer.files).forEach(file => {
                  const reader = new FileReader()
                  reader.onload = ev => setAttachments(a => [...a, {
                    dataUrl: ev.target?.result as string, name: file.name, type: file.type,
                  }])
                  reader.readAsDataURL(file)
                })
              }}
            >
              {/* ── Drop overlay ──────────────────────────────────────────── */}
              {isDragOver && (
                <div className="absolute inset-0 z-50 rounded-xl border-2 border-dashed border-purple-500 bg-purple-900/20 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <Paperclip size={28} className="text-purple-400 mx-auto mb-2 opacity-80" />
                    <p className="text-sm font-medium text-purple-300">Drop to attach</p>
                    <p className="text-[11px] text-purple-500 mt-0.5">images · video · documents</p>
                  </div>
                </div>
              )}

              {/* Proactive alerts banner */}
              <ProactiveAlerts onAction={firePrompt} />

              {/* Agent roster */}
              <div className="flex-shrink-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-2.5">
                <p className="text-[9px] font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Hogwarts AI Taskforce — click to chat
                </p>
                <div className="max-h-[152px] overflow-y-auto pr-0.5
                  [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-track]:bg-transparent
                  [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">
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
              </div>

              {/* ── Response area: history / brief / chat thread ──────────── */}
              <div className="flex-1 min-h-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] flex flex-col overflow-hidden">

                {/* Panel header */}
                <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-[#1e2030]">
                  <span className="text-[9px] font-semibold text-gray-700 uppercase tracking-wider">
                    {showHistory ? 'History' : briefActive ? 'Team Brief' : currentConvoId ? 'Chat' : 'New Chat'}
                  </span>
                  {!briefActive && (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => setShowHistory(h => !h)}
                        title={showHistory ? 'Back to chat' : 'Chat history'}
                        className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${showHistory ? 'text-purple-400 bg-purple-900/20' : 'text-gray-600 hover:text-gray-300'}`}
                      >
                        <Clock size={11} />
                      </button>
                      <button
                        onClick={newConversation}
                        title="New conversation"
                        className="w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:text-gray-300 transition-colors"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Scrollable body */}
                <div
                  ref={briefScrollRef}
                  className="flex-1 min-h-0 overflow-y-auto p-3
                    [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full"
                >

                  {/* ── History list ────────────────────────────────────── */}
                  {showHistory && !briefActive && (
                    <div className="space-y-1.5">
                      {conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2">
                          <Clock size={22} className="text-gray-700" />
                          <p className="text-[11px] text-gray-600">No conversations yet</p>
                          <button onClick={() => setShowHistory(false)}
                            className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors mt-1">
                            Start chatting →
                          </button>
                        </div>
                      ) : conversations.map(convo => (
                        <button
                          key={convo.id}
                          onClick={() => loadConversation(convo)}
                          className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                            convo.id === currentConvoId
                              ? 'border-purple-700/50 bg-purple-900/10'
                              : 'border-[#1e2030] bg-[#0a0c14] hover:border-[#2a2d3a] hover:bg-[#0d0f1a]'
                          }`}
                        >
                          <p className="text-[11px] text-gray-200 truncate">{convo.title}</p>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-[9px] text-gray-600">{format(new Date(convo.updatedAt), 'MMM d · h:mm a')}</p>
                            <p className="text-[9px] text-gray-700">{convo.messages.length} msgs</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* ── /brief thread ──────────────────────────────────── */}
                  {briefActive && !showHistory && (
                    <div className="space-y-2">
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
                      {briefEntries.map((entry, i) => {
                        const isDumbledore = entry.agent === 'DUMBLEDORE'
                        return (
                          <div key={i} className={`rounded-lg border p-2.5 transition-all ${isDumbledore ? 'border-purple-700/50 bg-purple-900/20' : 'border-[#1e2030] bg-[#0a0c14]'}`}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <AgentAvatar avatar={entry.avatar} name={entry.agent} color={entry.color} size={isDumbledore ? 26 : 20} />
                              <div className="flex-1 min-w-0">
                                <span className={`text-[10px] font-bold uppercase tracking-wide ${TEXT_MAP[entry.color] ?? 'text-gray-300'}`}>
                                  {entry.agent === 'McGONAGALL' ? 'McGONAGALL' : entry.agent}
                                </span>
                                <span className="text-[8px] text-gray-600 ml-1.5">{entry.role}</span>
                              </div>
                              {entry.loading && <Loader2 size={9} className="animate-spin text-gray-600 flex-shrink-0" />}
                            </div>
                            {entry.loading && (
                              <div className="space-y-1">
                                <div className="h-2 bg-[#1e2030] rounded animate-pulse w-full" />
                                <div className="h-2 bg-[#1e2030] rounded animate-pulse w-4/5" />
                                <div className="h-2 bg-[#1e2030] rounded animate-pulse w-3/5" />
                              </div>
                            )}
                            {!entry.loading && entry.text && (
                              <div className={`prose prose-invert max-w-none ${isDumbledore ? 'text-[11px] text-gray-200' : 'text-[10px] text-gray-400'}`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                  h1: ({ children }) => <p className="font-bold text-gray-100 mb-1 mt-2 text-[11px]">{children}</p>,
                                  h2: ({ children }) => <p className="font-bold text-gray-200 mb-1 mt-2 text-[11px]">{children}</p>,
                                  h3: ({ children }) => <p className="font-semibold text-gray-300 mb-0.5 mt-1.5 text-[10px]">{children}</p>,
                                  p:  ({ children }) => <p className="mb-1.5 leading-relaxed">{children}</p>,
                                  ul: ({ children }) => <ul className="list-disc list-inside mb-1.5 space-y-0.5">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal list-inside mb-1.5 space-y-0.5">{children}</ol>,
                                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                  strong: ({ children }) => <strong className="font-semibold text-gray-100">{children}</strong>,
                                  em: ({ children }) => <em className="italic text-gray-300">{children}</em>,
                                  code: ({ children }) => <code className="bg-[#1e2030] text-purple-300 rounded px-1 py-0.5 font-mono text-[9px]">{children}</code>,
                                  hr: () => <hr className="border-[#2a2d3a] my-2" />,
                                  blockquote: ({ children }) => <blockquote className="border-l-2 border-purple-700 pl-2 text-gray-400 italic">{children}</blockquote>,
                                }}>{entry.text}</ReactMarkdown>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* ── Chat thread ─────────────────────────────────────── */}
                  {!briefActive && !showHistory && (
                    <div className="space-y-3">
                      {/* Empty state */}
                      {messages.length === 0 && !loading && !chatError && (
                        <div className="flex flex-col items-center justify-center py-8 gap-2.5 text-center">
                          <Image src="/agents/Hogwarts_Cyborg.png" alt="Hogwarts" width={40} height={40}
                            className="rounded-xl object-cover object-top opacity-40" />
                          <p className="text-xs text-gray-600 leading-relaxed">
                            Ask a question or type <span className="text-purple-500 font-mono">/brief</span> for the team briefing.<br />
                            Paste a Frame.io link with <span className="text-red-400 font-mono">/qc</span> for video QC.<br />
                            Type <span className="text-amber-400 font-mono">/rr</span> to open the Revenue Rush knowledge base.
                          </p>
                        </div>
                      )}

                      {/* Message thread */}
                      {messages.map(msg => (
                        <div key={msg.id}>
                          {msg.role === 'user' ? (
                            /* User bubble */
                            <div className="flex justify-end">
                              <div className="max-w-[88%] bg-[#1a1c2e] border border-[#2a2d3a] rounded-xl rounded-tr-sm px-3 py-2 space-y-1.5">
                                {msg.attachments && msg.attachments.filter(a => a.type.startsWith('image/')).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {msg.attachments.filter(a => a.type.startsWith('image/')).map((att, i) => (
                                      <img key={i} src={att.dataUrl} alt={att.name}
                                        className="max-w-[160px] max-h-[120px] object-cover rounded-lg border border-[#2a2d3a]" />
                                    ))}
                                  </div>
                                )}
                                {msg.attachments && msg.attachments.filter(a => !a.type.startsWith('image/')).map((att, i) => (
                                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-gray-400 bg-[#0d0f1a] rounded px-2 py-1">
                                    <Paperclip size={9} className="text-gray-600" /> {att.name}
                                  </div>
                                ))}
                                {msg.content && (
                                  <p className="text-[11px] text-gray-200 leading-relaxed break-words">
                                    {msg.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                                      /^https?:\/\//.test(part)
                                        ? <a key={i} href={part} target="_blank" rel="noreferrer"
                                            className="text-purple-400 hover:text-purple-300 underline underline-offset-2 break-all">
                                            <Link2 size={9} className="inline mr-0.5" />{part}
                                          </a>
                                        : part
                                    )}
                                  </p>
                                )}
                                <p className="text-[9px] text-gray-600 text-right">{msg.timestamp}</p>
                              </div>
                            </div>
                          ) : (
                            /* Agent bubble */
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <AgentAvatar avatar={msg.agentAvatar!} name={msg.agent!} color={msg.agentColor!} size={22} />
                                <span className={`text-[10px] font-bold uppercase tracking-wide ${TEXT_MAP[msg.agentColor ?? 'purple'] ?? 'text-purple-300'}`}>{msg.agent}</span>
                                <span className="text-[8px] text-gray-600 ml-auto font-mono">{msg.timestamp}</span>
                                <button
                                  onClick={() => saveToNotion(msg.id, msg.content, msg.agent ?? 'AGENT')}
                                  title={savedMsgIds.has(msg.id) ? 'Saved to Notion' : 'Save to Notion'}
                                  className={`w-5 h-5 flex items-center justify-center rounded transition-colors flex-shrink-0 ${savedMsgIds.has(msg.id) ? 'text-emerald-400' : 'text-gray-700 hover:text-gray-400'}`}
                                >
                                  <Download size={9} />
                                </button>
                              </div>
                              <div className="ml-7 prose prose-invert max-w-none text-xs text-gray-300">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                  h1: ({ children }) => <p className="font-bold text-gray-100 mb-1.5 mt-2 text-sm">{children}</p>,
                                  h2: ({ children }) => <p className="font-bold text-gray-200 mb-1.5 mt-2 text-[13px]">{children}</p>,
                                  h3: ({ children }) => <p className="font-semibold text-gray-300 mb-1 mt-1.5 text-xs">{children}</p>,
                                  p:  ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                  strong: ({ children }) => <strong className="font-semibold text-gray-100">{children}</strong>,
                                  em: ({ children }) => <em className="italic text-gray-400">{children}</em>,
                                  code: ({ children }) => <code className="bg-[#1e2030] text-purple-300 rounded px-1 py-0.5 font-mono text-[11px]">{children}</code>,
                                  pre: ({ children }) => <pre className="bg-[#1e2030] rounded p-2 overflow-x-auto text-[11px] font-mono my-2">{children}</pre>,
                                  hr: () => <hr className="border-[#2a2d3a] my-3" />,
                                  blockquote: ({ children }) => <blockquote className="border-l-2 border-purple-700 pl-3 text-gray-400 italic my-2">{children}</blockquote>,
                                }}>{msg.content}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Loading */}
                      {loading && messages.length > 0 && messages[messages.length - 1].role === 'agent' && messages[messages.length - 1].content === '' && (
                        <div className="flex items-center gap-2 pl-1">
                          <Loader2 size={14} className="animate-spin text-purple-500 opacity-70" />
                          <p className="text-[11px] text-gray-600">Consulting agents…</p>
                        </div>
                      )}

                      {/* Error */}
                      {chatError && !loading && (
                        <div className="rounded-lg border border-red-800/40 bg-red-900/20 p-3 text-xs text-red-300">⚠️ {chatError}</div>
                      )}
                    </div>
                  )}

                </div>
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
              <div className="flex-shrink-0 space-y-1.5">
                {question.trim().toLowerCase().startsWith('/qc') && (
                  <div className="flex items-center px-1">
                    <span className="text-[10px] text-red-400 font-mono">Use the 🎬 QC panel in the sidebar for video QC</span>
                  </div>
                )}
                {question.trim().toLowerCase().startsWith('/rr') && (
                  <div className="flex items-center px-1">
                    <span className="text-[10px] text-amber-400 font-mono">Press Enter to open the 📚 Revenue Rush knowledge base</span>
                  </div>
                )}

                {/* Attachment previews */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {attachments.map((att, i) => (
                      <div key={i} className="relative group flex-shrink-0">
                        {att.type.startsWith('image/') ? (
                          <img src={att.dataUrl} alt={att.name}
                            className="w-14 h-14 object-cover rounded-lg border border-[#2a2d3a]" />
                        ) : (
                          <div className="w-14 h-14 flex flex-col items-center justify-center bg-[#1e2030] rounded-lg border border-[#2a2d3a] gap-1">
                            <Paperclip size={14} className="text-gray-500" />
                            <span className="text-[8px] text-gray-600 truncate w-12 text-center px-1">{att.name}</span>
                          </div>
                        )}
                        <button
                          onClick={() => setAttachments(a => a.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#2a2d3a] hover:bg-red-900/60 border border-[#3a3d50] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XIcon size={8} className="text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Saved prompts floating picker */}
                {showSavedPicker && (
                  <SavedPromptsPickerInline
                    onSelect={p => { setQuestion(p); setShowSavedPicker(false); setTimeout(() => document.getElementById('hw-input')?.focus(), 50) }}
                    onClose={() => setShowSavedPicker(false)}
                  />
                )}

                {/* Input row */}
                <div className="flex gap-1.5">
                  <input ref={attachInputRef} type="file" className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt" multiple
                    onChange={e => {
                      Array.from(e.target.files ?? []).forEach(file => {
                        const reader = new FileReader()
                        reader.onload = ev => setAttachments(a => [...a, {
                          dataUrl: ev.target?.result as string, name: file.name, type: file.type,
                        }])
                        reader.readAsDataURL(file)
                      })
                      e.target.value = ''
                    }}
                  />
                  <div className="relative flex-1">
                    <textarea
                      ref={textareaRef}
                      id="hw-input"
                      rows={1}
                      value={question}
                      onChange={e => { setQuestion(e.target.value); if (!e.target.value.startsWith('@')) setActiveAgent(null) }}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() } }}
                      onPaste={e => {
                        const items = Array.from(e.clipboardData.items)
                        const imgItem = items.find(it => it.type.startsWith('image/'))
                        if (imgItem) {
                          e.preventDefault()
                          const file = imgItem.getAsFile()
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = ev => setAttachments(a => [...a, {
                            dataUrl: ev.target?.result as string, name: 'pasted-image.png', type: 'image/png',
                          }])
                          reader.readAsDataURL(file)
                        }
                      }}
                      placeholder="@mention, ask anything, paste an image, /brief, /qc, /rr…"
                      className="w-full bg-[#07080e] border border-[#1e2030] rounded-lg pl-3 pr-16 py-2 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-purple-700/60 transition-colors resize-none overflow-hidden leading-relaxed"
                      style={{ minHeight: 40 }}
                    />
                    {/* Inline icons inside the textarea */}
                    <div className="absolute right-2 bottom-0 flex items-center gap-1" style={{ height: 40 }}>
                      {voiceSupported && (
                        <button
                          onClick={toggleVoice}
                          className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${isListening ? 'text-red-400 animate-pulse' : 'text-gray-600 hover:text-blue-400'}`}
                          title={isListening ? 'Stop listening' : 'Voice input'}
                        >
                          {isListening ? <MicOff size={13} /> : <Mic size={13} />}
                        </button>
                      )}
                      <button
                        onClick={() => setShowSavedPicker(p => !p)}
                        className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${showSavedPicker ? 'text-amber-400' : 'text-gray-600 hover:text-amber-400'}`}
                        title="Saved prompts"
                      >
                        <BookMarked size={13} />
                      </button>
                      <button
                        onClick={() => { setPromptBuilderOpen(true); setPromptBuilderResult(''); setPromptBuilderInput('') }}
                        className="w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:text-purple-400 transition-colors"
                        title="Build / expand a prompt"
                      >
                        <Wand2 size={13} />
                      </button>
                      <button
                        onClick={() => attachInputRef.current?.click()}
                        className="w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:text-gray-300 transition-colors"
                        title="Attach image or file"
                      >
                        <Paperclip size={13} />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={ask}
                    disabled={(!question.trim() && attachments.length === 0) || loading}
                    className="flex-shrink-0 bg-purple-800/80 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 transition-colors"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </main>

          {/* ── Bottom bar (hidden on mobile to avoid conflict with bottom toolbar) ── */}
          <div className="hidden md:block">
            <BottomBar
              onlineCount={onlineCount}
              inMeetingCount={inMeetingCount}
              activeBotTab={activeBotTab}
              setActiveBotTab={(t) => {
                setActiveBotTab(t)
                // Map bottom bar tabs to sidebar panels
                const map: Record<string, string> = { environment: 'env', layout: 'layout', settings: 'settings' }
                if (map[t]) setActiveTool(map[t])
              }}
            />
          </div>

        </div>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSetTool={setActiveTool}
        onMentionAgent={mentionAgent}
        onNewConversation={newConversation}
      />

      {/* ── Prompt Builder modal ─────────────────────────────────────────────── */}
      {promptBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setPromptBuilderOpen(false) }}>
          <div className="w-full max-w-2xl mx-4 bg-[#0d0f1a] border border-[#2a2d3a] rounded-2xl shadow-2xl flex flex-col gap-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2030]">
              <div className="flex items-center gap-2">
                <Wand2 size={16} className="text-purple-400" />
                <span className="text-sm font-semibold text-gray-200">Prompt Builder</span>
                <span className="text-[10px] text-gray-600 bg-[#1e2030] rounded px-1.5 py-0.5">Meta-prompt engine</span>
              </div>
              <button onClick={() => setPromptBuilderOpen(false)} className="text-gray-600 hover:text-gray-300 transition-colors">
                <XIcon size={16} />
              </button>
            </div>
            {/* Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] text-gray-500 uppercase tracking-wider mb-1.5 block">Your rough idea</label>
                <textarea
                  autoFocus
                  value={promptBuilderInput}
                  onChange={e => setPromptBuilderInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) buildPrompt() }}
                  placeholder="e.g. write me a prompt that reviews video edits for quality…"
                  rows={3}
                  className="w-full bg-[#07080e] border border-[#1e2030] rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-purple-700/60 transition-colors resize-none"
                />
                <p className="text-[10px] text-gray-700 mt-1">⌘ + Enter to build</p>
              </div>
              <button
                onClick={buildPrompt}
                disabled={!promptBuilderInput.trim() || promptBuilderLoading}
                className="w-full flex items-center justify-center gap-2 bg-purple-800/80 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
              >
                {promptBuilderLoading ? <><Loader2 size={15} className="animate-spin" /> Building…</> : <><Wand2 size={15} /> Build Perfect Prompt</>}
              </button>
              {promptBuilderResult && (
                <div className="space-y-2">
                  <label className="text-[11px] text-gray-500 uppercase tracking-wider block">Expanded prompt</label>
                  <div className="bg-[#07080e] border border-purple-800/30 rounded-xl px-4 py-3 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">
                    {promptBuilderResult}
                  </div>
                  <button
                    onClick={() => { setQuestion(promptBuilderResult); setPromptBuilderOpen(false) }}
                    className="w-full flex items-center justify-center gap-2 bg-[#1e2030] hover:bg-[#2a2d3a] border border-[#2a2d3a] text-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                  >
                    <Send size={14} /> Use this prompt
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
