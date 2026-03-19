// In-memory cache (replaces Upstash Redis)
// Simple Map-based cache with TTL support. Sufficient for single-process self-hosted deployment.

interface CacheEntry {
  value: string
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const counters = new Map<string, { count: number; resetAt: number }>()

// Clean expired entries periodically (every 5 min)
setInterval(
  () => {
    const now = Date.now()
    for (const [key, entry] of cache) {
      if (now > entry.expiresAt) cache.delete(key)
    }
  },
  5 * 60 * 1000
).unref?.()

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetInSeconds: number
}

/**
 * Simple in-memory rate limiter.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const entry = counters.get(key)

  if (!entry || now > entry.resetAt) {
    counters.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetInSeconds: windowSeconds }
  }

  entry.count++
  const ttl = Math.ceil((entry.resetAt - now) / 1000)

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetInSeconds: ttl > 0 ? ttl : windowSeconds,
  }
}

/**
 * Cache a value with TTL.
 */
export async function cacheSet(key: string, value: any, ttlSeconds: number): Promise<void> {
  cache.set(key, {
    value: JSON.stringify(value),
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}

/**
 * Get a cached value.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  try {
    return JSON.parse(entry.value) as T
  } catch {
    return null
  }
}

/**
 * Cache-through helper - check cache first, call fn if miss, store result.
 */
export async function cacheFetch<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key)
  if (cached !== null) return cached

  const result = await fn()
  await cacheSet(key, result, ttlSeconds)
  return result
}

/**
 * Increment a counter.
 */
export async function incrementCounter(key: string): Promise<number> {
  const cacheKey = `counter:${key}`
  const entry = counters.get(cacheKey)
  if (entry) {
    entry.count++
    return entry.count
  }
  counters.set(cacheKey, { count: 1, resetAt: Date.now() + 86400000 })
  return 1
}
