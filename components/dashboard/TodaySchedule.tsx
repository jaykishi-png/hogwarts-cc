'use client'

import { ExternalLink } from 'lucide-react'
import type { CalendarEvent } from '@/types/source'
import { format, parseISO, isBefore, addHours } from 'date-fns'
import { clsx } from 'clsx'

interface Props {
  events: CalendarEvent[]
}

export function TodaySchedule({ events }: Props) {
  const now = new Date()

  const sorted = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  )

  return (
    <section>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Today&apos;s Schedule
      </h2>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">No events today</p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map(event => {
            const start = parseISO(event.start)
            const end = parseISO(event.end)
            const isPast = isBefore(end, now)
            const isNext = !isPast && isBefore(start, addHours(now, 2))
            const duration = Math.round((end.getTime() - start.getTime()) / 60000)

            return (
              <div
                key={event.id}
                className={clsx(
                  'flex items-start gap-2.5 p-2 rounded-lg border text-sm',
                  isPast && 'opacity-40',
                  isNext && 'border-orange-700/60 bg-orange-900/20',
                  !isPast && !isNext && 'border-[#2a2d3a] bg-[#13151e]'
                )}
              >
                <div className="w-12 flex-shrink-0 text-right">
                  <span className="text-xs font-mono text-gray-400">
                    {event.isAllDay ? 'All day' : format(start, 'h:mm')}
                    {!event.isAllDay && (
                      <span className="block text-gray-500 text-[10px]">{format(start, 'a')}</span>
                    )}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-100 text-xs leading-snug">{event.title}</p>
                  {!event.isAllDay && (
                    <p className="text-[11px] text-gray-400">{duration}m</p>
                  )}
                  {event.attendees.length > 1 && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {event.attendees.slice(0, 3).join(', ')}
                      {event.attendees.length > 3 && ` +${event.attendees.length - 3}`}
                    </p>
                  )}
                </div>

                {isNext && (
                  <span className="text-[10px] font-semibold text-orange-400 bg-orange-900/40 px-1.5 py-0.5 rounded flex-shrink-0">
                    NEXT
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
