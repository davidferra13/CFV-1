// In-memory API rate limiter (replaces Upstash)
// Sliding window: 100 requests per minute per identifier.

const windowMap = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60_000
const MAX_REQUESTS = 100

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
