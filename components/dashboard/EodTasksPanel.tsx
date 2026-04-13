'use client'

import useSWR from 'swr'
import { ExternalLink, CheckCircle2, Clock, AlertTriangle, RefreshCw } from 'lucide-react'
import type { EodDay, EodTask } from '@/app/api/notion/eod-tasks/route'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const SECTION_CONFIG = {
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-900/20 border-emerald-800/30' },
  'in-progress': { label: 'In Progress', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-800/30' },
  blockers: { label: 'Blockers', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-900/20 border-red-800/30' },
}

function TaskGroup({ section, tasks }: { section: EodTask['section']; tasks: EodTask[] }) {
  if (!tasks.length) return null
  const config = SECTION_CONFIG[section]
  const Icon = config.icon

  return (
    <div className={`rounded-lg border p-2.5 ${config.bg}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={11} className={config.color} />
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${config.color}`}>
          {config.label} ({tasks.length})
        </span>
      </div>
      <ul className="space-y-1">
        {tasks.map((task, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full ${
              task.checked ? 'bg-emerald-400' : 'bg-gray-600'
            }`} />
            <span className={`text-xs leading-snug ${
              task.checked ? 'text-gray-500 line-through' : 'text-gray-300'
            }`}>
              {task.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function EodTasksPanel() {
  const { data, error, isLoading, mutate } = useSWR<EodDay>(
    '/api/notion/eod-tasks',
    fetcher,
    {
      refreshInterval: 60_000, // refresh every 60s for near-real-time
      revalidateOnFocus: true,
    }
  )

  const completed = data?.tasks.filter(t => t.section === 'completed') ?? []
  const inProgress = data?.tasks.filter(t => t.section === 'in-progress') ?? []
  const blockers = data?.tasks.filter(t => t.section === 'blockers') ?? []

  const hasAnyTasks = completed.length + inProgress.length + blockers.length > 0

  const formattedDate = data?.date
    ? new Date(data.date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      })
    : null

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">📋</span>
          <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Jay's EOD Tasks
          </h2>
          {formattedDate && (
            <span className="text-xs text-gray-600">— {formattedDate}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {data?.pageUrl && (
            <a
              href={data.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ExternalLink size={10} />
              Notion
            </a>
          )}
          <button
            onClick={() => mutate()}
            className="text-gray-600 hover:text-gray-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={11} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="text-xs text-gray-600 py-2">Loading EOD tasks...</div>
      )}

      {error && (
        <div className="text-xs text-red-400 py-2">⚠️ Failed to load EOD tasks</div>
      )}

      {!isLoading && !error && !hasAnyTasks && (
        <div className="text-xs text-gray-600 py-2">
          No tasks found for Jay in today's EOD report.
        </div>
      )}

      {hasAnyTasks && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <TaskGroup section="completed" tasks={completed} />
          <TaskGroup section="in-progress" tasks={inProgress} />
          <TaskGroup section="blockers" tasks={blockers} />
        </div>
      )}
    </div>
  )
}
