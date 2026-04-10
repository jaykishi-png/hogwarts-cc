import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') // ISO date e.g. 2026-04-01
  const to = searchParams.get('to')     // ISO date e.g. 2026-04-30

  let query = supabase
    .from('tasks')
    .select('id, title, source, completed_at, tags, source_url')
    .eq('status', 'done')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })

  if (from) query = query.gte('completed_at', from)
  if (to)   query = query.lte('completed_at', to + 'T23:59:59Z')

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data ?? [] })
}
