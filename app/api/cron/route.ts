import { NextRequest, NextResponse } from 'next/server'
import { runFullSync } from '@/lib/sync/orchestrator'
import { resetNotTodayFlags } from '@/lib/db/tasks'

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret to prevent unauthorized calls
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`
  const now = new Date()

  try {
    // Midnight: reset "not today" flags
    if (now.getHours() === 0) {
      await resetNotTodayFlags()
    }

    const result = await runFullSync(baseUrl)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Cron sync error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
