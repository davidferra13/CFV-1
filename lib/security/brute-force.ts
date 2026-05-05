// Brute Force Protection
// Escalating lockout for failed login attempts.
// Uses the durable rate_limits table (same infrastructure as SMS rate limiting).

import {
  checkRateLimit,
  incrementRateLimit,
  cleanupExpiredLimits,
} from '@/lib/security/durable-rate-limit'
import { pgClient } from '@/lib/db'

// Escalating lockout tiers
const LOCKOUT_TIERS = [
  { failures: 5, windowSeconds: 15 * 60, lockoutSeconds: 15 * 60 }, // 5 in 15 min = 15 min lockout
  { failures: 10, windowSeconds: 60 * 60, lockoutSeconds: 60 * 60 }, // 10 in 1 hr = 1 hr lockout
  { failures: 20, windowSeconds: 24 * 60 * 60, lockoutSeconds: 24 * 60 * 60 }, // 20 in 24 hr = 24 hr lockout
] as const

interface LoginCheckResult {
  allowed: boolean
  lockoutUntil?: Date
}

/**
 * Check if a login attempt is allowed for the given identifier (email or IP).
 * Checks all lockout tiers from strictest to most lenient.
 */
export async function checkLoginAttempts(identifier: string): Promise<LoginCheckResult> {
  // Check each tier from most severe to least
  for (let i = LOCKOUT_TIERS.length - 1; i >= 0; i--) {
    const tier = LOCKOUT_TIERS[i]
    const key = `login_fail:${identifier}`
    const result = await checkRateLimit(key, tier.failures, tier.windowSeconds)

    if (!result.allowed) {
      // Calculate lockout end time
      const lockoutUntil = new Date(Date.now() + tier.lockoutSeconds * 1000)
      return { allowed: false, lockoutUntil }
    }
  }

  return { allowed: true }
}

/**
 * Record a failed login attempt.
 * Increments counters across all lockout tier windows.
 */
export async function recordFailedAttempt(identifier: string): Promise<void> {
  const key = `login_fail:${identifier}`

  // Increment in all tier windows so escalation works
  for (const tier of LOCKOUT_TIERS) {
    await incrementRateLimit(key, tier.windowSeconds)
  }
}

/**
 * Clear all failed attempt counters for an identifier.
 * Call this on successful login to reset the escalation.
 */
export async function clearAttempts(identifier: string): Promise<void> {
  const key = `login_fail:${identifier}`

  await pgClient`
    DELETE FROM rate_limits
    WHERE key = ${key}
  `
}

// Re-export cleanup for cron use
export { cleanupExpiredLimits }
