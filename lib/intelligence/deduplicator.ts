import { getTaskBySourceItem, listTasks } from '@/lib/db/tasks'
import type { Task } from '@/types/task'

// Simple character-level Levenshtein distance
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j])
    }
  }
  return dp[m][n]
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / maxLen
}

type DedupeDecision = 'create' | 'update' | 'skip'

interface DedupeResult {
  decision: DedupeDecision
  existingTaskId?: string
  similarity?: number
}

export async function checkDuplicate(
  source: string,
  externalId: string,
  title: string
): Promise<DedupeResult> {
  // 1. Exact source+ID match → always update, never duplicate
  const exactMatch = await getTaskBySourceItem(source, externalId)
  if (exactMatch) {
    return { decision: 'update', existingTaskId: exactMatch.id }
  }

  // 2. Fuzzy title match within same source (last 7 days)
  const recentTasks = await listTasks({
    source: source as Task['source'],
    excludeStatuses: ['archived'],
  })

  const recentEnough = recentTasks.filter(t => {
    const daysSince = (Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24)
    return daysSince <= 7
  })

  for (const task of recentEnough) {
    const sim = similarity(title, task.title)
    if (sim >= 0.85) {
      return { decision: 'skip', existingTaskId: task.id, similarity: sim }
    }
  }

  return { decision: 'create' }
}
