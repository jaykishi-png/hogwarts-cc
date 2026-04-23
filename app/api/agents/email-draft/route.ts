import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export const maxDuration = 30

// Claude Haiku — high-quality writing at lower cost than GPT-4o
function getClient() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey) return { provider: 'anthropic' as const, key: anthropicKey }
  const oaKey = process.env.OPENAI_API_KEY
  if (oaKey) return { provider: 'openai' as const, key: oaKey }
  throw new Error('ANTHROPIC_API_KEY or OPENAI_API_KEY required')
}

const SYSTEM = `You are an elite executive communications assistant.

Your job is to turn messy context into clear, polished, professional email drafts.

Guidelines:
- Write like a sharp human operator, not a generic AI.
- Be concise, organized, and persuasive.
- Match the requested tone and intent.
- Preserve important specifics from the user's context.
- If details are missing, make reasonable wording choices without inventing facts.
- Avoid filler, hype, cliches, and robotic phrasing.

Return ONLY valid JSON in this exact shape (no markdown fences, no preamble):
{
  "subject": "string",
  "greeting": "string",
  "body": "string",
  "closing": "string",
  "signature": "string",
  "fullEmail": "string",
  "notes": ["string", "string"]
}

Rules for fields:
- "body" should contain the email paragraphs only, without the greeting or sign-off.
- "fullEmail" should include greeting, body, closing, and signature in final ready-to-send form.
- "notes" should be 2 to 4 short editorial notes explaining strategic choices in the draft.`

export async function POST(req: NextRequest) {
  try {
    const {
      intent,
      tone,
      length,
      recipient,
      goal,
      context,
      keyPoints,
      cta,
      signature,
    } = await req.json() as {
      intent: 'new-email' | 'reply' | 'follow-up'
      tone: 'professional' | 'warm' | 'confident' | 'friendly-firm'
      length: 'short' | 'medium' | 'detailed'
      recipient?: string
      goal: string
      context: string
      keyPoints?: string
      cta?: string
      signature?: string
    }

    if (!goal?.trim() || !context?.trim()) {
      return NextResponse.json({ error: 'goal and context are required' }, { status: 400 })
    }

    const { provider, key } = getClient()
    const userMsg = [
      `Intent: ${intent}`,
      `Tone: ${tone}`,
      `Length: ${length}`,
      recipient ? `Recipient or audience: ${recipient}` : '',
      `Goal: ${goal}`,
      `Context: ${context}`,
      keyPoints ? `Must-cover points: ${keyPoints}` : '',
      cta ? `Desired call to action: ${cta}` : '',
      signature ? `Signature to use: ${signature}` : '',
    ].filter(Boolean).join('\n')

    let rawJson = '{}'

    if (provider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey: key })
      const msg = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1400,
        system: SYSTEM,
        messages: [{ role: 'user', content: userMsg }],
      })
      rawJson = msg.content[0]?.type === 'text' ? msg.content[0].text : '{}'
    } else {
      const openai = new OpenAI({ apiKey: key })
      const res = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.65,
        max_tokens: 1400,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userMsg },
        ],
      })
      rawJson = res.choices[0]?.message?.content ?? '{}'
    }

    let draft: unknown
    try {
      const cleaned = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      draft = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse email draft', raw: rawJson }, { status: 500 })
    }

    return NextResponse.json({ draft })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
