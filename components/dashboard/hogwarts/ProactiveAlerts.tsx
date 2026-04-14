'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Alert {
  id: string
  message: string
  source: 'gmail' | 'slack' | 'monday'
  count: number
  agentSuggestion: string
  action: string
}

interface ProactiveAlertsProps {
  onAction: (prompt: string) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_KEY = 'hw-alerts-dismissed'

const SOURCE_COLOR: Record<Alert['source'], string> = {
  gmail:  'text-red-400',
  slack:  'text-purple-400',
  monday: 'text-amber-400',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProactiveAlerts({ onAction }: ProactiveAlertsProps) {
  const [alerts,    setAlerts]    = useState<Alert[]>([])
  const [hasUrgent, setHasUrgent] = useState(false)
  const [expanded,  setExpanded]  = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [loaded,    setLoaded]    = useState(false)

  useEffect(() => {
    // Check session-level dismissal
    const wasDismissed = sessionStorage.getItem(SESSION_KEY) === '1'
    if (wasDismissed) { setDismissed(true); setLoaded(true); return }

    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), 5_000)

    fetch('/api/alerts', { signal: controller.signal })
      .then(r => r.json())
      .then((data: { alerts: Alert[]; hasUrgent: boolean }) => {
        setAlerts((data.alerts ?? []).slice(0, 3))
        setHasUrgent(data.hasUrgent ?? false)
      })
      .catch(() => { /* fail silently */ })
      .finally(() => {
        clearTimeout(timeoutId)
        setLoaded(true)
      })

    return () => { controller.abort(); clearTimeout(timeoutId) }
  }, [])

  const dismiss = () => {
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  // Don't render until loaded (avoid flash), or if dismissed, or no alerts
  if (!loaded || dismissed || alerts.length === 0) return null

  const totalCount = alerts.reduce((sum, a) => sum + a.count, 0)

  return (
    <div className="
      flex-shrink-0
      bg-amber-950/30 border border-amber-800/40 rounded-lg
      overflow-hidden
    ">
      {/* ── Banner row ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2">
        <AlertTriangle
          size={12}
          className={`flex-shrink-0 ${hasUrgent ? 'text-amber-400 animate-pulse' : 'text-amber-600'}`}
        />
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-1 flex items-center gap-2 text-left"
        >
          <span className="text-[11px] text-amber-300 font-medium">
            {totalCount} item{totalCount !== 1 ? 's' : ''} need attention
          </span>
          <span className="text-[9px] text-amber-600 uppercase tracking-wide">
            {alerts.map(a => a.source).join(' · ')}
          </span>
          {expanded
            ? <ChevronUp  size={11} className="text-amber-600 ml-auto" />
            : <ChevronDown size={11} className="text-amber-600 ml-auto" />
          }
        </button>
        <button
          onClick={dismiss}
          className="flex-shrink-0 text-amber-800 hover:text-amber-500 transition-colors"
          title="Dismiss for this session"
        >
          <X size={11} />
        </button>
      </div>

      {/* ── Expanded list ────────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-amber-900/40 divide-y divide-amber-900/30">
          {alerts.map(alert => (
            <div key={alert.id} className="flex items-center gap-2 px-3 py-1.5">
              <p className={`flex-1 text-[10px] ${SOURCE_COLOR[alert.source]}`}>
                {alert.message}
              </p>
              <button
                onClick={() => onAction(alert.action)}
                className="
                  flex-shrink-0 text-[9px] font-medium
                  bg-amber-900/30 hover:bg-amber-900/50
                  text-amber-300 border border-amber-800/40
                  px-2 py-0.5 rounded-full
                  transition-colors whitespace-nowrap
                "
              >
                → Ask {alert.agentSuggestion}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
