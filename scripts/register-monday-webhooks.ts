/**
 * Run after deploying to Vercel:
 *   MONDAY_API_TOKEN=xxx APP_URL=https://your-app.vercel.app npx tsx scripts/register-monday-webhooks.ts
 *
 * This registers a `change_column_value` webhook on every Video Production board
 * so Monday pushes status changes to the dashboard in real time.
 */

const BOARD_IDS = [
  18400099003, // Instructor Directory
  18400099008, // MAIN Course Content Production
  18400099013, // GFX Production
  18400099014, // Course Content QC Tracker
  18400099018, // MJ2 Lesson Tracking Board
  18400099025, // Ai3 Lesson Tracking Board
  18400099028, // Ai2 Lesson Tracking Board
  18400099031, // ME2 Lesson Tracking Board
  18400099037, // JM2 Lesson Tracking Board
  18400099038, // MH2 Lesson Tracking Board
]

const apiToken = process.env.MONDAY_API_TOKEN!
const appUrl = process.env.APP_URL!

if (!apiToken || !appUrl) {
  console.error('Set MONDAY_API_TOKEN and APP_URL env vars before running')
  process.exit(1)
}

const webhookUrl = `${appUrl}/api/webhooks/monday`

async function mondayQuery(query: string) {
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiToken,
      'API-Version': '2024-01',
    },
    body: JSON.stringify({ query }),
  })
  return res.json()
}

async function registerWebhook(boardId: number) {
  const result = await mondayQuery(`
    mutation {
      create_webhook(
        board_id: ${boardId},
        url: "${webhookUrl}",
        event: change_column_value
      ) {
        id
        board_id
      }
    }
  `) as { data?: { create_webhook?: { id: string; board_id: string } }; errors?: unknown[] }

  if (result.errors) {
    console.error(`Board ${boardId} failed:`, result.errors)
  } else {
    const wh = result.data?.create_webhook
    console.log(`Board ${boardId} → webhook ${wh?.id} registered`)
  }
}

async function main() {
  console.log(`Registering webhooks → ${webhookUrl}\n`)
  for (const boardId of BOARD_IDS) {
    await registerWebhook(boardId)
  }
  console.log('\nDone. Monday will now push status changes in real time.')
}

main()
