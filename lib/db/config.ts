import { supabase } from './client'

export async function getConfig(key: string): Promise<unknown> {
  const { data, error } = await supabase
    .from('config')
    .select('value')
    .eq('key', key)
    .single()

  if (error) return null
  return data?.value
}

export async function setConfig(key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from('config')
    .upsert({ key, value }, { onConflict: 'key' })

  if (error) throw new Error(`setConfig: ${error.message}`)
}

export async function getAllConfig(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from('config').select('*')
  if (error) throw new Error(`getAllConfig: ${error.message}`)

  const result: Record<string, unknown> = {}
  for (const row of data ?? []) {
    result[row.key] = row.value
  }
  return result
}
