'use client'

import { useState, useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay,
  addMonths, subMonths, startOfDay,
} from 'date-fns'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { clsx } from 'clsx'

interface CompletedTask {
  id: string
  title: string
  source: string
  completed_at: string
  tags?: string[]
  source_url?: string
}

const SOURCE_COLORS: Record<string, string> = {
  monday: 'bg-pink-500',
  gmail:  'bg-blue-500',
  notion: 'bg-purple-500',
  slack:  'bg-yellow-500',
  calendar: 'bg-green-500',
  manual: 'bg-gray-400',
}

function sourceColor(source: string) {
  return SOURCE_COLORS[source] ?? 'bg-gray-400'
}

function sourceBadge(source: string) {
  const colors: Record<string, string> = {
    monday:   'bg-pink-900/40 text-pink-300 border-pink-800/50',
    gmail:    'bg-blue-900/40 text-blue-300 border-blue-800/50',
    notion:   'bg-purple-900/40 text-purple-300 border-purple-800/50',
    slack:    'bg-yellow-900/40 text-yellow-300 border-yellow-800/50',
    calendar: 'bg-green-900/40 text-green-300 border-green-800/50',
    manual:   'bg-gray-800/60 text-gray-400 border-gray-700/50',
  }
  return colors[source] ?? 'bg-gray-800/60 text-gray-400 border-gray-700/50'
}

interface Props {
  tasks: CompletedTask[]
  month: Date
  onMonthChange: (d: Date) => void
}

export function CalendarView({ tasks, month, onMonthChange }: Props) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const tasksByDay = useMemo(() => {
    const map = new Map<string, CompletedTask[]>()
    for (const t of tasks) {
      const key = format(startOfDay(new Date(t.completed_at)), 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return map
  }, [tasks])

  const calDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
    const end   = endOfWeek(endOfMonth(month),     { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [month])

  const selectedTasks = selectedDay
    ? (tasksByDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? [])
    : []

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onMonthChange(subMonths(month, 1))}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#2a2d3a] transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <h2 className="text-sm font-semibold text-gray-200">
          {format(month, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => onMonthChange(addMonths(month, 1))}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#2a2d3a] transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-px">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-500 pb-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-[#2a2d3a] rounded-xl overflow-hidden border border-[#2a2d3a]">
        {calDays.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const dayTasks = tasksByDay.get(key) ?? []
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
          const isCurrentMonth = isSameMonth(day, month)
          const isTodayDate = isToday(day)

          return (
            <button
              key={key}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={clsx(
                'relative min-h-[64px] p-1.5 text-left transition-colors',
                isSelected ? 'bg-[#252840]' : 'bg-[#13151e] hover:bg-[#1a1d27]',
                !isCurrentMonth && 'opacity-30'
              )}
            >
              <span className={clsx(
                'inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-medium mb-1',
                isTodayDate
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400'
              )}>
                {format(day, 'd')}
              </span>

              {/* Task dots */}
              {dayTasks.length > 0 && (
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((t, i) => (
                    <div
                      key={i}
                      className={clsx(
                        'w-full h-1 rounded-full',
                        sourceColor(t.source)
                      )}
                    />
                  ))}
                  {dayTasks.length > 3 && (
                    <p className="text-[9px] text-gray-500 leading-none">
                      +{dayTasks.length - 3} more
                    </p>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-200">
              {format(selectedDay, 'EEEE, MMMM d')}
            </h3>
            <span className="text-xs text-gray-500">
              {selectedTasks.length} completed
            </span>
          </div>

          {selectedTasks.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">Nothing completed this day.</p>
          ) : (
            <ul className="space-y-2">
              {selectedTasks.map(t => (
                <li key={t.id} className="flex items-start gap-2">
                  <div className={clsx('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', sourceColor(t.source))} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 leading-snug">{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border', sourceBadge(t.source))}>
                        {t.source}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {format(new Date(t.completed_at), 'h:mm a')}
                      </span>
                    </div>
                  </div>
                  {t.source_url && (
                    <a href={t.source_url} target="_blank" rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-400 flex-shrink-0 mt-0.5">
                      <ExternalLink size={12} />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
