import { clsx } from 'clsx'
import type { TaskSource } from '@/types/task'

const SOURCE_CONFIG: Record<TaskSource, { label: string; classes: string }> = {
  gmail:    { label: 'Gmail',    classes: 'bg-red-900/40 text-red-400 border border-red-800/50' },
  slack:    { label: 'Slack',    classes: 'bg-purple-900/40 text-purple-400 border border-purple-800/50' },
  monday:   { label: 'Monday',   classes: 'bg-blue-900/40 text-blue-400 border border-blue-800/50' },
  notion:   { label: 'Notion',   classes: 'bg-gray-700/60 text-gray-300 border border-gray-600/50' },
  calendar: { label: 'Calendar', classes: 'bg-orange-900/40 text-orange-400 border border-orange-800/50' },
  manual:   { label: 'Manual',   classes: 'bg-green-900/40 text-green-400 border border-green-800/50' },
}

export function SourceBadge({ source }: { source: TaskSource }) {
  const config = SOURCE_CONFIG[source] ?? { label: source, classes: 'bg-gray-700 text-gray-400' }
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', config.classes)}>
      {config.label}
    </span>
  )
}
