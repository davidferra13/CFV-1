// In-memory API rate limiter (replaces Upstash)
// Sliding window: 100 requests per minute per identifier.

const windowMap = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60_000
const MAX_REQUESTS = 100

// Evict expired entries every 10 minutes to prevent unbounded heap growth.
// A server with millions of unique IPs would otherwise accumulate dead entries forever.
const CLEANUP_INTERVAL_MS = 10 * 60_000
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of windowMap) {
    if (now > entry.resetAt) windowMap.delete(key)
  }
}, CLEANUP_INTERVAL_MS).unref()

export async function checkRateLimit(
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const now = Date.now()
  const entry = windowMap.get(identifier)

  if (!entry || now > entry.resetAt) {
    windowMap.set(identifier, { count: 1, resetAt: now + WINDOW_MS })
    return { success: true, remaining: MAX_REQUESTS - 1, reset: now + WINDOW_MS }
  }

  entry.count++

  return {
    success: entry.count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - entry.count),
    reset: entry.resetAt,
  }
}
