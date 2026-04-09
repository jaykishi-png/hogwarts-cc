'use client'

import { TaskCard } from '@/components/ui/TaskCard'
import type { Task, ManualPriority } from '@/types/task'

interface Props {
  tasks: Task[]
  onComplete: (id: string) => void
  onDefer: (id: string, until: string) => void
  onPin: (id: string) => void
  onNotToday: (id: string) => void
  onSetPriority: (id: string, p: ManualPriority | null) => void
  onConfirm: (id: string) => void
  onDismiss: (id: string) => void
}

export function ForReview({
  tasks,
  onComplete,
  onDefer,
  onPin,
  onNotToday,
  onSetPriority,
  onConfirm,
  onDismiss,
}: Props) {
  const reviewTasks = tasks.filter(
    t => t.status !== 'done' && t.status !== 'archived' && t.confidence < 0.65
  )

  if (reviewTasks.length === 0) return null

  return (
    <section>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        For Review
        <span className="ml-2 bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
          {reviewTasks.length} low confidence
        </span>
      </h2>
      <p className="text-[11px] text-gray-400 mb-2">
        These items were extracted automatically. Confirm to add to your task list, or dismiss to ignore.
      </p>

      <div className="space-y-2">
        {reviewTasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onComplete={onComplete}
            onDefer={onDefer}
            onPin={onPin}
            onNotToday={onNotToday}
            onSetPriority={onSetPriority}
            onConfirm={onConfirm}
            onDismiss={onDismiss}
            showConfidenceControls
          />
        ))}
      </div>
    </section>
  )
}
