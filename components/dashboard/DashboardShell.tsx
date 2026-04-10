'use client'

import useSWR from 'swr'
import { format } from 'date-fns'
import { useTasks } from '@/hooks/useTasks'
import { useSync } from '@/hooks/useSync'
import { useCalendar } from '@/hooks/useCalendar'
import { TopPriorities } from './TopPriorities'
import { TodaySchedule } from './TodaySchedule'
import { NeedsReply } from './NeedsReply'
import { SlackItems } from './SlackItems'
import { MondayWork } from './MondayWork'
import { NotionTasks } from './NotionTasks'
import { ForReview } from './ForReview'
import { CompletedToday } from './CompletedToday'
import { QuickAdd } from './QuickAdd'
import { SyncStatus } from '@/components/ui/SyncStatus'
import type { SyncLogEntry } from '@/types/sync'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function DashboardShell() {
  const {
    tasks,
    isLoading,
    refresh,
    completeTask,
    deferTask,
    pinTask,
    notTodayTask,
    setPriority,
    confirmTask,
    dismissTask,
    addTask,
  } = useTasks('today')

  const { isSyncing, triggerSync } = useSync()
  const { events } = useCalendar()

  const { data: syncLogsData } = useSWR<{ logs: Record<string, SyncLogEntry> }>(
    '/api/sync/status',
    fetcher,
    { refreshInterval: 60_000 }
  )

  async function handleSync() {
    await triggerSync()
    refresh()
  }

  const completedTasks = tasks.filter(t => t.status === 'done')
  const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'archived')

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="bg-[#13151e] border-b border-[#2a2d3a] px-6 py-3 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-gray-100">Dashboard</h1>
            <span className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d')}</span>
            <Link
              href="/calendar"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors ml-2 border border-[#2a2d3a] rounded-lg px-2.5 py-1 hover:border-gray-600"
            >
              <CalendarDays size={12} />
              Calendar
            </Link>
          </div>
          <SyncStatus
            isSyncing={isSyncing}
            onSync={handleSync}
            lastSyncLogs={syncLogsData?.logs}
          />
        </div>
      </header>

      {/* Main grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            Loading your dashboard...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

            {/* Column 1: Top Priorities + Quick Add */}
            <div className="xl:col-span-1 space-y-6">
              <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-4 space-y-4">
                <TopPriorities
                  tasks={activeTasks}
                  onComplete={completeTask}
                  onDefer={deferTask}
                  onPin={pinTask}
                  onNotToday={notTodayTask}
                  onSetPriority={setPriority}
                />
                <QuickAdd onAdd={addTask} />
              </div>

              <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-4">
                <CompletedToday tasks={completedTasks} />
              </div>
            </div>

            {/* Column 2: Calendar + Needs Reply + Slack */}
            <div className="xl:col-span-1 space-y-6">
              <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-4">
                <TodaySchedule events={events} />
              </div>

              <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-4">
                <NeedsReply
                  tasks={activeTasks}
                  onComplete={completeTask}
                  onDefer={deferTask}
                  onPin={pinTask}
                  onNotToday={notTodayTask}
                  onSetPriority={setPriority}
                />
              </div>

              <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-4">
                <SlackItems
                  tasks={activeTasks}
                  onComplete={completeTask}
                  onDefer={deferTask}
                  onPin={pinTask}
                  onNotToday={notTodayTask}
                  onSetPriority={setPriority}
                />
              </div>
            </div>

            {/* Column 3: Monday + Notion + For Review */}
            <div className="xl:col-span-1 space-y-6">
              <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-4">
                <MondayWork
                  tasks={activeTasks}
                  onComplete={completeTask}
                  onDefer={deferTask}
                  onPin={pinTask}
                  onNotToday={notTodayTask}
                  onSetPriority={setPriority}
                />
              </div>

              <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-4">
                <NotionTasks
                  tasks={activeTasks}
                  onComplete={completeTask}
                  onDefer={deferTask}
                  onPin={pinTask}
                  onNotToday={notTodayTask}
                  onSetPriority={setPriority}
                />
              </div>

              <ForReview
                tasks={tasks}
                onComplete={completeTask}
                onDefer={deferTask}
                onPin={pinTask}
                onNotToday={notTodayTask}
                onSetPriority={setPriority}
                onConfirm={confirmTask}
                onDismiss={dismissTask}
              />
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
