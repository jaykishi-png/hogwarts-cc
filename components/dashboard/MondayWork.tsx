'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { TaskCard } from '@/components/ui/TaskCard'
import type { Task, ManualPriority } from '@/types/task'

interface Props {
  tasks: Task[]
  onComplete: (id: string) => void
  onDefer: (id: string, until: string) => void
  onPin: (id: string) => void
  onNotToday: (id: string) => void
  onSetPriority: (id: string, p: ManualPriority | null) => void
}

function isNeedsReview(task: Task) {
  return task.tags?.some(t => {
    const lower = t.toLowerCase()
    return lower === 'needs review' || lower === 'needs review jk'
  })
}

function getBoardName(task: Task): string {
  return task.tags?.[0] ?? 'Other'
}

function isSubitem(task: Task): boolean {
  return task.title.includes(' → ')
}

function getParentName(task: Task): string {
  return task.title.split(' → ')[0]
}

function getSubitemName(task: Task): string {
  return task.title.split(' → ').slice(1).join(' → ')
}

// A parent task row with an optional nested subtasks dropdown
function TaskRow({
  task,
  subtasks,
  onComplete, onDefer, onPin, onNotToday, onSetPriority,
}: {
  task: Task
  subtasks: Task[]
  onComplete: (id: string) => void
  onDefer: (id: string, until: string) => void
  onPin: (id: string) => void
  onNotToday: (id: string) => void
  onSetPriority: (id: string, p: ManualPriority | null) => void
}) {
  const [subOpen, setSubOpen] = useState(false)

  return (
    <div>
      <div className="px-2 py-1.5">
        <TaskCard
          task={task}
          onComplete={onComplete}
          onDefer={onDefer}
          onPin={onPin}
          onNotToday={onNotToday}
          onSetPriority={onSetPriority}
          subtaskCount={subtasks.length}
          subtasksOpen={subOpen}
          onToggleSubtasks={() => setSubOpen(v => !v)}
        />
      </div>

      {subtasks.length > 0 && subOpen && (
        <div className="px-2 pb-1.5 ml-9 border-l border-[#2a2d3a] pl-3 space-y-1.5">
          {subtasks.map(sub => {
            const displayTask = { ...sub, title: getSubitemName(sub) }
            return (
              <TaskCard
                key={sub.id}
                task={displayTask}
                onComplete={onComplete}
                onDefer={onDefer}
                onPin={onPin}
                onNotToday={onNotToday}
                onSetPriority={onSetPriority}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export function MondayWork({ tasks, onComplete, onDefer, onPin, onNotToday, onSetPriority }: Props) {
  const mondayTasks = tasks.filter(
    t => t.source === 'monday' && t.status !== 'done' && t.status !== 'archived'
  )

  // Split parents and subtasks
  const parentTasks = mondayTasks.filter(t => !isSubitem(t))
  const subtaskItems = mondayTasks.filter(t => isSubitem(t))

  // Map: parent title → subtasks[]
  const subtaskMap = new Map<string, Task[]>()
  for (const sub of subtaskItems) {
    const parentName = getParentName(sub)
    if (!subtaskMap.has(parentName)) subtaskMap.set(parentName, [])
    subtaskMap.get(parentName)!.push(sub)
  }

  // Orphan subtasks (no matching parent) surfaced as standalone items
  const matchedParentNames = new Set(parentTasks.map(t => t.title))
  const orphanSubtasks = subtaskItems.filter(
    s => !matchedParentNames.has(getParentName(s))
  )

  // Group parents (+ orphans) by board
  const allTopLevel = [...parentTasks, ...orphanSubtasks]
  const boardMap = new Map<string, Task[]>()
  for (const task of allTopLevel) {
    const board = getBoardName(task)
    if (!boardMap.has(board)) boardMap.set(board, [])
    boardMap.get(board)!.push(task)
  }

  // Sort within each board: Needs Review first, then by due date
  for (const [, boardTasks] of boardMap) {
    boardTasks.sort((a, b) => {
      const aR = isNeedsReview(a) ? 0 : 1
      const bR = isNeedsReview(b) ? 0 : 1
      if (aR !== bR) return aR - bR
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
  }

  const boards = Array.from(boardMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  const [openBoards, setOpenBoards] = useState<Set<string>>(
    () => new Set(boards.map(([name]) => name))
  )

  function toggleBoard(name: string) {
    setOpenBoards(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const totalCount = parentTasks.length + orphanSubtasks.length

  return (
    <section>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Monday.com Work
        {totalCount > 0 && (
          <span className="ml-2 bg-blue-900/40 text-blue-400 border border-blue-800/50 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
            {totalCount}
          </span>
        )}
      </h2>

      {totalCount === 0 ? (
        <p className="text-sm text-gray-600 py-3 text-center">No items to review</p>
      ) : (
        <div className="space-y-1">
          {boards.map(([boardName, boardTasks]) => {
            const isOpen = openBoards.has(boardName)
            const reviewCount = boardTasks.filter(isNeedsReview).length

            return (
              <div key={boardName} className="border border-[#2a2d3a] rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleBoard(boardName)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-[#13151e] hover:bg-[#1e2130] transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isOpen
                      ? <ChevronDown size={13} className="text-gray-500 flex-shrink-0" />
                      : <ChevronRight size={13} className="text-gray-500 flex-shrink-0" />
                    }
                    <span className="text-xs font-medium text-gray-300 truncate">{boardName}</span>
                    {reviewCount > 0 && (
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-900/30 border border-amber-700/50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        {reviewCount} review
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-600 flex-shrink-0 ml-2">
                    {boardTasks.length} {boardTasks.length === 1 ? 'item' : 'items'}
                  </span>
                </button>

                {isOpen && (
                  <div className="divide-y divide-[#2a2d3a]">
                    {boardTasks.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        subtasks={subtaskMap.get(task.title) ?? []}
                        onComplete={onComplete}
                        onDefer={onDefer}
                        onPin={onPin}
                        onNotToday={onNotToday}
                        onSetPriority={onSetPriority}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
