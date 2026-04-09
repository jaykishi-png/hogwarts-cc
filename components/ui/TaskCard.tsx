'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { Check, Pin, EyeOff, Clock, ExternalLink, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react'
import { SourceBadge } from './SourceBadge'
import { PriorityDot } from './PriorityDot'
import type { Task, ManualPriority } from '@/types/task'
import { formatDistanceToNow, isToday, isPast, parseISO } from 'date-fns'

interface TaskCardProps {
  task: Task
  onComplete: (id: string) => void
  onDefer: (id: string, until: string) => void
  onPin: (id: string) => void
  onNotToday: (id: string) => void
  onSetPriority: (id: string, p: ManualPriority | null) => void
  onConfirm?: (id: string) => void
  onDismiss?: (id: string) => void
  showConfidenceControls?: boolean
  subtaskCount?: number
  subtasksOpen?: boolean
  onToggleSubtasks?: () => void
}

export function TaskCard({
  task,
  onComplete,
  onDefer,
  onPin,
  onNotToday,
  onSetPriority,
  onConfirm,
  onDismiss,
  showConfidenceControls = false,
  subtaskCount,
  subtasksOpen,
  onToggleSubtasks,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [deferDate, setDeferDate] = useState('')

  const isDone = task.status === 'done'
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isDone
  const isDueToday = task.due_date && isToday(parseISO(task.due_date))

  function handleDefer() {
    if (deferDate) {
      onDefer(task.id, new Date(deferDate).toISOString())
      setDeferDate('')
    }
  }

  return (
    <div
      className={clsx(
        'group border rounded-lg p-3 transition-all',
        isDone && 'opacity-50',
        task.manual_priority === 'pinned'
          ? 'border-red-700/60 bg-red-900/10'
          : isOverdue && !isDone
          ? 'border-orange-700/50 bg-[#1a1d27]'
          : 'border-[#2a2d3a] bg-[#1a1d27]'
      )}
    >
      {/* Main row */}
      <div className="flex items-start gap-2.5">
        {/* Complete button */}
        <button
          onClick={() => onComplete(task.id)}
          className={clsx(
            'mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors',
            isDone
              ? 'bg-green-600 border-green-600 text-white'
              : 'border-gray-600 hover:border-green-500 hover:bg-green-900/30'
          )}
          title={isDone ? 'Completed' : 'Mark complete'}
        >
          {isDone && <Check size={10} strokeWidth={3} />}
        </button>

        {/* Priority dot */}
        <PriorityDot score={task.priority_score} manualPriority={task.manual_priority ?? undefined} />

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className={clsx(
            'text-sm font-medium leading-snug',
            isDone ? 'line-through text-gray-600' : 'text-gray-200'
          )}>
            {task.title}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <SourceBadge source={task.source} />

            {task.due_date && (
              <span className={clsx(
                'text-xs',
                isOverdue ? 'text-red-400 font-medium' : isDueToday ? 'text-orange-400 font-medium' : 'text-gray-500'
              )}>
                {isOverdue ? '⚠ Overdue' : isDueToday ? 'Due today' : formatDistanceToNow(parseISO(task.due_date), { addSuffix: true })}
              </span>
            )}

            {task.confidence < 1 && (
              <span className="text-xs text-amber-400 bg-amber-900/30 border border-amber-700/40 px-1.5 py-0.5 rounded">
                {Math.round(task.confidence * 100)}% conf
              </span>
            )}

            {task.tags?.filter(tag => {
              const t = tag.toLowerCase()
              return t === 'needs review' || t === 'needs review jk'
            }).map(tag => (
              <span key={tag} className="text-xs font-semibold text-amber-400 bg-amber-900/30 border border-amber-700/50 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}

            {task.source_url && (
              <a href={task.source_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
                <ExternalLink size={10} /> view
              </a>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-gray-600 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Subtask toggle */}
      {subtaskCount !== undefined && subtaskCount > 0 && onToggleSubtasks && (
        <div className="mt-2 pt-2 border-t border-[#2a2d3a]">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSubtasks() }}
            className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors ml-6"
          >
            {subtasksOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            <span>{subtaskCount} {subtaskCount === 1 ? 'subtask' : 'subtasks'}</span>
          </button>
        </div>
      )}

      {/* Expanded section */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#2a2d3a] space-y-3">
          {task.description && (
            <p className="text-xs text-gray-400">{task.description}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onPin(task.id)}
              className={clsx(
                'flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors',
                task.manual_priority === 'pinned'
                  ? 'border-red-700 bg-red-900/20 text-red-400'
                  : 'border-[#2a2d3a] hover:border-red-700 hover:text-red-400 text-gray-500'
              )}
            >
              <Pin size={10} /> {task.manual_priority === 'pinned' ? 'Pinned' : 'Pin'}
            </button>

            <button
              onClick={() => onNotToday(task.id)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-[#2a2d3a] hover:border-gray-500 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <EyeOff size={10} /> Not today
            </button>

            <select
              value={task.manual_priority ?? ''}
              onChange={(e) => onSetPriority(task.id, (e.target.value as ManualPriority) || null)}
              className="text-xs px-2 py-1 rounded border border-[#2a2d3a] text-gray-400 bg-[#13151e]"
            >
              <option value="">Auto priority</option>
              <option value="P1">P1 — Critical</option>
              <option value="P2">P2 — Important</option>
              <option value="P3">P3 — Nice to have</option>
            </select>

            <div className="flex items-center gap-1">
              <Clock size={10} className="text-gray-600" />
              <input
                type="date"
                value={deferDate}
                onChange={(e) => setDeferDate(e.target.value)}
                className="text-xs px-2 py-1 rounded border border-[#2a2d3a] text-gray-400 bg-[#13151e]"
                min={new Date().toISOString().split('T')[0]}
              />
              {deferDate && (
                <button
                  onClick={handleDefer}
                  className="text-xs px-2 py-1 rounded border border-blue-700 text-blue-400 hover:bg-blue-900/20"
                >
                  Defer
                </button>
              )}
            </div>
          </div>

          {showConfidenceControls && onConfirm && onDismiss && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onConfirm(task.id)}
                className="flex-1 text-xs py-1.5 rounded bg-green-700 text-white hover:bg-green-600 font-medium"
              >
                Confirm — add to tasks
              </button>
              <button
                onClick={() => onDismiss(task.id)}
                className="flex-1 text-xs py-1.5 rounded border border-[#2a2d3a] text-gray-500 hover:bg-[#1e2130]"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
