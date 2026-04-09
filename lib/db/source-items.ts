import { supabase } from './client'
import type { SourceItem } from '@/types/source'

export async function upsertSourceItem(
  source: string,
  externalId: string,
  rawData: Record<string, unknown>,
  taskId?: string
): Promise<SourceItem> {
  const { data, error } = await supabase
    .from('source_items')
    .upsert(
      {
        source,
        external_id: externalId,
        raw_data: rawData,
        fetched_at: new Date().toISOString(),
        task_id: taskId ?? null,
      },
      { onConflict: 'source,external_id' }
    )
    .select()
    .single()

  if (error) throw new Error(`upsertSourceItem: ${error.message}`)
  return data as SourceItem
}

export async function getSourceItem(
  source: string,
  externalId: string
): Promise<SourceItem | null> {
  const { data, error } = await supabase
    .from('source_items')
    .select('*')
    .eq('source', source)
    .eq('external_id', externalId)
    .maybeSingle()

  if (error) throw new Error(`getSourceItem: ${error.message}`)
  return data as SourceItem | null
}

export async function markSourceItemReviewed(
  source: string,
  externalId: string
): Promise<void> {
  const { error } = await supabase
    .from('source_items')
    .update({ reviewed: true })
    .eq('source', source)
    .eq('external_id', externalId)

  if (error) throw new Error(`markSourceItemReviewed: ${error.message}`)
}

export async function linkSourceItemToTask(
  source: string,
  externalId: string,
  taskId: string
): Promise<void> {
  const { error } = await supabase
    .from('source_items')
    .update({ task_id: taskId })
    .eq('source', source)
    .eq('external_id', externalId)

  if (error) throw new Error(`linkSourceItemToTask: ${error.message}`)
}
