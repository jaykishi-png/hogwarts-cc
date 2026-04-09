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
}

export function NeedsReply({ tasks, onComplete, onDefer, onPin, onNotToday, onSetPriority }: Props) {
  const replyTasks = tasks.filter(
    t => t.source === 'gmail' && t.status !== 'done' && t.status !== 'archived' && t.confidence >= 0.65
  )

  return (
    <section>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Needs Reply
        {replyTasks.length > 0 && (
          <span className="ml-2 bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
            {replyTasks.length}
          </span>
        )}
      </h2>

      {replyTasks.length === 0 ? (
        <p className="text-sm text-gray-400 py-3 text-center">Inbox clear</p>
      ) : (
        <div className="space-y-2">
          {replyTasks.map(task => (
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
    </section>
  )
}
