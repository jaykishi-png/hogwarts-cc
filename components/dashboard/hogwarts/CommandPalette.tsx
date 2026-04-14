'use client'
import { useState, useEffect, useRef } from 'react'
import {
  Monitor, Bot, MessageSquare, Clapperboard, BookOpen,
  Globe, Layers, Activity, Settings2, Search, ArrowRight, Bell,
} from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  sublabel?: string
  icon: React.ElementType
  color?: string
  action: () => void
}

interface Props {
  open: boolean
  onClose: () => void
  onSetTool: (tool: string) => void
  onMentionAgent: (name: string) => void
  onNewConversation: () => void
}

const PANEL_ITEMS = [
  { key: 'office',        label: 'Office Map',       icon: Monitor },
  { key: 'agents',        label: 'Agents',           icon: Bot },
  { key: 'chat',          label: 'Chat',             icon: MessageSquare },
  { key: 'qc',            label: 'Video QC',         icon: Clapperboard },
  { key: 'knowledge',     label: 'Knowledge Base',   icon: BookOpen },
  { key: 'env',           label: 'Environment',      icon: Globe },
  { key: 'layout',        label: 'Layout',           icon: Layers },
  { key: 'activity',      label: 'Activity',         icon: Activity },
  { key: 'notifications', label: 'Notifications',    icon: Bell },
  { key: 'settings',      label: 'Settings',         icon: Settings2 },
]

const AGENTS = [
  { name: 'DUMBLEDORE', role: 'Chief of Staff',        color: 'text-purple-400' },
  { name: 'HERMIONE',   role: 'Production Controller', color: 'text-amber-400' },
  { name: 'HARRY',      role: 'Creative Review',       color: 'text-red-400' },
  { name: 'RON',        role: 'Strategic Ideation',    color: 'text-orange-400' },
  { name: 'McGONAGALL', role: 'SOP Builder',           color: 'text-emerald-400' },
  { name: 'SNAPE',      role: 'AI Scout',              color: 'text-slate-400' },
  { name: 'HAGRID',     role: 'People Manager',        color: 'text-yellow-400' },
]

export function CommandPalette({ open, onClose, onSetTool, onMentionAgent, onNewConversation }: Props) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const allItems: CommandItem[] = [
    // New conversation shortcut
    {
      id: 'new-chat',
      label: 'New Conversation',
      sublabel: 'Start a fresh chat',
      icon: MessageSquare,
      action: () => { onNewConversation(); onSetTool('chat'); onClose() },
    },
    // Panels
    ...PANEL_ITEMS.map(p => ({
      id: `panel-${p.key}`,
      label: p.label,
      sublabel: 'Open panel',
      icon: p.icon,
      action: () => { onSetTool(p.key); onClose() },
    })),
    // Agents
    ...AGENTS.map(a => ({
      id: `agent-${a.name}`,
      label: `@${a.name}`,
      sublabel: a.role,
      icon: Bot,
      color: a.color,
      action: () => { onMentionAgent(a.name); onSetTool('chat'); onClose() },
    })),
  ]

  const filtered = query.trim()
    ? allItems.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        (item.sublabel?.toLowerCase().includes(query.toLowerCase()) ?? false)
      )
    : allItems

  useEffect(() => { setSelectedIndex(0) }, [query])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      filtered[selectedIndex]?.action()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 bg-[#0d0f1a] border border-[#2a2d3a] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e2030]">
          <Search size={15} className="text-gray-600 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search panels, agents, commands…"
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
          />
          <kbd className="text-[10px] text-gray-700 bg-[#1a1c2e] border border-[#2a2d3a] rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto py-1
            [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-600">No results</div>
          ) : filtered.map((item, i) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={item.action}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selectedIndex ? 'bg-purple-900/20' : 'hover:bg-[#1a1c2e]'
                }`}
              >
                <Icon size={14} className={item.color ?? 'text-gray-500'} />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${item.color ?? 'text-gray-200'}`}>{item.label}</span>
                  {item.sublabel && (
                    <span className="text-[11px] text-gray-600 ml-2">{item.sublabel}</span>
                  )}
                </div>
                {i === selectedIndex && <ArrowRight size={12} className="text-gray-600 flex-shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-[#1e2030]">
          <span className="text-[10px] text-gray-700">↑↓ navigate</span>
          <span className="text-[10px] text-gray-700">↵ select</span>
          <span className="text-[10px] text-gray-700 ml-auto">⌘K to toggle</span>
        </div>
      </div>
    </div>
  )
}
