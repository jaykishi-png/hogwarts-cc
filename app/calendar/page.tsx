'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { CalendarView } from '@/components/calendar/CalendarView'
import { WeeklySummary } from '@/components/calendar/WeeklySummary'
import { LayoutDashboard } from 'lucide-react'
import Link from 'next/link'

interface CompletedTask {
  id: string
  title: string
  source: string
  completed_at: string
  tags?: string[]
  source_url?: string
}

export default function CalendarPage() {
  const [month, setMonth] = useState(new Date())
  const [tasks, setTasks] = useState<CompletedTask[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async (m: Date) => {
    setLoading(true)
    // Fetch a wider range so weekly summary + calendar both have data
    const from = format(startOfWeek(startOfMonth(m), { weekStartsOn: 0 }), 'yyyy-MM-dd')
    const to   = format(endOfWeek(endOfMonth(m),     { weekStartsOn: 0 }), 'yyyy-MM-dd')
    try {
      const res = await fetch(`/api/tasks/completed?from=${from}&to=${to}`)
      const data = await res.json()
      setTasks(data.tasks ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasks(month) }, [month, fetchTasks])

  function handleMonthChange(m: Date) {
    setMonth(m)
  }

  // Weekly tasks = current real week, regardless of displayed month
  const weekFrom = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekTo   = format(endOfWeek(new Date(),   { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weeklyTasks = tasks.filter(t => {
    const d = t.completed_at.slice(0, 10)
    return d >= weekFrom && d <= weekTo
  })

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="bg-[#13151e] border-b border-[#2a2d3a] px-6 py-3 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 transition-colors text-sm"
            >
              <LayoutDashboard size={14} />
              Dashboard
            </Link>
            <span className="text-gray-600">/</span>
            <h1 className="text-sm font-semibold text-gray-200">Completion Calendar</h1>
          </div>
          <span className="text-xs text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {loading && (
          <div className="text-center py-12 text-sm text-gray-500">Loading...</div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Calendar — left/main col */}
            <div className="lg:col-span-3 bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Completion Calendar
              </h2>
              <CalendarView
                tasks={tasks}
                month={month}
                onMonthChange={handleMonthChange}
              />
            </div>

            {/* Weekly summary — right col */}
            <div className="lg:col-span-2 bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-5">
              <WeeklySummary tasks={weeklyTasks} weekOf={new Date()} />
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
