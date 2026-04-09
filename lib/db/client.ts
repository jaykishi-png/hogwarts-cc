import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — throws at call time, not at module evaluation
let _supabase: SupabaseClient | null = null
let _supabasePublic: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
    _supabase = createClient(url, key, { auth: { persistSession: false } })
  }
  return _supabase
}

// Proxy so existing code using `supabase.from(...)` still works
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// Public client for browser-safe operations
export const supabasePublic = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabasePublic) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
      _supabasePublic = createClient(url, anonKey)
    }
    return (_supabasePublic as unknown as Record<string | symbol, unknown>)[prop]
  },
})
