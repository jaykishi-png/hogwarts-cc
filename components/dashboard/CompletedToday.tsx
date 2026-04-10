'use client'

import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, ExternalLink, Loader2, Send } from 'lucide-react'
import { SourceBadge } from '@/components/ui/SourceBadge'
import type { Task } from '@/types/task'
import { format, parseISO } from 'date-fns'

interface Props {
  tasks: Task[]
}

export function CompletedToday({ tasks }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [pushed, setPushed] = useState<{ url: string } | null>(null)
  const [pushError, setPushError] = useState<string | null>(null)

  const completed = tasks.filter(t => t.status === 'done')

  async function pushToNotion() {
    setPushing(true)
    setPushError(null)
    try {
      const res = await fetch('/api/notion/eod', { method: 'POST' })
      const data = await res.json()
      if (data.error) setPushError(data.error)
      else setPushed({ url: data.pageUrl })
    } catch (err) {
      setPushError(String(err))
    } finally {
      setPushing(false)
    }
  }

  return (
    <section>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Completed Today
          </h2>
          {completed.length > 0 && (
            <span className="bg-green-900/40 text-green-400 border border-green-800/50 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
              {completed.length}
            </span>
          )}
          <span className="text-gray-600">
            {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </span>
        </button>

        {completed.length > 0 && (
          <button
            onClick={pushToNotion}
            disabled={pushing}
            title="Push completed tasks to today's Notion EOD Report"
            className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 border border-purple-800/50 hover:border-purple-700/60 bg-purple-900/20 rounded px-2 py-0.5 transition-colors disabled:opacity-50"
          >
            {pushing ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
            {pushing ? 'Pushing...' : 'Push to Notion'}
          </button>
        )}
      </div>

      {pushed && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-green-400 bg-green-900/20 border border-green-800/40 rounded px-2.5 py-1">
          <Check size={10} />
          <span>Pushed to today&apos;s EOD report</span>
          <a href={pushed.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-green-400 hover:text-green-300">
            <ExternalLink size={10} />
          </a>
        </div>
      )}
      {pushError && (
        <p className="mt-1.5 text-[11px] text-red-400 bg-red-900/20 border border-red-800/40 rounded px-2.5 py-1">
          Error: {pushError}
        </p>
      )}

      {isOpen && (
        <div className="mt-2 space-y-1.5">
          {completed.length === 0 ? (
            <p className="text-sm text-gray-500 py-3 text-center">Nothing completed yet today</p>
          ) : (
            completed.map(task => (
              <div key={task.id} className="flex items-start gap-2 p-2 bg-[#13151e] border border-[#2a2d3a] rounded-lg">
                <Check size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 line-through truncate">{task.title}</p>
                </div>
                <SourceBadge source={task.source} />
                {task.completed_at && (
                  <span className="text-[10px] text-gray-600 flex-shrink-0">
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
