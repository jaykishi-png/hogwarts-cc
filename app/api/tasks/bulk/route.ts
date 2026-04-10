import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/client'

export async function POST(req: NextRequest) {
  const { taskIds, action } = await req.json()

  if (!taskIds?.length) return NextResponse.json({ error: 'No taskIds provided' }, { status: 400 })

  const now = new Date().toISOString()

  if (action === 'complete') {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: now, updated_at: now })
      .in('id', taskIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ updated: taskIds.length })
  }

  if (action === 'archive') {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'archived', updated_at: now })
      .in('id', taskIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ updated: taskIds.length })
  }

  if (action === 'defer') {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'deferred', deferred_until: tomorrow.toISOString(), updated_at: now })
      .in('id', taskIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ updated: taskIds.length })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
