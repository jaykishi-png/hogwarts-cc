'use client'
import { useState, useEffect } from 'react'
import { Bell, RefreshCw, ExternalLink, AlertCircle, Calendar, MessageSquare, CheckSquare } from 'lucide-react'
import { format } from 'date-fns'

interface NotifItem {
  id: string
  source: 'monday' | 'slack' | 'calendar' | 'notion'
  title: string
  subtitle?: string
  url?: string
  priority?: string
  updatedAt: string
}

const SOURCE_CONFIG = {
  monday:   { icon: CheckSquare,  color: 'text-amber-400',  border: 'border-l-amber-500',  label: 'Monday' },
  slack:    { icon: MessageSquare, color: 'text-purple-400', border: 'border-l-purple-500', label: 'Slack' },
  calendar: { icon: Calendar,     color: 'text-blue-400',   border: 'border-l-blue-500',   label: 'Calendar' },
  notion:   { icon: Bell,         color: 'text-gray-400',   border: 'border-l-gray-500',   label: 'Notion' },
}

export function NotificationFeed() {
  const [items, setItems]     = useState<NotifItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [filter, setFilter]   = useState<string>('all')

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { items: NotifItem[] }
      setItems(data.items ?? [])
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const sources = ['all', 'monday', 'slack', 'calendar', 'notion']
  const filtered = filter === 'all' ? items : items.filter(i => i.source === filter)

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-2 min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between">
        <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider">Activity Feed</p>
        <button onClick={load} disabled={loading} className="text-gray-600 hover:text-gray-300 transition-colors disabled:opacity-40">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Source filter pills */}
      <div className="flex-shrink-0 flex items-center gap-1.5 flex-wrap">
        {sources.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-all capitalize ${
              filter === s
                ? 'bg-purple-900/30 border-purple-700/50 text-purple-300'
                : 'bg-transparent border-[#1e2030] text-gray-600 hover:border-[#2a2d3a] hover:text-gray-400'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 min-h-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] overflow-y-auto
        [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2">
            <RefreshCw size={14} className="animate-spin text-purple-500 opacity-60" />
            <span className="text-xs text-gray-600">Loading activity…</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-4">
            <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Bell size={22} className="text-gray-700" />
            <p className="text-xs text-gray-600">No activity yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1e2030]">
            {filtered.map(item => {
              const cfg = SOURCE_CONFIG[item.source]
              const Icon = cfg.icon
              return (
                <div key={item.id} className={`flex items-start gap-3 px-3 py-2.5 border-l-2 ${cfg.border} hover:bg-[#0a0c14] transition-colors`}>
                  <Icon size={12} className={`${cfg.color} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-200 leading-snug truncate">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-[10px] text-gray-600 leading-snug truncate mt-0.5">{item.subtitle}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] font-semibold uppercase ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-[9px] text-gray-700">{format(new Date(item.updatedAt), 'MMM d · h:mm a')}</span>
                      {item.priority && item.priority !== 'normal' && (
                        <span className="text-[9px] text-amber-400 font-medium">{item.priority}</span>
                      )}
                    </div>
                  </div>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noreferrer" className="flex-shrink-0 text-gray-700 hover:text-gray-400 transition-colors mt-0.5">
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
