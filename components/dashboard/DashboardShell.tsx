'use client'

import useSWR from 'swr'
import { useState, useCallback } from 'react'
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
import { EodTasksPanel } from './EodTasksPanel'
import { NavTabs } from './NavTabs'
import { SyncStatus } from '@/components/ui/SyncStatus'
import { KeyboardShortcutsHelp } from '@/components/ui/KeyboardShortcutsHelp'
import type { SyncLogEntry } from '@/types/sync'
import Link from 'next/link'
import { CalendarDays, Sparkles, Loader2, CheckSquare, Square } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const scrollCls = [
  'overflow-y-auto',
  '[&::-webkit-scrollbar]:w-[3px]',
  '[&::-webkit-scrollbar-track]:bg-transparent',
  '[&::-webkit-scrollbar-thumb]:bg-[#2a2d3a]',
  '[&::-webkit-scrollbar-thumb]:rounded-full',
].join(' ')

// Same scrollbar styles but only active at md+ (columns scroll on desktop, flow naturally on mobile)
const colCls = [
  'md:overflow-y-auto',
  '[&::-webkit-scrollbar]:w-[3px]',
  '[&::-webkit-scrollbar-track]:bg-transparent',
  '[&::-webkit-scrollbar-thumb]:bg-[#2a2d3a]',
  '[&::-webkit-scrollbar-thumb]:rounded-full',
].join(' ')

const card = 'bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-4'

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
    <div className="h-screen flex flex-col bg-[#0f1117] overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-[#13151e] border-b border-[#2a2d3a] px-4 sm:px-6 py-3 z-10">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-2">

          {/* Left: title + date + tabs */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 flex-shrink-0">
              <h1 className="text-base font-semibold text-gray-100">Dashboard</h1>
              <span className="text-sm text-gray-500 hidden md:block">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <NavTabs active="dashboard" />
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Link
              href="/calendar"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors border border-[#2a2d3a] rounded-lg px-2 sm:px-2.5 py-1 hover:border-gray-600"
            >
              <CalendarDays size={12} />
              <span className="hidden sm:inline">Calendar</span>
            </Link>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-800/50 rounded-lg px-2.5 py-1.5">
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

            <button
              onClick={selectedIds.size === activeTasks.length ? clearSelection : selectAll}
              className="text-gray-600 hover:text-gray-400 transition-colors"
              title="Select all (⌘A)"
            >
              {selectedIds.size === activeTasks.length && activeTasks.length > 0
                ? <CheckSquare size={14} />
                : <Square size={14} />
              }
            </button>

            <button
              onClick={runAiTriage}
              disabled={triaging}
              title="AI triage (T)"
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 border border-amber-800/50 hover:border-amber-700/60 bg-amber-900/20 rounded-lg px-2 sm:px-2.5 py-1.5 transition-colors disabled:opacity-50"
            >
              {triaging ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              <span className="hidden sm:inline">{triaging ? 'Triaging...' : 'AI Triage'}</span>
            </button>

            <KeyboardShortcutsHelp />
            <SyncStatus isSyncing={isSyncing} onSync={handleSync} lastSyncLogs={syncLogsData?.logs} />
          </div>
        </div>
      </header>

      {/* ── Main canvas ────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4 md:flex-row md:overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center w-full text-gray-400 text-sm">
            Loading your dashboard...
          </div>
        ) : (
          <>
            {/* Column 1 · Priorities */}
            <div className={`${colCls} flex-1 min-w-0 flex flex-col gap-4`}>
              <div className={card}>
                <TopPriorities
                  tasks={activeTasks}
                  onComplete={completeTask}
                  onDefer={deferTask}
                  onPin={pinTask}
                  onNotToday={notTodayTask}
                  onSetPriority={setPriority}
                />
                <div className="mt-4">
                  <QuickAdd onAdd={addTask} />
                </div>
              </div>
              <div className={card}>
                <CompletedToday tasks={completedTasks} />
              </div>
            </div>

            {/* Column 2 · Schedule + Comms */}
            <div className={`${colCls} flex-1 min-w-0 flex flex-col gap-4`}>
              <div className={card}>
                <TodaySchedule events={events} />
              </div>
              <div className={card}>
                <NeedsReply
                  tasks={activeTasks}
                  onComplete={completeTask}
                  onDefer={deferTask}
                  onPin={pinTask}
                  onNotToday={notTodayTask}
                  onSetPriority={setPriority}
                />
              </div>
              <div className={card}>
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

            {/* Column 3 · Work tracking */}
            <div className={`${colCls} flex-1 min-w-0 flex flex-col gap-4`}>
              <div className={card}>
                <EodTasksPanel />
              </div>
              <div className={card}>
                <MondayWork
                  tasks={activeTasks}
                  onComplete={completeTask}
                  onDefer={deferTask}
                  onPin={pinTask}
                  onNotToday={notTodayTask}
                  onSetPriority={setPriority}
                />
              </div>
              <div className={card}>
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
              <div className={card}>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Pipeline Bottlenecks
                </h2>
                <BottleneckView />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
