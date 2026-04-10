'use client'

import { useMemo } from 'react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns'
import { clsx } from 'clsx'
import { CheckCircle2 } from 'lucide-react'

interface CompletedTask {
  id: string
  title: string
  source: string
  completed_at: string
  tags?: string[]
}

interface Props {
  tasks: CompletedTask[]
  weekOf?: Date
}

const SOURCE_COLORS: Record<string, string> = {
  monday:   'bg-pink-900/40 text-pink-300 border-pink-800/50',
  gmail:    'bg-blue-900/40 text-blue-300 border-blue-800/50',
  notion:   'bg-purple-900/40 text-purple-300 border-purple-800/50',
  slack:    'bg-yellow-900/40 text-yellow-300 border-yellow-800/50',
  calendar: 'bg-green-900/40 text-green-300 border-green-800/50',
  manual:   'bg-gray-800/60 text-gray-400 border-gray-700/50',
}

export function WeeklySummary({ tasks, weekOf = new Date() }: Props) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(weekOf, { weekStartsOn: 1 }) // Mon
    const end   = endOfWeek(weekOf,   { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [weekOf])

  const tasksByDay = useMemo(() => {
    return weekDays.map(day => ({
      day,
      tasks: tasks.filter(t => isSameDay(new Date(t.completed_at), day)),
    }))
  }, [tasks, weekDays])

  const totalThisWeek = tasks.length

  const bySource = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of tasks) {
      map[t.source] = (map[t.source] ?? 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [tasks])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Week of {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d, yyyy')}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 bg-green-900/30 border border-green-800/40 rounded-lg px-2.5 py-1">
          <CheckCircle2 size={12} className="text-green-400" />
          <span className="text-xs font-semibold text-green-400">{totalThisWeek} completed</span>
        </div>
      </div>

      {/* Source breakdown */}
      {bySource.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {bySource.map(([source, count]) => (
            <span
              key={source}
              className={clsx('text-[11px] px-2 py-0.5 rounded-full border font-medium', SOURCE_COLORS[source] ?? SOURCE_COLORS.manual)}
            >
              {source} · {count}
            </span>
          ))}
        </div>
      )}

      {/* Day rows */}
      <div className="space-y-3">
        {tasksByDay.map(({ day, tasks: dayTasks }) => {
          const hasToday = isToday(day)
          return (
            <div key={day.toISOString()}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={clsx(
                  'text-[11px] font-semibold uppercase tracking-wide',
                  hasToday ? 'text-blue-400' : 'text-gray-500'
                )}>
                  {format(day, 'EEE, MMM d')}
                </span>
                {hasToday && (
                  <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-semibold">TODAY</span>
                )}
                <span className="text-[11px] text-gray-600">
                  {dayTasks.length > 0 ? `${dayTasks.length} task${dayTasks.length > 1 ? 's' : ''}` : '—'}
                </span>
              </div>

              {dayTasks.length > 0 && (
                <ul className="space-y-1.5 pl-2 border-l border-[#2a2d3a]">
                  {dayTasks.map(t => (
                    <li key={t.id} className="flex items-start gap-2">
                      <CheckCircle2 size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-300 leading-snug">{t.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border', SOURCE_COLORS[t.source] ?? SOURCE_COLORS.manual)}>
                            {t.source}
                          </span>
                          <span className="text-[10px] text-gray-600">
                            {format(new Date(t.completed_at), 'h:mm a')}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {totalThisWeek === 0 && (
        <p className="text-sm text-gray-500 text-center py-6">No completed tasks this week yet.</p>
      )}
    </div>
  )
}
