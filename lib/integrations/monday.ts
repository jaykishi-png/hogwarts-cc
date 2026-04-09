import type { MondayItem } from '@/types/source'

const MONDAY_API_URL = 'https://api.monday.com/v2'

// Boards inside "Video Production Management" + "Lesson Trackers" subfolder in Revenue Rush
const VIDEO_PRODUCTION_BOARD_IDS = [
  // Video Production Management
  18400099003, // Instructor Directory
  18400099008, // MAIN Course Content Production
  18400099013, // GFX Production
  18400099014, // Course Content QC Tracker
  // Lesson Trackers (subfolder)
  18400099018, // MJ2 Lesson Tracking Board
  18400099025, // Ai3 Lesson Tracking Board
  18400099028, // Ai2 Lesson Tracking Board
  18400099031, // ME2 Lesson Tracking Board
  18400099037, // JM2 Lesson Tracking Board
  18400099038, // MH2 Lesson Tracking Board
]

// Statuses that always surface regardless of assignment (needs Jay's review)
const NEEDS_REVIEW_STATUSES = ['needs review jk', 'needs review']

// Statuses considered done — skip these
const DONE_STATUSES = ['done', 'complete', 'completed', 'closed', 'cancelled', 'canceled']

async function mondayQuery(apiToken: string, query: string): Promise<unknown> {
  const res = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiToken,
      'API-Version': '2024-01',
    },
    body: JSON.stringify({ query }),
  })

  if (!res.ok) {
    throw new Error(`Monday API HTTP ${res.status}: ${res.statusText}`)
  }

  const data = await res.json()
  if (data.errors) {
    throw new Error(`Monday API error: ${JSON.stringify(data.errors)}`)
  }
  return data
}

function isNeedsReview(status: string): boolean {
  return NEEDS_REVIEW_STATUSES.some(s => status.toLowerCase().trim() === s)
}

function isDone(status: string): boolean {
  return DONE_STATUSES.some(s => status.toLowerCase().includes(s))
}

function isAssignedToUser(
  columnValues: Array<{ id: string; type: string; text: string; value: string }>,
  myId: string
): boolean {
  // Check ALL people-type columns — boards use different column IDs
  const personCols = columnValues.filter(
    c => c.type === 'people' || c.type === 'multiple-person' || c.type === 'multiple_person'
  )
  for (const col of personCols) {
    if (!col.value) continue
    try {
      const val = JSON.parse(col.value)
      const ids: string[] = (val.personsAndTeams ?? [])
        .filter((p: { kind: string }) => p.kind === 'person')
        .map((p: { id: string }) => String(p.id))
      if (ids.includes(String(myId))) return true
    } catch { /* skip */ }
  }
  return false
}

export async function fetchAssignedItems(
  apiToken: string,
  _boardIds: number[] = []
): Promise<MondayItem[]> {
  // Step 1: get my user ID
  const meData = await mondayQuery(apiToken, `query { me { id name } }`) as {
    data: { me: { id: string; name: string } }
  }
  const myId = meData.data?.me?.id
  if (!myId) throw new Error('Could not resolve Monday user ID')

  // Step 2: fetch only boards in the "Video Production Management" folder
  const boardFilter = `limit: 10, ids: [${VIDEO_PRODUCTION_BOARD_IDS.join(',')}]`

  const query = `
    query {
      boards(${boardFilter}) {
        id
        name
        workspace { id name }
        items_page(limit: 100) {
          items {
            id
            name
            state
            updated_at
            group { title }
            column_values {
              id
              type
              text
              value
            }
            subitems {
              id
              name
              updated_at
              column_values {
                id
                type
                text
                value
              }
            }
          }
        }
      }
    }
  `

  const data = await mondayQuery(apiToken, query) as {
    data: {
      boards: Array<{
        id: string
        name: string
        workspace: { id: string; name: string }
        items_page: {
          items: Array<{
            id: string
            name: string
            state: string
            updated_at: string
            group: { title: string }
            column_values: Array<{ id: string; type: string; text: string; value: string }>
            subitems: Array<{
              id: string
              name: string
              updated_at: string
              column_values: Array<{ id: string; type: string; text: string; value: string }>
            }>
          }>
        }
      }>
    }
  }

  const boards = data.data?.boards ?? []
  const items: MondayItem[] = []

  for (const board of boards) {
    for (const item of board.items_page?.items ?? []) {
      if (item.state === 'deleted' || item.state === 'archived') continue

      // Status column can have type 'status' (new API) or 'color' (legacy), with varying IDs
      const statusCol = item.column_values.find(c => c.type === 'status' || c.type === 'color')
      const status = statusCol?.text ?? ''

      if (isDone(status)) continue

      const needsReview = isNeedsReview(status)

      // Only include items with Needs Review / Needs Review JK status
      if (!needsReview) continue

      const dueDateCol = item.column_values.find(
        c => c.type === 'date' || c.id.toLowerCase().includes('date')
      )

      items.push({
        id: item.id,
        name: item.name,
        status: status || 'In Progress',
        dueDate: dueDateCol?.text || undefined,
        boardId: board.id,
        boardName: board.name,
        groupName: item.group?.title,
        url: `https://the-clean-supps.monday.com/boards/${board.id}/pulses/${item.id}`,
        lastUpdated: item.updated_at,
        needsReview: needsReview,
      })

      // ── Subitems ────────────────────────────────────────────────────────────
      for (const sub of item.subitems ?? []) {
        const subStatusCol = sub.column_values.find(c => c.type === 'status' || c.type === 'color')
        const subStatus = subStatusCol?.text ?? ''

        if (isDone(subStatus)) continue

        const subNeedsReview = isNeedsReview(subStatus)

        if (!subNeedsReview) continue

        const subDueDateCol = sub.column_values.find(
          c => c.type === 'date' || c.id.toLowerCase().includes('date')
        )

        items.push({
          id: sub.id,
          name: `${item.name} → ${sub.name}`,
          status: subStatus || 'In Progress',
          dueDate: subDueDateCol?.text || undefined,
          boardId: board.id,
          boardName: board.name,
          groupName: item.group?.title,
          url: `https://the-clean-supps.monday.com/boards/${board.id}/pulses/${item.id}`,
          lastUpdated: sub.updated_at,
          needsReview: subNeedsReview,
          isSubitem: true,
        })
      }
    }
  }

  return items
}

export async function updateMondayItemStatus(
  apiToken: string,
  boardId: string,
  itemId: string,
  statusLabel: string
): Promise<void> {
  const query = `
    mutation {
      change_simple_column_value(
        board_id: ${boardId},
        item_id: ${itemId},
        column_id: "status",
        value: "${statusLabel}"
      ) {
        id
      }
    }
  `
  await mondayQuery(apiToken, query)
}
