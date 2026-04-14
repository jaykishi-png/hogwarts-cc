import { NextRequest, NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentStat {
  agent:        string
  totalUses:    number
  lastUsed:     string   // ISO date string
  avgResponseMs: number
}

interface UsagePostBody {
  agent:      string
  responseMs: number
}

// ─── Notion helpers (mirroring memory.ts pattern) ─────────────────────────────

const NOTION_VERSION = '2022-06-28'
const DB_NAME        = 'Agent Usage Stats'

let cachedDbId: string | null = null

function getToken(): string | null {
  const raw   = process.env.NOTION_TOKEN ?? ''
  const token = Array.from(raw).filter(c => c.charCodeAt(0) >= 32).join('')
  return token || null
}

function notionHeaders(token: string): Record<string, string> {
  return {
    'Authorization':  `Bearer ${token}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// ─── DB init: find or create ──────────────────────────────────────────────────

async function initUsageDB(token: string): Promise<string | null> {
  if (cachedDbId) return cachedDbId

  try {
    // Search for existing DB
    const searchRes = await fetch('https://api.notion.com/v1/search', {
      method:  'POST',
      headers: notionHeaders(token),
      body:    JSON.stringify({
        query:  DB_NAME,
        filter: { value: 'database', property: 'object' },
      }),
    })
    if (!searchRes.ok) return null

    const searchData = await searchRes.json() as {
      results: Array<{ id: string; title?: Array<{ plain_text?: string }> }>
    }

    const existing = searchData.results.find(db =>
      db.title?.some(t => t.plain_text === DB_NAME)
    )
    if (existing) {
      cachedDbId = existing.id
      return cachedDbId
    }

    // Create the database
    const createRes = await fetch('https://api.notion.com/v1/databases', {
      method:  'POST',
      headers: notionHeaders(token),
      body:    JSON.stringify({
        parent:     { type: 'workspace', workspace: true },
        title:      [{ type: 'text', text: { content: DB_NAME } }],
        properties: {
          AgentName:     { title: {} },
          TotalUses:     { number: {} },
          LastUsed:      { date: {} },
          AvgResponseMs: { number: {} },
        },
      }),
    })
    if (!createRes.ok) return null

    const created = await createRes.json() as { id: string }
    cachedDbId = created.id
    return cachedDbId
  } catch {
    return null
  }
}

// ─── Notion page → stat ────────────────────────────────────────────────────────

interface NotionPage {
  id: string
  properties: Record<string, unknown>
}

function extractTitle(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return ''
  const p = prop as Record<string, unknown>
  if (Array.isArray(p['title'])) {
    return (p['title'] as Array<{ plain_text?: string }>).map(t => t.plain_text ?? '').join('')
  }
  return ''
}

function extractNumber(prop: unknown): number {
  if (!prop || typeof prop !== 'object') return 0
  const p = prop as Record<string, unknown>
  return typeof p['number'] === 'number' ? p['number'] : 0
}

function extractDate(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return new Date().toISOString()
  const p = prop as Record<string, unknown>
  const d = p['date'] as { start?: string } | null
  return d?.start ?? new Date().toISOString()
}

function pageToStat(page: NotionPage): AgentStat {
  return {
    agent:         extractTitle(page.properties['AgentName']),
    totalUses:     extractNumber(page.properties['TotalUses']),
    lastUsed:      extractDate(page.properties['LastUsed']),
    avgResponseMs: extractNumber(page.properties['AvgResponseMs']),
  }
}

// ─── Query all pages ──────────────────────────────────────────────────────────

async function queryAllStats(token: string, dbId: string): Promise<NotionPage[]> {
  const pages: NotionPage[] = []
  let cursor: string | undefined

  try {
    do {
      const body: Record<string, unknown> = { page_size: 100 }
      if (cursor) body['start_cursor'] = cursor

      const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method:  'POST',
        headers: notionHeaders(token),
        body:    JSON.stringify(body),
      })
      if (!res.ok) break

      const data = await res.json() as {
        results:     NotionPage[]
        has_more:    boolean
        next_cursor: string | null
      }
      pages.push(...data.results)
      cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined
    } while (cursor)
  } catch {
    // graceful degradation
  }

  return pages
}

// ─── Upsert stat ──────────────────────────────────────────────────────────────

async function upsertAgentStat(
  token:  string,
  dbId:   string,
  agent:  string,
  responseMs: number
): Promise<void> {
  const pages   = await queryAllStats(token, dbId)
  const existing = pages.find(p => extractTitle(p.properties['AgentName']) === agent)

  const now = new Date().toISOString()

  if (existing) {
    const current  = pageToStat(existing)
    const newTotal = current.totalUses + 1
    const newAvg   = Math.round(
      (current.avgResponseMs * current.totalUses + responseMs) / newTotal
    )

    await fetch(`https://api.notion.com/v1/pages/${existing.id}`, {
      method:  'PATCH',
      headers: notionHeaders(token),
      body:    JSON.stringify({
        properties: {
          TotalUses:     { number: newTotal },
          LastUsed:      { date: { start: now } },
          AvgResponseMs: { number: newAvg },
        },
      }),
    })
  } else {
    await fetch('https://api.notion.com/v1/pages', {
      method:  'POST',
      headers: notionHeaders(token),
      body:    JSON.stringify({
        parent:     { database_id: dbId },
        properties: {
          AgentName:     { title:  [{ text: { content: agent } }] },
          TotalUses:     { number: 1 },
          LastUsed:      { date:   { start: now } },
          AvgResponseMs: { number: Math.round(responseMs) },
        },
      }),
    })
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const token = getToken()

  if (!token) {
    return NextResponse.json(
      { stats: [], topAgent: '', totalConversations: 0 },
      { status: 200 }
    )
  }

  try {
    const dbId = await initUsageDB(token)
    if (!dbId) {
      return NextResponse.json({ stats: [], topAgent: '', totalConversations: 0 })
    }

    const pages = await queryAllStats(token, dbId)
    const stats = pages.map(pageToStat).filter(s => s.agent.length > 0)

    stats.sort((a, b) => b.totalUses - a.totalUses)

    const topAgent          = stats[0]?.agent ?? ''
    const totalConversations = stats.reduce((sum, s) => sum + s.totalUses, 0)

    return NextResponse.json({ stats, topAgent, totalConversations })
  } catch (err: unknown) {
    console.error('[agent-usage GET] error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const token = getToken()
  if (!token) {
    return NextResponse.json({ error: 'NOTION_TOKEN not configured' }, { status: 503 })
  }

  try {
    const body = await req.json() as UsagePostBody

    if (!body.agent || typeof body.responseMs !== 'number') {
      return NextResponse.json(
        { error: 'agent and responseMs are required' },
        { status: 400 }
      )
    }

    const dbId = await initUsageDB(token)
    if (!dbId) {
      return NextResponse.json({ error: 'Could not init usage database' }, { status: 500 })
    }

    await upsertAgentStat(token, dbId, body.agent.toUpperCase(), body.responseMs)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[agent-usage POST] error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
