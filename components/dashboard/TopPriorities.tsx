'use client'

import { useState } from 'react'
import { TaskCard } from '@/components/ui/TaskCard'
import type { Task, ManualPriority } from '@/types/task'

interface Props {
  tasks: Task[]
  onComplete: (id: string) => void
  onDefer: (id: string, until: string) => void
  onPin: (id: string) => void
  onNotToday: (id: string) => void
  onSetPriority: (id: string, p: ManualPriority | null) => void
  maxVisible?: number
}

export function TopPriorities({
  tasks,
  onComplete,
  onDefer,
  onPin,
  onNotToday,
  onSetPriority,
  maxVisible = 7,
}: Props) {
  const [showAll, setShowAll] = useState(false)

  // Pinned first, then by score
  const sorted = [...tasks]
    .filter(t => t.status !== 'done' && t.status !== 'archived' && t.manual_priority !== 'not_today' && t.confidence >= 0.65)
    .sort((a, b) => {
      if (a.manual_priority === 'pinned' && b.manual_priority !== 'pinned') return -1
      if (b.manual_priority === 'pinned' && a.manual_priority !== 'pinned') return 1
      return b.priority_score - a.priority_score
    })

  const visible = showAll ? sorted : sorted.slice(0, maxVisible)

  return (
    <section>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Top Priorities Today
      </h2>

      {visible.length === 0 ? (
        <p className="text-sm text-gray-600 py-4 text-center">No priorities yet — add a task or trigger a sync</p>
      ) : (
        <div className="space-y-2">
          {visible.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={onComplete}
              onDefer={onDefer}
              onPin={onPin}
              onNotToday={onNotToday}
              onSetPriority={onSetPriority}
            />
          ))}
        </div>
      )}

      {sorted.length > maxVisible && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-xs text-blue-400 hover:text-blue-300"
        >
          {showAll ? 'Show less' : `Show ${sorted.length - maxVisible} more`}
        </button>
      )}
    </section>
  )
}
