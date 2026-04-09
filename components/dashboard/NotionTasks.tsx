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

export function NotionTasks({ tasks, onComplete, onDefer, onPin, onNotToday, onSetPriority }: Props) {
  const notionTasks = tasks.filter(
    t => t.source === 'notion' && t.status !== 'done' && t.status !== 'archived'
  )

  return (
    <section>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Personal Tasks (Notion)
      </h2>

      {notionTasks.length === 0 ? (
        <p className="text-sm text-gray-400 py-3 text-center">No Notion tasks</p>
      ) : (
        <div className="space-y-2">
          {notionTasks.map(task => (
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
