import { NextResponse } from 'next/server'
import { getLastSyncPerSource } from '@/lib/db/sync-log'

export async function GET() {
  try {
    const logs = await getLastSyncPerSource()
    return NextResponse.json({ logs })
  } catch (err) {
    return NextResponse.json({ logs: {}, error: String(err) })
  }
}
