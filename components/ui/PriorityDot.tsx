import { clsx } from 'clsx'
import type { ManualPriority } from '@/types/task'

function scoreToColor(score: number): string {
  if (score >= 75) return 'bg-red-500'
  if (score >= 50) return 'bg-orange-400'
  if (score >= 25) return 'bg-yellow-400'
  return 'bg-gray-300'
}

function manualPriorityColor(p: ManualPriority): string {
  if (p === 'P1' || p === 'pinned') return 'bg-red-500'
  if (p === 'P2') return 'bg-orange-400'
  if (p === 'P3') return 'bg-yellow-400'
  return 'bg-gray-300'
}

export function PriorityDot({
  score,
  manualPriority,
}: {
  score: number
  manualPriority?: ManualPriority
}) {
  const colorClass = manualPriority
    ? manualPriorityColor(manualPriority)
    : scoreToColor(score)

  return (
    <span
      className={clsx('inline-block w-2.5 h-2.5 rounded-full flex-shrink-0', colorClass)}
      title={manualPriority ? `Priority: ${manualPriority}` : `Score: ${Math.round(score)}`}
    />
  )
}
