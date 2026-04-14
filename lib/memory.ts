// ─── Hogwarts AI Memory System ─────────────────────────────────────────────────
// Persistent agent memory backed by Notion. All operations gracefully degrade
// if NOTION_TOKEN is missing or the API is unavailable.

const NOTION_VERSION = '2022-06-28'
const DB_NAME        = 'Hogwarts AI Memory'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemoryType       = 'fact' | 'task_completed' | 'decision' | 'project' | 'preference' | 'context' | 'brand'
export type MemoryImportance = 'high' | 'medium' | 'low'

export interface MemoryEntry {
  id:         string
  type:       MemoryType
  agent:      string       // agent name e.g. 'RON', 'HERMIONE', or 'GLOBAL'
  content:    string       // max 500 chars
  importance: MemoryImportance
  tags:       string[]
  source:     string       // conversation ID | 'manual' | 'system'
  createdAt:  string       // ISO string
}

// ─── Module-level cache ───────────────────────────────────────────────────────

let cachedDbId: string | null = null

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string | null {
  const raw = process.env.NOTION_TOKEN ?? ''
  // Strip control characters (newlines, carriage returns, etc.)
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

// ─── DB initialisation ────────────────────────────────────────────────────────

/** Find or create the Notion memory database. Returns the DB ID or null. */
export async function initMemoryDB(): Promise<string | null> {
  if (cachedDbId) return cachedDbId

  const token = getToken()
  if (!token) return null

  try {
    // 1. Search for an existing DB
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

    // 2. Create the database in the workspace
    const createRes = await fetch('https://api.notion.com/v1/databases', {
      method:  'POST',
      headers: notionHeaders(token),
      body:    JSON.stringify({
        parent: { type: 'workspace', workspace: true },
        title:  [{ type: 'text', text: { content: DB_NAME } }],
        properties: {
          Title: { title: {} },
          Content: { rich_text: {} },
          Type: {
            select: {
              options: [
                { name: 'fact',           color: 'blue'   },
                { name: 'task_completed', color: 'green'  },
                { name: 'decision',       color: 'purple' },
                { name: 'project',        color: 'yellow' },
                { name: 'preference',     color: 'pink'   },
                { name: 'context',        color: 'gray'   },
                { name: 'brand',          color: 'orange' },
              ],
            },
          },
          Agent: {
            select: {
              options: [
                { name: 'GLOBAL' },
                { name: 'DUMBLEDORE' }, { name: 'HERMIONE' }, { name: 'HARRY' },
                { name: 'RON' }, { name: 'McGONAGALL' }, { name: 'SNAPE' },
                { name: 'HAGRID' }, { name: 'LUNA' }, { name: 'GINNY' },
                { name: 'NEVILLE' }, { name: 'DRACO' }, { name: 'SIRIUS' },
                { name: 'LUPIN' }, { name: 'FRED' }, { name: 'GEORGE' },
                { name: 'FLEUR' }, { name: 'MOODY' }, { name: 'TRELAWNEY' },
                { name: 'DOBBY' }, { name: 'ARTHUR' }, { name: 'TONKS' },
                { name: 'KINGSLEY' },
              ],
            },
          },
          Importance: {
            select: {
              options: [
                { name: 'high',   color: 'red'    },
                { name: 'medium', color: 'yellow' },
                { name: 'low',    color: 'gray'   },
              ],
            },
          },
          Tags:      { multi_select: {} },
          Source:    { rich_text: {} },
          CreatedAt: { date: {} },
        },
      }),
    })

    if (!createRes.ok) return null
    const createData = await createRes.json() as { id: string }
    cachedDbId = createData.id
    return cachedDbId
  } catch {
    return null
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** Add a memory entry to Notion. Returns the created entry or null on failure. */
export async function addMemory(
  entry: Omit<MemoryEntry, 'id' | 'createdAt'>,
): Promise<MemoryEntry | null> {
  const token = getToken()
  if (!token) return null

  const dbId = await initMemoryDB()
  if (!dbId) return null

  try {
    const content    = entry.content.slice(0, 500)
    const titleText  = content.slice(0, 100)
    const createdAt  = new Date().toISOString()

    const body = {
      parent: { database_id: dbId },
      properties: {
        Title:     { title:     [{ text: { content: titleText } }] },
        Content:   { rich_text: [{ text: { content } }] },
        Type:      { select:    { name: entry.type } },
        Agent:     { select:    { name: entry.agent } },
        Importance:{ select:    { name: entry.importance } },
        Tags:      { multi_select: entry.tags.map(t => ({ name: t })) },
        Source:    { rich_text: [{ text: { content: entry.source.slice(0, 200) } }] },
        CreatedAt: { date:      { start: createdAt } },
      },
    }

    const res = await fetch('https://api.notion.com/v1/pages', {
      method:  'POST',
      headers: notionHeaders(token),
      body:    JSON.stringify(body),
    })
    if (!res.ok) return null

    const page = await res.json() as { id: string }
    return { id: page.id, ...entry, content, createdAt }
  } catch {
    return null
  }
}

// ─── Query helpers ────────────────────────────────────────────────────────────

type NotionPage = {
  id: string
  properties: Record<string, unknown>
}

function extractText(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return ''
  const p = prop as Record<string, unknown>
  if (Array.isArray(p.title)) {
    return (p.title as Array<{ plain_text?: string }>).map(t => t.plain_text ?? '').join('')
  }
  if (Array.isArray(p.rich_text)) {
    return (p.rich_text as Array<{ plain_text?: string }>).map(t => t.plain_text ?? '').join('')
  }
  return ''
}

function extractSelect(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return ''
  const p = prop as Record<string, unknown>
  const sel = p.select as { name?: string } | null
  return sel?.name ?? ''
}

function extractMultiSelect(prop: unknown): string[] {
  if (!prop || typeof prop !== 'object') return []
  const p = prop as Record<string, unknown>
  const ms = p.multi_select
  if (!Array.isArray(ms)) return []
  return (ms as Array<{ name?: string }>).map(t => t.name ?? '').filter(Boolean)
}

function extractDate(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return new Date().toISOString()
  const p = prop as Record<string, unknown>
  const d = p.date as { start?: string } | null
  return d?.start ?? new Date().toISOString()
}

function pageToEntry(page: NotionPage): MemoryEntry | null {
  try {
    const props = page.properties
    return {
      id:         page.id,
      type:       (extractSelect(props['Type'])       || 'fact')   as MemoryType,
      agent:      extractSelect(props['Agent'])       || 'GLOBAL',
      content:    extractText(props['Content'])       || extractText(props['Title']),
      importance: (extractSelect(props['Importance']) || 'medium') as MemoryImportance,
      tags:       extractMultiSelect(props['Tags']),
      source:     extractText(props['Source'])        || 'manual',
      createdAt:  extractDate(props['CreatedAt']),
    }
  } catch {
    return null
  }
}

async function queryDatabase(filter: Record<string, unknown>): Promise<NotionPage[]> {
  const token = getToken()
  if (!token) return []

  const dbId = await initMemoryDB()
  if (!dbId) return []

  const pages: NotionPage[] = []
  let cursor: string | undefined

  try {
    do {
      const body: Record<string, unknown> = { filter, page_size: 100 }
      if (cursor) body.start_cursor = cursor

      const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method:  'POST',
        headers: notionHeaders(token),
        body:    JSON.stringify(body),
      })
      if (!res.ok) break

      const data = await res.json() as {
        results: NotionPage[]
        has_more: boolean
        next_cursor: string | null
      }
      pages.push(...data.results)
      cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined
    } while (cursor)
  } catch {
    // silently degrade
  }

  return pages
}

// ─── Public API ───────────────────────────────────────────────────────────────

const IMPORTANCE_RANK: Record<MemoryImportance, number> = { high: 0, medium: 1, low: 2 }

/**
 * Fetch memories relevant to a query.
 * Filters by agent (+ GLOBAL), then ranks by keyword relevance,
 * then by importance (high first) and date (newest first). Returns top 20.
 */
export async function getRelevantMemories(
  query:     string,
  agentName?: string,
): Promise<MemoryEntry[]> {
  try {
    const filter: Record<string, unknown> = agentName
      ? {
          or: [
            { property: 'Agent', select: { equals: agentName } },
            { property: 'Agent', select: { equals: 'GLOBAL'  } },
          ],
        }
      : { property: 'Agent', select: { is_not_empty: true } }

    const pages   = await queryDatabase(filter)
    const entries = pages.map(pageToEntry).filter((e): e is MemoryEntry => e !== null)

    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)

    // Score by keyword hits
    const scored = entries.map(e => {
      const haystack = `${e.content} ${e.tags.join(' ')}`.toLowerCase()
      const hits     = queryWords.filter(w => haystack.includes(w)).length
      return { entry: e, hits }
    })

    // Sort: keyword hits desc → importance rank asc → date desc
    scored.sort((a, b) => {
      if (b.hits !== a.hits) return b.hits - a.hits
      const imp = IMPORTANCE_RANK[a.entry.importance] - IMPORTANCE_RANK[b.entry.importance]
      if (imp !== 0) return imp
      return new Date(b.entry.createdAt).getTime() - new Date(a.entry.createdAt).getTime()
    })

    return scored.slice(0, 20).map(s => s.entry)
  } catch {
    return []
  }
}

/** Fetch ALL memories (for the UI panel). */
export async function getAllMemories(): Promise<MemoryEntry[]> {
  try {
    const pages   = await queryDatabase({ property: 'Agent', select: { is_not_empty: true } })
    const entries = pages.map(pageToEntry).filter((e): e is MemoryEntry => e !== null)

    entries.sort((a, b) => {
      const imp = IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance]
      if (imp !== 0) return imp
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return entries
  } catch {
    return []
  }
}

/** Delete a memory by its Notion page ID. */
export async function deleteMemory(id: string): Promise<void> {
  const token = getToken()
  if (!token) return

  try {
    await fetch(`https://api.notion.com/v1/pages/${id}`, {
      method:  'PATCH',
      headers: notionHeaders(token),
      body:    JSON.stringify({ archived: true }),
    })
  } catch {
    // silently degrade
  }
}

/**
 * Format a list of memories as a concise block for injecting into a system prompt.
 * Ordered high → low importance with type labels.
 */
export function formatMemoriesForPrompt(memories: MemoryEntry[]): string {
  if (memories.length === 0) return ''

  const lines = memories.map(m => {
    const tags = m.tags.length ? ` [${m.tags.join(', ')}]` : ''
    return `[${m.type.toUpperCase()} | ${m.importance.toUpperCase()}]${tags} ${m.content}`
  })

  return `## Relevant Memory (${memories.length} entries)\n${lines.join('\n')}`
}
