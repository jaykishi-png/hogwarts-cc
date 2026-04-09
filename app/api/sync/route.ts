import { NextRequest, NextResponse } from 'next/server'
import { runFullSync } from '@/lib/sync/orchestrator'

export async function POST(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`

  try {
    const result = await runFullSync(baseUrl)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Full sync error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
