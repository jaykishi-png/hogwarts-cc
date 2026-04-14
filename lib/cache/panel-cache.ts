/**
 * Simple in-process TTL cache for panel sync data.
 * Resets on Vercel cold starts — acceptable for short TTLs.
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Map<string, CacheEntry<any>>()

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.data as T
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs })
}

export function cacheInvalidate(key: string): void {
  store.delete(key)
}

export const CACHE_TTL = {
  CALENDAR: 2 * 60 * 1000,
  SLACK:    2 * 60 * 1000,
  MONDAY:   5 * 60 * 1000,
  NOTION:   5 * 60 * 1000,
}
