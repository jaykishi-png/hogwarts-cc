import { NextRequest, NextResponse } from 'next/server'

/**
 * Notion Webhook — receives real-time page update events.
 * Notion sends a POST when a page in a watched database changes.
 *
 * Setup: Notion Settings → Connections → Webhooks → Add endpoint
 * URL: https://hogwarts-cc.vercel.app/api/webhooks/notion
 * Events: page_created, page_updated
 *
 * On receive: triggers a re-sync of EOD tasks so the dashboard updates.
 */

const EOD_DATABASE_ID = process.env.NOTION_EOD_DATABASE_ID ?? '2e02b24a3e3c8024bd16c13d63620b5f'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    // Notion verification challenge
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge })
    }

    // Check if this event is from our EOD database
    const databaseId = body?.data?.parent?.database_id?.replace(/-/g, '') ??
                       body?.entity?.id?.replace(/-/g, '')

    if (databaseId && !databaseId.includes(EOD_DATABASE_ID.replace(/-/g, ''))) {
      return NextResponse.json({ ignored: true })
    }

    console.log('[Notion Webhook] Page updated — EOD tasks will refresh on next poll')

    // Signal to the dashboard that data is fresh
    // The dashboard polls /api/notion/eod-tasks via SWR — no push needed
    // This endpoint exists to trigger any future real-time integrations

    return NextResponse.json({ received: true, ts: new Date().toISOString() })

  } catch (err) {
    console.error('[Notion Webhook] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Notion webhook endpoint active' })
}
