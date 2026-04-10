'use client'

import useSWR from 'swr'
import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { useTasks } from '@/hooks/useTasks'
import { useSync } from '@/hooks/useSync'
import { useCalendar } from '@/hooks/useCalendar'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { TopPriorities } from './TopPriorities'
import { TodaySchedule } from './TodaySchedule'
import { NeedsReply } from './NeedsReply'
import { SlackItems } from './SlackItems'
import { MondayWork } from './MondayWork'
import { NotionTasks } from './NotionTasks'
import { ForReview } from './ForReview'
import { CompletedToday } from './CompletedToday'
import { BottleneckView } from './BottleneckView'
import { QuickAdd } from './QuickAdd'
import { HogwartsPanel } from './HogwartsPanel'
import { SyncStatus } from '@/components/ui/SyncStatus'
import { KeyboardShortcutsHelp } from '@/components/ui/KeyboardShortcutsHelp'
import type { SyncLogEntry } from '@/types/sync'
import Link from 'next/link'
import { CalendarDays, Sparkles, Loader2, CheckSquare, Square } from 'lucide-react'

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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [triaging, setTriaging] = useState(false)
  const [focusedIdx, setFocusedIdx] = useState(-1)

  async function handleSync() {
    await triggerSync()
    refresh()
  }

  const completedTasks = tasks.filter(t => t.status === 'done')
  const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'archived')

  async function bulkComplete() {
    if (!selectedIds.size) return
    setBulkLoading(true)
    await fetch('/api/tasks/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskIds: Array.from(selectedIds), action: 'complete' }),
    })
    setSelectedIds(new Set())
    setBulkLoading(false)
    refresh()
  }

  async function runAiTriage() {
    setTriaging(true)
    await fetch('/api/ai/triage', { method: 'POST' })
    setTriaging(false)
    refresh()
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(activeTasks.map(t => t.id)))
  }, [activeTasks])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const focusedTask = activeTasks[focusedIdx]

  useKeyboardShortcuts({
    onComplete: () => {
      if (selectedIds.size > 0) { bulkComplete(); return }
      if (focusedTask) completeTask(focusedTask.id)
    },
    onSnooze: () => {
      if (focusedTask) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(9, 0, 0, 0)
        deferTask(focusedTask.id, tomorrow.toISOString())
      }
    },
    onOpen: () => {
      if (focusedTask?.source_url) window.open(focusedTask.source_url, '_blank')
    },
    onSelectNext: () => setFocusedIdx(i => Math.min(i + 1, activeTasks.length - 1)),
    onSelectPrev: () => setFocusedIdx(i => Math.max(i - 1, 0)),
    onEscape: clearSelection,
    onSelectAll: selectAll,
    onTriage: runAiTriage,
  })

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
          <div className="flex items-center gap-2">
            {/* Bulk actions bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-800/50 rounded-lg px-3 py-1.5">
                <span className="text-xs text-blue-400">{selectedIds.size} selected</span>
                <button
                  onClick={bulkComplete}
                  disabled={bulkLoading}
                  className="text-xs text-green-400 hover:text-green-300 font-medium disabled:opacity-50"
                >
                  {bulkLoading ? <Loader2 size={12} className="animate-spin" /> : '✓ Done All'}
                </button>
                <button onClick={clearSelection} className="text-xs text-gray-500 hover:text-gray-400">✕</button>
              </div>
            )}

            {/* Select all */}
            <button
              onClick={selectedIds.size === activeTasks.length ? clearSelection : selectAll}
              className="text-gray-600 hover:text-gray-400 transition-colors"
              title="Select all tasks (⌘A)"
            >
              {selectedIds.size === activeTasks.length && activeTasks.length > 0
                ? <CheckSquare size={14} />
                : <Square size={14} />
              }
            </button>

            {/* AI Triage */}
            <button
              onClick={runAiTriage}
              disabled={triaging}
              title="Run AI priority triage (T)"
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 border border-amber-800/50 hover:border-amber-700/60 bg-amber-900/20 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50"
            >
              {triaging ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {triaging ? 'Triaging...' : 'AI Triage'}
            </button>

            <KeyboardShortcutsHelp />

            <SyncStatus
              isSyncing={isSyncing}
              onSync={handleSync}
              lastSyncLogs={syncLogsData?.logs}
            />
          </div>
        </div>
      </header>

      {/* Main grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            Loading your dashboard...
          </div>
        ) : (
          <div className="space-y-6">
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

                <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-4">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Pipeline Bottlenecks
                  </h2>
                  <BottleneckView />
                </div>
              </div>

            </div>

            {/* Hogwarts Agent Panel */}
            <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-4">
              <HogwartsPanel />
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
