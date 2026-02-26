// Persistent rate limiter backed by Upstash Redis
// Falls back to in-memory if UPSTASH_REDIS_REST_URL is not configured.
//
// To activate persistent rate limiting:
//   1. Create a free Upstash Redis database at https://upstash.com (free tier: 10k commands/day)
//   2. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your Vercel environment variables
//   3. That's it — the limiter automatically switches to Redis when the env vars are present
//
// Without Upstash configured, this falls back to the in-memory limiter
// (resets on deploy, per-process only — acceptable for low-traffic situations).

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// In-memory fallback (same behaviour as the previous implementation)
const memoryMap = new Map<string, { count: number; resetAt: number }>()

function checkMemoryRateLimit(key: string, max: number, windowMs: number): void {
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

// Singleton Redis client — only instantiated if env vars are present
let redisRatelimit: Ratelimit | null = null

function getRedisRatelimit(max: number, windowSeconds: number): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }

  // One limiter per (max, window) combination; for simplicity we recreate if needed.
  // In practice this module is loaded once per server process.
  if (!redisRatelimit) {
    redisRatelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(max, `${windowSeconds} s`),
      prefix: 'cf:rl', // chefflow rate limit namespace
    })
  }

  return redisRatelimit
}

/**
 * Check a rate limit for the given key.
 * Throws if the limit is exceeded.
 *
 * @param key        Identifier to rate-limit (e.g. email address or IP)
 * @param max        Maximum number of allowed attempts
 * @param windowMs   Time window in milliseconds
 */
export async function checkRateLimit(
  key: string,
  max: number = 5,
  windowMs: number = 15 * 60 * 1000
): Promise<void> {
  const windowSeconds = Math.ceil(windowMs / 1000)
  const limiter = getRedisRatelimit(max, windowSeconds)

  if (limiter) {
    // Persistent Redis-backed rate limiting
    const { success } = await limiter.limit(key)
    if (!success) {
      throw new Error('Too many attempts. Please try again later.')
    }
  } else {
    // In-memory fallback
    checkMemoryRateLimit(key, max, windowMs)
  }
}
