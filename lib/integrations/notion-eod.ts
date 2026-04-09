import { Client } from '@notionhq/client'
import type { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints'

const EOD_DATABASE_ID = '2e02b24a3e3c8024bd16c13d63620b5f'

function getClient() {
  if (!process.env.NOTION_TOKEN) throw new Error('NOTION_TOKEN not set')
  return new Client({ auth: process.env.NOTION_TOKEN })
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

// Returns the page ID for today's EOD report, creating it if it doesn't exist
async function findOrCreateTodayPage(notion: Client): Promise<string> {
  const today = todayISO()

  const existing = await notion.databases.query({
    database_id: EOD_DATABASE_ID,
    filter: { property: 'Date', date: { equals: today } },
    page_size: 1,
  })

  if (existing.results.length > 0) {
    return existing.results[0].id
  }

  // Create today's page with the standard template structure
  const children: BlockObjectRequest[] = [
    { heading_1: { rich_text: [{ text: { content: '👤 Jay (Content Manager)' } }] } },
    { heading_2: { rich_text: [{ text: { content: '✅ Completed' } }] } },
    { to_do: { rich_text: [{ text: { content: '' } }], checked: false } },
    { heading_2: { rich_text: [{ text: { content: '🔄 In Progress' } }] } },
    { to_do: { rich_text: [{ text: { content: '' } }], checked: false } },
    { heading_2: { rich_text: [{ text: { content: '🚧 Blockers' } }] } },
    { to_do: { rich_text: [{ text: { content: '' } }], checked: false } },
    { paragraph: { rich_text: [] } },
    { heading_1: { rich_text: [{ text: { content: '👤 Alvin (Video Editor)' } }] } },
    { heading_2: { rich_text: [{ text: { content: '✅ Completed' } }] } },
    { to_do: { rich_text: [{ text: { content: '' } }], checked: false } },
    { heading_2: { rich_text: [{ text: { content: '🔄 In Progress' } }] } },
    { to_do: { rich_text: [{ text: { content: '' } }], checked: false } },
    { heading_2: { rich_text: [{ text: { content: '🚧 Blockers' } }] } },
    { to_do: { rich_text: [{ text: { content: '' } }], checked: false } },
    { paragraph: { rich_text: [] } },
    { heading_1: { rich_text: [{ text: { content: '👤 Vito (Motion Graphics Artist)' } }] } },
    { heading_2: { rich_text: [{ text: { content: '✅ Completed' } }] } },
    { to_do: { rich_text: [{ text: { content: '' } }], checked: false } },
    { heading_2: { rich_text: [{ text: { content: '🔄 In Progress' } }] } },
    { to_do: { rich_text: [{ text: { content: '' } }], checked: false } },
    { heading_2: { rich_text: [{ text: { content: '🚧 Blockers' } }] } },
    { to_do: { rich_text: [{ text: { content: '' } }], checked: false } },
  ]

  const page = await notion.pages.create({
    parent: { database_id: EOD_DATABASE_ID },
    properties: {
      Name: { title: [{ text: { content: `📅 EOD Report — ${todayLabel()}` } }] },
      Date: { date: { start: today } },
      Status: { status: { name: 'Not started' } },
      Completed: { multi_select: [] },
    },
    children,
  })

  return page.id
}

// Finds the last block in Jay's "✅ Completed" section to insert after
async function findInsertionPoint(
  notion: Client,
  pageId: string
): Promise<{ afterId: string | undefined }> {
  const response = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 100,
  })

  let inJaySection = false
  let inCompletedSection = false
  let completedHeadingId: string | undefined
  let lastItemId: string | undefined

  for (const block of response.results) {
    if (!('type' in block)) continue
    const b = block as { id: string; type: string; heading_1?: { rich_text: Array<{ plain_text: string }> }; heading_2?: { rich_text: Array<{ plain_text: string }> } }

    if (b.type === 'heading_1') {
      const text = b.heading_1?.rich_text.map(r => r.plain_text).join('') ?? ''
      if (text.includes('Jay')) {
        inJaySection = true
        inCompletedSection = false
        lastItemId = undefined
      } else if (inJaySection) {
        break // left Jay's section
      }
    } else if (inJaySection && b.type === 'heading_2') {
      const text = b.heading_2?.rich_text.map(r => r.plain_text).join('') ?? ''
      if (text.includes('Completed')) {
        inCompletedSection = true
        completedHeadingId = b.id
        lastItemId = undefined
      } else if (inCompletedSection) {
        break // left the Completed subsection
      }
    } else if (inCompletedSection && (
      b.type === 'bulleted_list_item' ||
      b.type === 'to_do' ||
      b.type === 'numbered_list_item'
    )) {
      lastItemId = b.id
    }
  }

  return { afterId: lastItemId ?? completedHeadingId }
}

export async function addCompletedTaskToEOD(taskTitle: string): Promise<void> {
  const notion = getClient()
  const pageId = await findOrCreateTodayPage(notion)
  const { afterId } = await findInsertionPoint(notion, pageId)

  await notion.blocks.children.append({
    block_id: pageId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    after: afterId as any,
    children: [
      {
        to_do: {
          rich_text: [{ text: { content: taskTitle } }],
          checked: true,
        },
      },
    ],
  })
}
