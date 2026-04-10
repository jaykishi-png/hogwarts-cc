import { NextResponse } from 'next/server'

const MONDAY_API_URL = 'https://api.monday.com/v2'
const VIDEO_PRODUCTION_BOARD_IDS = [
  18400099003, 18400099008, 18400099013, 18400099014,
  18400099018, 18400099025, 18400099028, 18400099031,
  18400099037, 18400099038,
]
const NEEDS_REVIEW_STATUSES = ['needs review', 'needs review jk']
const IN_PROGRESS_STATUSES = ['working on it', 'in progress', 'in review']
const DONE_STATUSES = ['done', 'complete', 'completed', 'closed', 'cancelled', 'canceled']
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000

async function mondayRequest(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: process.env.MONDAY_API_TOKEN ?? '',
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 300 },
  })
  return res.json()
}

export async function GET() {
  try {
    const data = await mondayRequest(`
      query($ids: [ID!]!) {
        boards(ids: $ids, limit: 20) {
          id
          name
          items_page(limit: 100) {
            items {
              id
              name
              updated_at
              column_values {
                id
                type
                text
              }
            }
          }
        }
      }
    `, { ids: VIDEO_PRODUCTION_BOARD_IDS.map(String) })

    const boards = data?.data?.boards ?? []
    const now = Date.now()

    const result = boards.map((board: {
      id: string
      name: string
      items_page: { items: Array<{ id: string; name: string; updated_at: string; column_values: Array<{ id: string; type: string; text: string }> }> }
    }) => {
      const items = board.items_page?.items ?? []
      let needsReview = 0, inProgress = 0, done = 0
      const stale: Array<{ title: string; itemId: string; boardId: string; updatedAt: string }> = []

      for (const item of items) {
        const statusCol = item.column_values?.find((c: { type: string }) => c.type === 'status' || c.type === 'color')
        const statusText = (statusCol?.text ?? '').toLowerCase().trim()

        const isNeedsReview = NEEDS_REVIEW_STATUSES.includes(statusText)
        const isInProgress = IN_PROGRESS_STATUSES.some(s => statusText.includes(s))
        const isDone = DONE_STATUSES.some(s => statusText.includes(s))

        if (isNeedsReview) {
          needsReview++
          // Check if stale
          const updatedMs = new Date(item.updated_at).getTime()
          if (now - updatedMs > STALE_THRESHOLD_MS) {
            stale.push({
              title: item.name,
              itemId: item.id,
              boardId: board.id,
              updatedAt: item.updated_at,
            })
          }
        } else if (isInProgress) {
          inProgress++
        } else if (isDone) {
          done++
        }
      }

      return { boardName: board.name, boardId: board.id, needsReview, inProgress, done, stale }
    }).filter((b: { needsReview: number; inProgress: number }) => b.needsReview > 0 || b.inProgress > 0)

    return NextResponse.json({ boards: result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
