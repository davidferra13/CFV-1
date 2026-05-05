// Durable PostgreSQL-backed rate limiter
// Unlike the in-memory rate-limit.ts, this survives restarts and works across processes.
// Backs SMS verification, brute force protection, and any security-critical rate limiting.

import { pgClient } from '@/lib/db'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetsAt: Date
}

/**
 * Check whether an action is within its rate limit window.
 * Does NOT increment the counter (call incrementRateLimit separately on action).
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const windowStart = getWindowStart(windowSeconds)
  const resetsAt = new Date(windowStart.getTime() + windowSeconds * 1000)

  const rows = await pgClient`
    SELECT count FROM rate_limits
    WHERE key = ${key} AND window_start = ${windowStart.toISOString()}
    LIMIT 1
  `

  const current = rows.length > 0 ? (rows[0].count as number) : 0
  const remaining = Math.max(0, maxAttempts - current)

  return {
    allowed: current < maxAttempts,
    remaining,
    resetsAt,
  }
}

/**
 * Increment the rate limit counter for a key in the current window.
 * Uses upsert so it creates the row if it does not exist.
 */
export async function incrementRateLimit(key: string, windowSeconds: number): Promise<void> {
  const windowStart = getWindowStart(windowSeconds)

  await pgClient`
    INSERT INTO rate_limits (key, window_start, window_seconds, count)
    VALUES (${key}, ${windowStart.toISOString()}, ${windowSeconds}, 1)
    ON CONFLICT (key, window_start)
    DO UPDATE SET count = rate_limits.count + 1
  `
}

/**
 * Delete expired rate limit rows (older than 24 hours).
 * Designed to be called from a cron job.
 */
export async function cleanupExpiredLimits(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  await pgClient`
    DELETE FROM rate_limits
    WHERE created_at < ${cutoff.toISOString()}
  `
}

/**
 * Compute the start of the current time window for a given window size.
 * Windows are aligned to epoch to ensure consistency.
 */
function getWindowStart(windowSeconds: number): Date {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const windowStartMs = Math.floor(now / windowMs) * windowMs
  return new Date(windowStartMs)
}
