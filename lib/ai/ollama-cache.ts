// Ollama Response Cache
// In-memory LRU cache for deterministic Ollama calls.
// No 'use server' - imported by parse-ollama.ts which has 'use server'.
//
// Keyed by hash of (systemPrompt + userContent + model).
// Short TTL (5 minutes) to prevent stale results.
// Useful for: expense categorizer, email classifier, sentiment analysis
// where the same input may be processed multiple times.

import { createHash } from 'crypto'

interface CacheEntry {
  result: unknown
  timestamp: number
}

const MAX_ENTRIES = 100
const TTL_MS = 5 * 60 * 1000 // 5 minutes

const cache = new Map<string, CacheEntry>()

function makeKey(systemPrompt: string, userContent: string, model: string): string {
  return createHash('sha256').update(`${model}::${systemPrompt}::${userContent}`).digest('hex')
}

/** Evict expired entries and trim to max size. */
function evict(): void {
  const now = Date.now()
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > TTL_MS) {
      cache.delete(key)
    }
  }
  // If still over max, remove oldest entries
  while (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) cache.delete(oldestKey)
  }
}

/** Get a cached result if it exists and hasn't expired. */
export function getCachedResult<T>(
  systemPrompt: string,
  userContent: string,
  model: string
): T | undefined {
  const key = makeKey(systemPrompt, userContent, model)
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.timestamp > TTL_MS) {
    cache.delete(key)
    return undefined
  }
  return entry.result as T
}

/** Store a result in the cache. */
export function setCachedResult<T>(
  systemPrompt: string,
  userContent: string,
  model: string,
  result: T
): void {
  const key = makeKey(systemPrompt, userContent, model)
  cache.set(key, { result, timestamp: Date.now() })
  evict()
}

/** Get cache stats for observability. */
export function getCacheStats(): { size: number; maxEntries: number; ttlMs: number } {
  return { size: cache.size, maxEntries: MAX_ENTRIES, ttlMs: TTL_MS }
}
