'use client'

import { useState } from 'react'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { SourceBadge } from '@/components/ui/SourceBadge'
import type { Task } from '@/types/task'
import { format, parseISO } from 'date-fns'

interface Props {
  tasks: Task[]
}

export function CompletedToday({ tasks }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  const completed = tasks.filter(t => t.status === 'done')

  return (
    <section>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left"
      >
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Completed Today
        </h2>
        {completed.length > 0 && (
          <span className="bg-green-900/40 text-green-400 border border-green-800/50 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
            {completed.length}
          </span>
        )}
        <span className="ml-auto text-gray-400">
          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </button>

      {isOpen && (
        <div className="mt-2 space-y-1.5">
          {completed.length === 0 ? (
            <p className="text-sm text-gray-400 py-3 text-center">Nothing completed yet today</p>
          ) : (
            completed.map(task => (
              <div key={task.id} className="flex items-start gap-2 p-2 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg">
                <Check size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 line-through truncate">{task.title}</p>
                </div>
                <SourceBadge source={task.source} />
                {task.completed_at && (
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {format(parseISO(task.completed_at), 'h:mm a')}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </section>
  )
}
