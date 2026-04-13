import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db/client'

/**
 * POST /api/tasks/cleanup
 * Marks EOD Report tasks and Sent tasks as done so they stop showing in the dashboard.
 * Run once after deploy to clean up existing data.
 */
export async function POST() {
  try {
    // Mark all EOD Report tasks as done
    const { data: eodTasks, error: eodError } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .ilike('title', '%EOD Report%')
      .neq('status', 'done')
      .select('id, title')

    if (eodError) throw eodError

    // Mark all Notion tasks with no meaningful title as done
    const { data: emptyTasks, error: emptyError } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('source', 'notion')
      .eq('title', '(Untitled)')
      .neq('status', 'done')
      .select('id')

    if (emptyError) throw emptyError

    return NextResponse.json({
      cleaned: (eodTasks?.length ?? 0) + (emptyTasks?.length ?? 0),
      eodReports: eodTasks?.length ?? 0,
      untitled: emptyTasks?.length ?? 0,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
