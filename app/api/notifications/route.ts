import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/db/client'

export async function GET() {
  try {
    const supabase = getSupabase()

    // Read from source_items table that sync routes populate
    const { data, error } = await supabase
      .from('source_items')
      .select('id, source, title, subtitle, url, priority, updated_at')
      .order('updated_at', { ascending: false })
      .limit(60)

    if (error) throw error

    const items = (data ?? []).map((row: {
      id: string; source: string; title: string;
      subtitle?: string; url?: string; priority?: string; updated_at: string
    }) => ({
      id:        row.id,
      source:    row.source as 'monday' | 'slack' | 'calendar' | 'notion',
      title:     row.title,
      subtitle:  row.subtitle,
      url:       row.url,
      priority:  row.priority,
      updatedAt: row.updated_at,
    }))

    return NextResponse.json({ items })
  } catch (err) {
    return NextResponse.json({ items: [], error: String(err) })
  }
}
