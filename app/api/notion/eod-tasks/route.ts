import { NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

const EOD_DATABASE_ID = process.env.NOTION_EOD_DATABASE_ID ?? '2e02b24a3e3c8024bd16c13d63620b5f'

function getNotion() {
  const token = process.env.NOTION_TOKEN
  if (!token) throw new Error('NOTION_TOKEN not set')
  return new Client({ auth: token })
}

export interface EodTask {
  text: string
  checked: boolean
  section: 'completed' | 'in-progress' | 'blockers'
}

export interface EodDay {
  pageId: string
  pageUrl: string
  title: string
  date: string
  tasks: EodTask[]
}

// Extract Jay's tasks from a page's blocks
async function extractJayTasks(notion: Client, pageId: string): Promise<EodTask[]> {
  const response = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 100,
  })

  const tasks: EodTask[] = []
  let inJaySection = false
  let currentSection: EodTask['section'] = 'completed'

  for (const block of response.results) {
    if (!('type' in block)) continue
    const b = block as {
      type: string
      heading_1?: { rich_text: Array<{ plain_text: string }> }
      heading_2?: { rich_text: Array<{ plain_text: string }> }
      heading_3?: { rich_text: Array<{ plain_text: string }> }
      to_do?: { rich_text: Array<{ plain_text: string }>; checked: boolean }
      bulleted_list_item?: { rich_text: Array<{ plain_text: string }> }
      paragraph?: { rich_text: Array<{ plain_text: string }> }
    }

    // Detect Jay's section via heading_1 or heading_3
    if (b.type === 'heading_1' || b.type === 'heading_3') {
      const text = (b.heading_1 ?? b.heading_3)?.rich_text.map(r => r.plain_text).join('') ?? ''
      if (text.toLowerCase().includes('jay')) {
        inJaySection = true
        currentSection = 'completed'
        continue
      } else if (inJaySection) {
        // Hit another person's section — stop
        break
      }
    }

    if (!inJaySection) continue

    // Detect subsections
    if (b.type === 'heading_2') {
      const text = b.heading_2?.rich_text.map(r => r.plain_text).join('').toLowerCase() ?? ''
      if (text.includes('complet')) currentSection = 'completed'
      else if (text.includes('progress') || text.includes('working')) currentSection = 'in-progress'
      else if (text.includes('block')) currentSection = 'blockers'
      continue
    }

    // Extract to_do blocks
    if (b.type === 'to_do' && b.to_do) {
      const text = b.to_do.rich_text.map(r => r.plain_text).join('').trim()
      if (text) tasks.push({ text, checked: b.to_do.checked, section: currentSection })
    }

    // Extract bullet items
    if (b.type === 'bulleted_list_item' && b.bulleted_list_item) {
      const text = b.bulleted_list_item.rich_text.map(r => r.plain_text).join('').trim()
      if (text) tasks.push({ text, checked: false, section: currentSection })
    }
  }

  return tasks
}

// GET /api/notion/eod-tasks — returns Jay's tasks from the most recent EOD page
export async function GET() {
  try {
    const notion = getNotion()

    // Get the most recent EOD page
    const response = await notion.databases.query({
      database_id: EOD_DATABASE_ID,
      sorts: [{ property: 'Date', direction: 'descending' }],
      page_size: 1,
    })

    if (!response.results.length) {
      return NextResponse.json({ tasks: [], date: null, pageUrl: null })
    }

    const page = response.results[0] as {
      id: string
      url: string
      properties: Record<string, {
        type: string
        title?: Array<{ plain_text: string }>
        date?: { start: string }
        status?: { name: string }
      }>
    }

    // Filter out pages with "Sent" status
    const status = page.properties?.Status?.status?.name?.toLowerCase() ?? ''
    if (status === 'sent') {
      return NextResponse.json({ tasks: [], date: null, pageUrl: null, filtered: true })
    }

    const title = page.properties?.Name?.title?.map(t => t.plain_text).join('') ?? 'EOD Report'
    const date = page.properties?.Date?.date?.start ?? new Date().toISOString().split('T')[0]

    const tasks = await extractJayTasks(notion, page.id)

    return NextResponse.json({
      pageId: page.id,
      pageUrl: page.url,
      title,
      date,
      tasks,
    } satisfies EodDay)

  } catch (err) {
    console.error('[EOD Tasks] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
