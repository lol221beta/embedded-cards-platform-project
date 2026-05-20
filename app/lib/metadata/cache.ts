import type { LinkMetadata } from '@/types/metadata'

const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry {
  data: LinkMetadata
  expiresAt: number
}

// Module-level singleton — persists across Next.js API route calls in dev
const store = new Map<string, CacheEntry>()

export function cacheGet(key: string): LinkMetadata | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.data
}

export function cacheSet(key: string, data: LinkMetadata): void {
  store.set(key, { data, expiresAt: Date.now() + TTL_MS })
}

export function cacheStats() {
  return { size: store.size }
}
