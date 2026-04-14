import { NextRequest, NextResponse } from 'next/server'
import {
  getRelevantMemories,
  getAllMemories,
  addMemory,
  deleteMemory,
} from '@/lib/memory'
import type { MemoryType, MemoryImportance } from '@/lib/memory'

// ─── GET /api/memory ──────────────────────────────────────────────────────────
// ?all=true              → returns all memories
// ?agent=RON&query=...   → returns relevant memories for agent+query

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = req.nextUrl

    if (searchParams.get('all') === 'true') {
      const memories = await getAllMemories()
      return NextResponse.json({ memories })
    }

    const agent = searchParams.get('agent') ?? undefined
    const query = searchParams.get('query') ?? ''
    const memories = await getRelevantMemories(query, agent)
    return NextResponse.json({ memories })
  } catch (err) {
    console.error('[memory GET]', err)
    return NextResponse.json({ memories: [] })
  }
}

// ─── POST /api/memory ─────────────────────────────────────────────────────────
// Body: { type, agent, content, importance, tags, source }

interface PostBody {
  type:       MemoryType
  agent:      string
  content:    string
  importance: MemoryImportance
  tags:       string[]
  source:     string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as Partial<PostBody>

    const { type, agent, content, importance, tags, source } = body

    if (!type || !agent || !content || !importance) {
      return NextResponse.json(
        { error: 'Missing required fields: type, agent, content, importance' },
        { status: 400 },
      )
    }

    const entry = await addMemory({
      type,
      agent,
      content,
      importance,
      tags:   Array.isArray(tags) ? tags : [],
      source: source ?? 'manual',
    })

    if (!entry) {
      return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 })
    }

    return NextResponse.json({ entry }, { status: 201 })
  } catch (err) {
    console.error('[memory POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/memory?id=xxx ────────────────────────────────────────────────

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
    }

    await deleteMemory(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[memory DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
