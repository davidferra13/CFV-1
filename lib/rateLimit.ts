// In-memory rate limiter (replaces Upstash Redis)
// Sufficient for single-process self-hosted deployment.

const memoryMap = new Map<string, { count: number; resetAt: number }>()

/**
 * Check a rate limit for the given key.
 * Throws if the limit is exceeded.
 *
 * @param key        Identifier to rate-limit (e.g. email address or IP)
 * @param max        Maximum number of allowed attempts (default: 10 for dev comfort)
 * @param windowMs   Time window in milliseconds (default: 15 min)
 */
export async function checkRateLimit(
  key: string,
  max: number = 10,
  windowMs: number = 15 * 60 * 1000
): Promise<void> {
  const now = Date.now()
  const entry = memoryMap.get(key)

  if (!entry || now > entry.resetAt) {
    memoryMap.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  if (entry.count >= max) {
    throw new Error('Too many attempts. Please try again later.')
  }

  entry.count++
}
