import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import { supabase } from '@/lib/db/client'

const EOD_DATABASE_ID = '2e02b24a3e3c8024bd16c13d63620b5f'

function getNotion() {
  if (!process.env.NOTION_TOKEN) throw new Error('NOTION_TOKEN not set')
  return new Client({ auth: process.env.NOTION_TOKEN })
}

async function findOrCreateTodayPage(notion: Client): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  // Search for today's page
  const response = await notion.databases.query({
    database_id: EOD_DATABASE_ID,
    filter: {
      property: 'Date',
      date: { equals: today },
    },
  })

  if (response.results.length > 0) {
    return response.results[0].id
  }

  // Create today's page
  const page = await notion.pages.create({
    parent: { database_id: EOD_DATABASE_ID },
    properties: {
      Name: {
        title: [{ text: { content: `📅 EOD Report — ${todayFormatted}` } }],
      },
      Date: {
        date: { start: today },
      },
      Status: {
        status: { name: 'Not started' },
      },
    } as Parameters<typeof notion.pages.create>[0]['properties'],
    children: [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '🎬 What the Team is Working On' } }],
        },
      } as Parameters<typeof notion.blocks.children.append>[0]['children'][0],
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '✅ What Was Completed Today' } }],
        },
      } as Parameters<typeof notion.blocks.children.append>[0]['children'][0],
      {
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: 'Jay (Content Manager)' } }],
        },
      } as Parameters<typeof notion.blocks.children.append>[0]['children'][0],
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '🎯 Priorities for Tomorrow' } }],
        },
      } as Parameters<typeof notion.blocks.children.append>[0]['children'][0],
    ],
  })

  return page.id
}

async function findJaySectionBlock(notion: Client, pageId: string): Promise<string | null> {
  const blocks = await notion.blocks.children.list({ block_id: pageId, page_size: 100 })

  let inCompletedSection = false
  for (const block of blocks.results) {
    if (!('type' in block)) continue

    if (block.type === 'heading_2') {
      const h2 = block as { type: 'heading_2'; heading_2: { rich_text: Array<{ plain_text: string }> } }
      const text = h2.heading_2.rich_text.map(t => t.plain_text).join('').toLowerCase()
      inCompletedSection = text.includes('completed') || text.includes('✅')
    }

    if (inCompletedSection && block.type === 'heading_3') {
      const h3 = block as { type: 'heading_3'; heading_3: { rich_text: Array<{ plain_text: string }> } }
      const text = h3.heading_3.rich_text.map(t => t.plain_text).join('').toLowerCase()
      if (text.includes('jay')) {
        return block.id
      }
    }
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const notion = getNotion()
    const body = await req.json().catch(() => ({}))
    const taskIds: string[] = body.taskIds ?? []

    // Fetch completed tasks for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let query = supabase
      .from('tasks')
      .select('id, title, source, completed_at, source_url')
      .eq('status', 'done')
      .gte('completed_at', today.toISOString())
      .order('completed_at', { ascending: true })

    if (taskIds.length > 0) {
      query = query.in('id', taskIds)
    }

    const { data: tasks, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!tasks?.length) return NextResponse.json({ pushed: 0, message: 'No completed tasks today' })

    // Find or create today's EOD page
    const pageId = await findOrCreateTodayPage(notion)

    // Find Jay's section block
    const jaySectionId = await findJaySectionBlock(notion, pageId)

    // Build bullet blocks
    const bulletBlocks = tasks.map(task => ({
      object: 'block' as const,
      type: 'bulleted_list_item' as const,
      bulleted_list_item: {
        rich_text: [
          {
            type: 'text' as const,
            text: {
              content: task.title,
              ...(task.source_url ? { link: { url: task.source_url } } : {}),
            },
          },
          {
            type: 'text' as const,
            text: { content: ` [${task.source}]` },
            annotations: { color: 'gray' as const },
          },
        ],
      },
    }))

    // Append blocks under Jay's section or at end of page
    const targetId = jaySectionId ?? pageId
    await notion.blocks.children.append({
      block_id: targetId,
      children: bulletBlocks as Parameters<typeof notion.blocks.children.append>[0]['children'],
    })

    return NextResponse.json({
      pushed: tasks.length,
      pageId,
      pageUrl: `https://notion.so/${pageId.replace(/-/g, '')}`,
    })
  } catch (err) {
    console.error('Notion EOD error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const notion = getNotion()
    const pageId = await findOrCreateTodayPage(notion)
    return NextResponse.json({
      pageId,
      pageUrl: `https://notion.so/${pageId.replace(/-/g, '')}`,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
