import type { Task } from '@/types/task'
import type { CalendarEvent } from '@/types/source'
import { parseISO, isToday, isPast, addHours, differenceInHours } from 'date-fns'

interface ScoringConfig {
  meetingPrepWindowHours?: number
}

const URGENCY_KEYWORDS = [
  'eod', 'end of day', 'asap', 'urgent', 'today', 'by 5', 'by 3',
  'immediately', 'right away', 'deadline', 'critical', 'blocker'
]

function urgencyScore(task: Task): number {
  const text = `${task.title} ${task.description ?? ''}`.toLowerCase()
  if (URGENCY_KEYWORDS.some(kw => text.includes(kw))) return 90
  if (task.source === 'gmail' && task.gmail_thread_id) return 60
  if (task.source === 'slack' && task.slack_thread_ts) return 55
  return 20
}

function dueDateScore(task: Task): number {
  if (!task.due_date) return 10

  const due = parseISO(task.due_date)
  const now = new Date()

  if (isPast(due)) return 100
  if (isToday(due)) return 90

  const hoursUntilDue = differenceInHours(due, now)
  if (hoursUntilDue <= 48) return 70
  if (hoursUntilDue <= 72) return 50
  if (hoursUntilDue <= 168) return 25 // within a week
  return 10
}

function sourceWeight(task: Task): number {
  switch (task.source) {
    case 'manual':   return 1.0
    case 'gmail':    return 0.85
    case 'slack':    return 0.80
    case 'monday':   return 0.75
    case 'calendar': return 0.65
    case 'notion':   return 0.60
    default:         return 0.5
  }
}

function recencyScore(task: Task): number {
  const created = parseISO(task.created_at)
  const hoursOld = differenceInHours(new Date(), created)

  if (hoursOld <= 2) return 100
  if (hoursOld <= 8) return 70
  if (hoursOld <= 24) return 40
  if (hoursOld <= 72) return 20
  return 5
}

function meetingProximityBoost(
  task: Task,
  events: CalendarEvent[],
  windowHours: number
): number {
  if (!events.length) return 0

  const now = new Date()
  const upcomingEvents = events.filter(e => {
    const start = parseISO(e.start)
    const hoursUntil = differenceInHours(start, now)
    return hoursUntil >= 0 && hoursUntil <= windowHours
  })

  if (!upcomingEvents.length) return 0

  const taskWords = task.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)

  for (const event of upcomingEvents) {
    const eventText = `${event.title} ${event.description ?? ''}`.toLowerCase()
    const hasOverlap = taskWords.some(word => eventText.includes(word))

    if (hasOverlap) {
      const hoursUntil = differenceInHours(parseISO(event.start), now)
      if (hoursUntil <= 1) return 20
      if (hoursUntil <= 3) return 10
      return 5
    }
  }

  return 0
}

function manualPriorityMultiplier(task: Task): number {
  switch (task.manual_priority) {
    case 'P1': return 1.4
    case 'P2': return 1.2
    case 'P3': return 0.8
    case 'not_today': return 0
    default: return 1.0
  }
}

export function scoreTask(
  task: Task,
  calendarEvents: CalendarEvent[] = [],
  config: ScoringConfig = {}
): number {
  // Pinned tasks always score max
  if (task.manual_priority === 'pinned') return 150

  const windowHours = config.meetingPrepWindowHours ?? 3

  const raw =
    urgencyScore(task) * 0.35 +
    dueDateScore(task) * 0.25 +
    sourceWeight(task) * 100 * 0.15 +
    recencyScore(task) * 0.10 +
    meetingProximityBoost(task, calendarEvents, windowHours) * 0.10

  const multiplier = manualPriorityMultiplier(task)
  return Math.round(raw * multiplier * 100) / 100
}

export function scoreAllTasks(
  tasks: Task[],
  calendarEvents: CalendarEvent[] = [],
  config: ScoringConfig = {}
): Array<{ id: string; priority_score: number }> {
  return tasks
    .filter(t => t.status !== 'done' && t.status !== 'archived')
    .map(t => ({
      id: t.id,
      priority_score: scoreTask(t, calendarEvents, config),
    }))
}
