import Anthropic from '@anthropic-ai/sdk'
import type { ExtractionResult } from '@/types/source'

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

const EXTRACTION_PROMPT = `You are analyzing a message to determine if it contains an action item directed at the recipient.

Reply with ONLY valid JSON in this exact format:
{
  "is_action": true/false,
  "task": "brief task description (max 120 chars)",
  "confidence": 0.0-1.0,
  "reasoning": "one sentence"
}

Rules:
- is_action: true if the message asks the recipient to DO something
- task: concise imperative phrasing of what needs to be done
- confidence: how certain you are (0=not at all, 1=certain)
- FYI messages, announcements, and informational updates are NOT action items
- Direct questions expecting a response ARE action items (confidence 0.6-0.8)
- Explicit requests with deadlines are high confidence (0.85+)

Message to analyze:`

export async function extractActionItemWithClaude(
  text: string,
  source: 'gmail' | 'slack'
): Promise<ExtractionResult> {
  try {
    const anthropic = getClient()

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `${EXTRACTION_PROMPT}\n\n[Source: ${source}]\n${text.slice(0, 800)}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    // Extract JSON from response (handles markdown code blocks)
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0]) as {
      is_action: boolean
      task: string
      confidence: number
      reasoning?: string
    }

    return {
      isAction: parsed.is_action,
      task: parsed.task ?? '',
      confidence: parsed.confidence ?? 0.5,
      context: parsed.reasoning,
      method: 'claude',
    }
  } catch (err) {
    console.error('Claude extraction failed:', err)
    // Return a safe default on failure
    return {
      isAction: false,
      task: '',
      confidence: 0,
      context: 'extraction failed',
      method: 'claude',
    }
  }
}

export async function extractIfNeeded(
  text: string,
  ruleResult: ExtractionResult,
  source: 'gmail' | 'slack',
  threshold = 0.65
): Promise<ExtractionResult> {
  // If rule-based confidence is high enough, use it directly
  if (ruleResult.confidence >= threshold) return ruleResult

  // If rules say it's definitely not an action item (very low score), skip Claude
  if (ruleResult.confidence < 0.15) return ruleResult

  // Use Claude for ambiguous middle ground
  const claudeResult = await extractActionItemWithClaude(text, source)

  // Take the higher of the two confidence scores
  if (claudeResult.confidence > ruleResult.confidence) {
    return claudeResult
  }
  return ruleResult
}
