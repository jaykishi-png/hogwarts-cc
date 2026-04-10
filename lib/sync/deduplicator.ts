import { supabase } from '@/lib/db/client'
import type { Task } from '@/types/task'

// Simple fuzzy similarity: normalize title and compare
function normalize(title: string): string {
  return title
    .toLowerCase()
    .replace(/[→\-–—]/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1

  // Check if one contains the other
  if (na.includes(nb) || nb.includes(na)) return 0.9

  // Word overlap score
  const wordsA = new Set(na.split(' ').filter(w => w.length > 3))
  const wordsB = new Set(nb.split(' ').filter(w => w.length > 3))
  if (wordsA.size === 0 || wordsB.size === 0) return 0

  let overlap = 0
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++
  }
  return overlap / Math.max(wordsA.size, wordsB.size)
}

const SIMILARITY_THRESHOLD = 0.8
// Sources ranked by reliability (higher = more trusted as primary)
const SOURCE_PRIORITY: Record<string, number> = {
  monday: 4, notion: 3, gmail: 2, slack: 1, calendar: 0, manual: 5,
}

export async function deduplicateTasks(): Promise<{ merged: number }> {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, source, priority_score, created_at, status')
    .in('status', ['open', 'in_progress'])
    .order('created_at', { ascending: true })

  if (error || !tasks?.length) return { merged: 0 }

  const toArchive: string[] = []
  const processed = new Set<string>()

  for (let i = 0; i < tasks.length; i++) {
    const a = tasks[i] as Task & { status: string }
    if (processed.has(a.id)) continue

    for (let j = i + 1; j < tasks.length; j++) {
      const b = tasks[j] as Task & { status: string }
      if (processed.has(b.id)) continue
      if (a.source === b.source) continue // Don't dedupe same source

      const score = similarity(a.title, b.title)
      if (score >= SIMILARITY_THRESHOLD) {
        // Keep the one from the higher-priority source
        const aPriority = SOURCE_PRIORITY[a.source] ?? 0
        const bPriority = SOURCE_PRIORITY[b.source] ?? 0
        const duplicate = aPriority >= bPriority ? b : a
        const keeper = aPriority >= bPriority ? a : b

        if (!toArchive.includes(duplicate.id)) {
          toArchive.push(duplicate.id)
          // Tag the keeper with the duplicate's source info
          await supabase.from('tasks').update({
            notes: `Also in ${duplicate.source}`,
            updated_at: new Date().toISOString(),
          }).eq('id', keeper.id).is('notes', null)
        }

        processed.add(duplicate.id)
      }
    }
  }

  if (toArchive.length > 0) {
    await supabase.from('tasks').update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    }).in('id', toArchive)
  }

  return { merged: toArchive.length }
}
