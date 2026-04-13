import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db/client'

/**
 * POST /api/tasks/cleanup
 * Marks EOD Report / EOD Template / Daily EOD / Untitled Notion tasks as done
 * so they stop showing in the dashboard.
 */
export async function POST() {
  try {
    // Mark all "EOD Report" tasks as done
    const { data: eodReportTasks, error: err1 } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .ilike('title', '%EOD Report%')
      .neq('status', 'done')
      .select('id, title')
    if (err1) throw err1

    // Mark all "EOD Template" tasks as done
    const { data: eodTemplateTasks, error: err2 } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .ilike('title', '%EOD Template%')
      .neq('status', 'done')
      .select('id, title')
    if (err2) throw err2

    // Mark all "Daily EOD" tasks as done
    const { data: dailyEodTasks, error: err3 } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .ilike('title', '%Daily EOD%')
      .neq('status', 'done')
      .select('id, title')
    if (err3) throw err3

    // Mark all Notion tasks with no meaningful title as done
    const { data: emptyTasks, error: err4 } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('source', 'notion')
      .eq('title', '(Untitled)')
      .neq('status', 'done')
      .select('id')
    if (err4) throw err4

    const cleaned =
      (eodReportTasks?.length ?? 0) +
      (eodTemplateTasks?.length ?? 0) +
      (dailyEodTasks?.length ?? 0) +
      (emptyTasks?.length ?? 0)

    return NextResponse.json({
      cleaned,
      eodReports: eodReportTasks?.length ?? 0,
      eodTemplates: eodTemplateTasks?.length ?? 0,
      dailyEod: dailyEodTasks?.length ?? 0,
      untitled: emptyTasks?.length ?? 0,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
