'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ExternalLink,
  X,
} from 'lucide-react'
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  parseISO,
  isValid,
} from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

type CalendarEventBrand  = 'revenue-rush' | 'the-process' | 'both' | 'unknown'
type CalendarEventType   = 'deadline' | 'publish' | 'review' | 'shoot' | 'other'
type CalendarEventSource = 'monday' | 'notion'

interface CalendarEvent {
  id:     string
  title:  string
  date:   string
  source: CalendarEventSource
  brand:  CalendarEventBrand
  status: string
  type:   CalendarEventType
  url?:   string
}

type ViewMode     = 'week' | 'month'
type BrandFilter  = 'revenue-rush' | 'the-process'

// ─── Style helpers ────────────────────────────────────────────────────────────

const BRAND_DOT: Record<CalendarEventBrand, string> = {
  'revenue-rush': 'bg-amber-400',
  'the-process':  'bg-emerald-400',
  'both':         'bg-sky-400',
  'unknown':      'bg-gray-500',
}

const BRAND_PILL: Record<CalendarEventBrand, string> = {
  'revenue-rush': 'bg-amber-900/40 border-amber-700/40 text-amber-200',
  'the-process':  'bg-emerald-900/40 border-emerald-700/40 text-emerald-200',
  'both':         'bg-sky-900/40 border-sky-700/40 text-sky-200',
  'unknown':      'bg-gray-800/40 border-gray-700/40 text-gray-300',
}

const TYPE_ICON: Record<CalendarEventType, string> = {
  deadline: '⚠️',
  publish:  '🚀',
  review:   '👁️',
  shoot:    '🎬',
  other:    '📌',
}

const SOURCE_BADGE: Record<CalendarEventSource, string> = {
  monday: 'bg-blue-900/50 text-blue-300',
  notion: 'bg-slate-800 text-slate-300',
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-7 gap-1 animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="rounded-lg bg-white/[0.03] h-28 border border-white/5" />
      ))}
    </div>
  )
}

// ─── Popover ──────────────────────────────────────────────────────────────────

interface EventPopoverProps {
  event:   CalendarEvent
  onClose: () => void
}

function EventPopover({ event, onClose }: EventPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute z-50 w-64 rounded-xl border border-white/10 bg-[#0d0f18] shadow-2xl p-4 text-sm"
      style={{ top: '110%', left: 0 }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-2.5 right-2.5 text-gray-600 hover:text-gray-300"
      >
        <X size={13} />
      </button>

      {/* Type icon + title */}
      <div className="flex items-start gap-2 mb-3 pr-4">
        <span className="text-base leading-none mt-0.5">{TYPE_ICON[event.type]}</span>
        <p className="font-semibold text-gray-100 leading-snug">{event.title}</p>
      </div>

      {/* Details grid */}
      <dl className="space-y-1.5 text-[12px]">
        <div className="flex gap-2">
          <dt className="text-gray-500 w-14 flex-shrink-0">Date</dt>
          <dd className="text-gray-200">{event.date}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-500 w-14 flex-shrink-0">Status</dt>
          <dd className="text-gray-200 capitalize">{event.status}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-500 w-14 flex-shrink-0">Source</dt>
          <dd>
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${SOURCE_BADGE[event.source]}`}>
              {event.source}
            </span>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-500 w-14 flex-shrink-0">Brand</dt>
          <dd>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${BRAND_PILL[event.brand]}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${BRAND_DOT[event.brand]}`} />
              {event.brand}
            </span>
          </dd>
        </div>
      </dl>

      {/* External link */}
      {event.url && (
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ExternalLink size={11} />
          Open in {event.source === 'monday' ? 'Monday' : 'Notion'}
        </a>
      )}
    </div>
  )
}

// ─── Event pill ───────────────────────────────────────────────────────────────

interface EventPillProps {
  event: CalendarEvent
}

function EventPill({ event }: EventPillProps) {
  const [open, setOpen] = useState(false)
  const truncated = event.title.length > 20 ? event.title.slice(0, 20) + '…' : event.title

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full text-left flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium transition-opacity hover:opacity-90 ${BRAND_PILL[event.brand]}`}
        title={event.title}
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${BRAND_DOT[event.brand]}`} />
        <span className="truncate">{truncated}</span>
        <span className="ml-auto leading-none">{TYPE_ICON[event.type]}</span>
      </button>

      {open && (
        <EventPopover event={event} onClose={() => setOpen(false)} />
      )}
    </div>
  )
}

// ─── Week view ────────────────────────────────────────────────────────────────

interface WeekViewProps {
  weekStart:     Date
  events:        CalendarEvent[]
  brandFilters:  Set<BrandFilter>
}

function WeekView({ weekStart, events, brandFilters }: WeekViewProps) {
  const days = eachDayOfInterval({
    start: weekStart,
    end:   endOfWeek(weekStart, { weekStartsOn: 1 }),
  })

  const today = new Date()

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map(day => {
        const dateKey   = format(day, 'yyyy-MM-dd')
        const isToday   = isSameDay(day, today)
        const dayEvents = events.filter(e => {
          if (e.date !== dateKey) return false
          if (
            (e.brand === 'revenue-rush' || e.brand === 'both') &&
            brandFilters.has('revenue-rush')
          ) return true
          if (
            (e.brand === 'the-process' || e.brand === 'both') &&
            brandFilters.has('the-process')
          ) return true
          if (e.brand === 'unknown' && (brandFilters.has('revenue-rush') || brandFilters.has('the-process'))) return true
          return false
        })

        return (
          <div
            key={dateKey}
            className={`rounded-lg border p-1.5 min-h-[80px] flex flex-col gap-1 transition-colors ${
              isToday
                ? 'border-amber-700/50 bg-amber-900/10'
                : 'border-white/5 bg-white/[0.02]'
            }`}
          >
            {/* Day header */}
            <div className="flex flex-col items-center mb-0.5">
              <span className="text-[9px] uppercase tracking-widest text-gray-600">
                {format(day, 'EEE')}
              </span>
              <span
                className={`text-xs font-semibold ${
                  isToday ? 'text-amber-300' : 'text-gray-400'
                }`}
              >
                {format(day, 'd')}
              </span>
            </div>

            {/* Events */}
            <div className="flex flex-col gap-0.5">
              {dayEvents.map(ev => (
                <EventPill key={ev.id} event={ev} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Month view ───────────────────────────────────────────────────────────────

interface MonthViewProps {
  currentDate:  Date
  events:       CalendarEvent[]
  brandFilters: Set<BrandFilter>
}

function MonthView({ currentDate, events, brandFilters }: MonthViewProps) {
  const monthStart  = startOfMonth(currentDate)
  const monthEnd    = endOfMonth(currentDate)
  const gridStart   = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd     = endOfWeek(monthEnd,   { weekStartsOn: 1 })
  const days        = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const today       = new Date()
  const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center text-[9px] uppercase tracking-widest text-gray-600 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map(day => {
          const dateKey      = format(day, 'yyyy-MM-dd')
          const inMonth      = isSameMonth(day, currentDate)
          const isToday      = isSameDay(day, today)
          const dayEvents    = events.filter(e => {
            if (e.date !== dateKey) return false
            if (
              (e.brand === 'revenue-rush' || e.brand === 'both') &&
              brandFilters.has('revenue-rush')
            ) return true
            if (
              (e.brand === 'the-process' || e.brand === 'both') &&
              brandFilters.has('the-process')
            ) return true
            if (e.brand === 'unknown' && (brandFilters.has('revenue-rush') || brandFilters.has('the-process'))) return true
            return false
          })

          return (
            <div
              key={dateKey}
              className={`rounded p-1 min-h-[44px] border transition-colors ${
                isToday
                  ? 'border-amber-700/50 bg-amber-900/10'
                  : inMonth
                    ? 'border-white/5 bg-white/[0.015]'
                    : 'border-transparent bg-transparent'
              }`}
            >
              <span
                className={`text-[10px] font-medium block mb-0.5 ${
                  isToday
                    ? 'text-amber-300'
                    : inMonth
                      ? 'text-gray-400'
                      : 'text-gray-700'
                }`}
              >
                {format(day, 'd')}
              </span>

              {dayEvents.length > 0 && (
                <div className="flex flex-wrap gap-0.5 items-center">
                  {dayEvents.slice(0, 3).map(ev => (
                    <span
                      key={ev.id}
                      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${BRAND_DOT[ev.brand]}`}
                      title={ev.title}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] text-gray-600">+{dayEvents.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function ContentCalendarPanel() {
  const [view, setView]           = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [events, setEvents]       = useState<CalendarEvent[]>([])
  const [loading, setLoading]     = useState(true)
  const [brandFilters, setBrandFilters] = useState<Set<BrandFilter>>(
    new Set(['revenue-rush', 'the-process'])
  )

  // ── Fetch events ────────────────────────────────────────────────────────────

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/calendar-data')
      const data = await res.json() as { events?: CalendarEvent[] }
      const raw  = data.events ?? []

      // Parse and validate dates
      const valid = raw.filter(e => {
        const d = parseISO(e.date)
        return isValid(d)
      })

      setEvents(valid)
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadEvents() }, [loadEvents])

  // ── Navigation ──────────────────────────────────────────────────────────────

  function navigatePrev() {
    setCurrentDate(d => view === 'week' ? subWeeks(d, 1) : subMonths(d, 1))
  }

  function navigateNext() {
    setCurrentDate(d => view === 'week' ? addWeeks(d, 1) : addMonths(d, 1))
  }

  // ── Brand filter toggle ──────────────────────────────────────────────────────

  function toggleBrand(brand: BrandFilter) {
    setBrandFilters(prev => {
      const next = new Set(prev)
      if (next.has(brand)) {
        next.delete(brand)
      } else {
        next.add(brand)
      }
      return next
    })
  }

  // ── Period label ────────────────────────────────────────────────────────────

  const periodLabel = view === 'week'
    ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
    : format(currentDate, 'MMMM yyyy')

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: 'transparent' }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center gap-2 mb-3 px-1">
        <CalendarDays size={15} className="text-amber-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-200">📅 Content Calendar</span>

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
          {(['week', 'month'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                view === v
                  ? 'bg-white/10 text-gray-200'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Navigation + brand filters ── */}
      <div className="flex-shrink-0 flex items-center gap-2 mb-3 px-1">
        {/* Prev */}
        <button
          onClick={navigatePrev}
          className="text-gray-500 hover:text-gray-200 transition-colors p-0.5 rounded"
          aria-label="Previous period"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Period label */}
        <span className="text-xs text-gray-400 font-medium flex-1 text-center">
          {periodLabel}
        </span>

        {/* Next */}
        <button
          onClick={navigateNext}
          className="text-gray-500 hover:text-gray-200 transition-colors p-0.5 rounded"
          aria-label="Next period"
        >
          <ChevronRight size={16} />
        </button>

        {/* Spacer */}
        <span className="w-px h-4 bg-white/10 mx-1" />

        {/* Brand toggles */}
        {(
          [
            { key: 'revenue-rush' as BrandFilter, label: 'RR', dot: 'bg-amber-400' },
            { key: 'the-process'  as BrandFilter, label: 'TP', dot: 'bg-emerald-400' },
          ] as const
        ).map(b => (
          <button
            key={b.key}
            onClick={() => toggleBrand(b.key)}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-semibold border transition-all ${
              brandFilters.has(b.key)
                ? 'border-white/15 bg-white/5 text-gray-200'
                : 'border-transparent text-gray-600 hover:text-gray-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${b.dot}`} />
            {b.label}
          </button>
        ))}
      </div>

      {/* ── Calendar body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {loading ? (
          <SkeletonGrid />
        ) : view === 'week' ? (
          <WeekView
            weekStart={weekStart}
            events={events}
            brandFilters={brandFilters}
          />
        ) : (
          <MonthView
            currentDate={currentDate}
            events={events}
            brandFilters={brandFilters}
          />
        )}
      </div>

      {/* ── Legend ── */}
      <div className="flex-shrink-0 flex items-center gap-3 mt-2 px-1 pt-2 border-t border-white/5">
        {Object.entries(TYPE_ICON).map(([type, icon]) => (
          <span key={type} className="text-[10px] text-gray-600 flex items-center gap-0.5">
            {icon} {type}
          </span>
        ))}
      </div>
    </div>
  )
}
