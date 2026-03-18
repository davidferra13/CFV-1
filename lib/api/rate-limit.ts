import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let ratelimit: Ratelimit | null = null

function getRatelimiter() {
  if (!ratelimit) {
    // Only instantiate if Upstash env vars are set
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      ratelimit = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(100, '1 m'),
        analytics: false,
        prefix: 'chefflow:api',
      })
    }
  }
  return ratelimit
}

export async function checkRateLimit(
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const limiter = getRatelimiter()
  if (!limiter) {
    // No Redis configured - allow all requests in dev
    return { success: true, remaining: 99, reset: Date.now() + 60000 }
  }
  const result = await limiter.limit(identifier)
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  }
}
