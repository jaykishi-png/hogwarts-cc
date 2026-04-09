import type { ExtractionResult } from '@/types/source'

// Patterns that strongly suggest an action item is being requested
const HIGH_CONFIDENCE_PATTERNS = [
  /\bcan you\b/i,
  /\bcould you\b/i,
  /\bwould you\b/i,
  /\bplease\b.{0,50}(send|review|update|check|confirm|complete|finish|fix|help)/i,
  /\bneed you to\b/i,
  /\bwaiting (on|for) you\b/i,
  /\byour (input|feedback|review|approval|thoughts)\b/i,
  /\baction (required|needed|item)\b/i,
  /\bfollow.?up\b/i,
  /\bby (eod|end of day|tomorrow|monday|friday|[0-9]+[ap]m)\b/i,
  /\bdeadline\b/i,
  /\basap\b/i,
  /\burgent\b/i,
]

const MEDIUM_CONFIDENCE_PATTERNS = [
  /\?$/, // ends with a question
  /\blet me know\b/i,
  /\bping me\b/i,
  /\bthoughts\?/i,
  /\bavailable\b/i,
  /\bwhen can you\b/i,
  /\bhave you\b/i,
  /\bdid you\b/i,
  /\bany updates?\b/i,
  /\bstatus\?/i,
]

// Patterns that suggest the message is NOT an action item
const EXCLUSION_PATTERNS = [
  /\bFYI\b/i,
  /\bfor your (reference|info|information)\b/i,
  /\bjust (wanted|letting) you (know|aware)\b/i,
  /\bno action (needed|required)\b/i,
  /\bthanks for\b/i,
  /\bthank you for\b/i,
]

export function detectActionItem(
  subject: string,
  body: string
): ExtractionResult {
  const fullText = `${subject} ${body}`

  // Check exclusions first
  if (EXCLUSION_PATTERNS.some(p => p.test(fullText))) {
    return { isAction: false, task: '', confidence: 0.1, method: 'rule' }
  }

  let score = 0
  const matchedPatterns: string[] = []

  for (const pattern of HIGH_CONFIDENCE_PATTERNS) {
    if (pattern.test(fullText)) {
      score += 0.25
      matchedPatterns.push(pattern.source.slice(0, 30))
    }
  }

  for (const pattern of MEDIUM_CONFIDENCE_PATTERNS) {
    if (pattern.test(fullText)) {
      score += 0.12
      matchedPatterns.push(pattern.source.slice(0, 30))
    }
  }

  const confidence = Math.min(score, 0.95)
  const isAction = confidence >= 0.25

  // Extract a clean task title from the subject + first meaningful line
  const task = extractTaskTitle(subject, body)

  return {
    isAction,
    task,
    confidence,
    context: matchedPatterns.slice(0, 3).join(', '),
    method: 'rule',
  }
}

function extractTaskTitle(subject: string, body: string): string {
  // Use the email subject as the primary task title, cleaned up
  const cleanSubject = subject
    .replace(/^(re:|fwd?:|fw:)\s*/gi, '')
    .replace(/\[.*?\]/g, '')
    .trim()

  if (cleanSubject.length > 10) return cleanSubject

  // Fall back to first non-empty line of body
  const firstLine = body
    .split('\n')
    .map(l => l.trim())
    .find(l => l.length > 10)

  return firstLine?.slice(0, 120) ?? cleanSubject
}

export function detectSlackActionItem(text: string, isMention: boolean): ExtractionResult {
  const baseScore = isMention ? 0.3 : 0

  if (EXCLUSION_PATTERNS.some(p => p.test(text))) {
    return { isAction: false, task: '', confidence: 0.1, method: 'rule' }
  }

  let score = baseScore

  for (const pattern of HIGH_CONFIDENCE_PATTERNS) {
    if (pattern.test(text)) score += 0.25
  }

  for (const pattern of MEDIUM_CONFIDENCE_PATTERNS) {
    if (pattern.test(text)) score += 0.12
  }

  const confidence = Math.min(score, 0.95)

  // Extract task from first sentence/phrase
  const task = text
    .replace(/<@[A-Z0-9]+>/g, '') // remove @mentions
    .replace(/:[a-z_]+:/g, '')     // remove emoji codes
    .trim()
    .slice(0, 150)

  return {
    isAction: confidence >= 0.25,
    task,
    confidence,
    method: 'rule',
  }
}
