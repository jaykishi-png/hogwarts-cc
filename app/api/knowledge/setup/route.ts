import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const maxDuration = 30

export async function GET() {
  try {
    let assistantId = process.env.OPENAI_ASSISTANT_ID ?? ''
    let vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID ?? ''

    // ── Create vector store if not configured ──────────────────────────────
    if (!vectorStoreId) {
      const vs = await openai.vectorStores.create({
        name: 'Revenue Rush Knowledge Base',
      })
      vectorStoreId = vs.id
    } else {
      // Verify it still exists
      try {
        await openai.vectorStores.retrieve(vectorStoreId)
      } catch {
        const vs = await openai.vectorStores.create({
          name: 'Revenue Rush Knowledge Base',
        })
        vectorStoreId = vs.id
      }
    }

    // ── Create assistant if not configured ─────────────────────────────────
    if (!assistantId) {
      const assistant = await openai.beta.assistants.create({
        name: 'Revenue Rush KB',
        instructions: `You are an expert knowledge base assistant for Revenue Rush. You have access to all Revenue Rush documents including strategies, campaigns, SOPs, briefs, data reports, and internal reference material.

When answering:
- Be precise and cite specific documents when possible
- Use structured responses with headers for complex questions
- If the answer is not in the documents, say "I don't have that in the knowledge base" clearly
- Keep answers concise but complete
- For numerical data, quote exactly from the source`,
        model: 'gpt-4o',
        tools: [{ type: 'file_search' }],
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStoreId],
          },
        },
      })
      assistantId = assistant.id
    } else {
      // Verify assistant exists and is linked to vector store
      try {
        const assistant = await openai.beta.assistants.retrieve(assistantId)
        const existingVsIds = assistant.tool_resources?.file_search?.vector_store_ids ?? []
        if (!existingVsIds.includes(vectorStoreId)) {
          await openai.beta.assistants.update(assistantId, {
            tool_resources: {
              file_search: { vector_store_ids: [vectorStoreId] },
            },
          })
        }
      } catch {
        // Assistant doesn't exist — create fresh
        const assistant = await openai.beta.assistants.create({
          name: 'Revenue Rush KB',
          instructions: `You are an expert knowledge base assistant for Revenue Rush. Answer questions using the uploaded documents, cite sources, and be precise.`,
          model: 'gpt-4o',
          tools: [{ type: 'file_search' }],
          tool_resources: {
            file_search: { vector_store_ids: [vectorStoreId] },
          },
        })
        assistantId = assistant.id
      }
    }

    // ── Get vector store stats ─────────────────────────────────────────────
    const vsFiles = await openai.vectorStores.files.list(vectorStoreId)
    const fileCount = vsFiles.data.length

    return NextResponse.json({
      assistantId,
      vectorStoreId,
      fileCount,
      configured: !!(process.env.OPENAI_ASSISTANT_ID && process.env.OPENAI_VECTOR_STORE_ID),
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
