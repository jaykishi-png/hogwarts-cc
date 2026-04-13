import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { question, threadId } = await req.json() as { question: string; threadId?: string }

    const assistantId = process.env.OPENAI_ASSISTANT_ID
    if (!assistantId) {
      return NextResponse.json(
        { error: 'Knowledge base not initialised. Open the Knowledge panel and click "Initialise".' },
        { status: 400 }
      )
    }

    if (!question?.trim()) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400 })
    }

    // ── Reuse or create thread ─────────────────────────────────────────────
    let thread
    if (threadId) {
      try {
        thread = await openai.beta.threads.retrieve(threadId)
      } catch {
        thread = await openai.beta.threads.create()
      }
    } else {
      thread = await openai.beta.threads.create()
    }

    // ── Add user message ───────────────────────────────────────────────────
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: question,
    })

    // ── Run assistant and wait for completion ──────────────────────────────
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistantId,
    })

    if (run.status !== 'completed') {
      return NextResponse.json(
        { error: `Assistant run ended with status: ${run.status}` },
        { status: 500 }
      )
    }

    // ── Retrieve latest assistant message ──────────────────────────────────
    const messages = await openai.beta.threads.messages.list(thread.id, {
      order: 'desc',
      limit: 1,
    })

    const msg = messages.data[0]
    if (!msg) return NextResponse.json({ error: 'No response from assistant' }, { status: 500 })

    let answer = ''
    const citations: { index: number; fileName: string; quote?: string }[] = []

    for (const block of msg.content) {
      if (block.type !== 'text') continue

      let text = block.text.value

      // ── Parse annotations → inline citation markers ────────────────────
      for (const annotation of block.text.annotations) {
        if (annotation.type === 'file_citation') {
          const idx = citations.length + 1
          text = text.replace(annotation.text, ` [${idx}]`)

          let fileName = 'Source document'
          try {
            const info = await openai.files.retrieve(annotation.file_citation.file_id)
            fileName = info.filename
          } catch { /* file name unavailable */ }

          citations.push({
            index: idx,
            fileName,
            quote: (annotation.file_citation as unknown as { quote?: string }).quote,
          })
        } else if (annotation.type === 'file_path') {
          // Strip sandbox path annotations
          text = text.replace(annotation.text, '')
        }
      }

      answer += text
    }

    return NextResponse.json({
      answer,
      citations,
      threadId: thread.id,
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
