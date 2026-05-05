/**
 * PIE API Rate Limiter + API Key Authentication
 *
 * In-memory sliding window rate limiter for the public PIE API.
 * Supports both anonymous (IP-based) and authenticated (API key) access
 * with different rate tiers.
 *
 * API keys stored in pie_api_keys table. Keys are hashed (SHA-256).
 * Anonymous: 60 req/min. Authenticated: 600 req/min. Pro: 6000 req/min.
 *
 * NOT a 'use server' file. Used by PIE API route handlers.
 */

import { headers } from 'next/headers'
import { pgClient as sql } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RateTier = 'anonymous' | 'authenticated' | 'pro' | 'internal'

export interface RateLimitResult {
  allowed: boolean
  tier: RateTier
  limit: number
  remaining: number
  resetAt: number
  userId: string | null
  keyName: string | null
}

export interface ApiKeyRecord {
  id: string
  name: string
  user_id: string | null
  tier: RateTier
  hashed_key: string
  created_at: string
  last_used_at: string | null
  requests_today: number
  active: boolean
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RATE_LIMITS: Record<RateTier, { requests: number; windowMs: number }> = {
  anonymous: { requests: 60, windowMs: 60_000 },
  authenticated: { requests: 600, windowMs: 60_000 },
  pro: { requests: 6000, windowMs: 60_000 },
  internal: { requests: 100_000, windowMs: 60_000 },
}

// ---------------------------------------------------------------------------
// In-Memory Sliding Window (per-process, resets on deploy)
// ---------------------------------------------------------------------------

interface WindowEntry {
  timestamps: number[]
  tier: RateTier
}

const windows = new Map<string, WindowEntry>()

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60_000
let lastCleanup = Date.now()

function cleanup(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  const staleThreshold = now - 120_000 // 2 minutes
  for (const [key, entry] of windows) {
    if (
      entry.timestamps.length === 0 ||
      entry.timestamps[entry.timestamps.length - 1] < staleThreshold
    ) {
      windows.delete(key)
    }
  }
}

function checkWindow(identifier: string, tier: RateTier): RateLimitResult {
  cleanup()

  const config = RATE_LIMITS[tier]
  const now = Date.now()
  const windowStart = now - config.windowMs

  let entry = windows.get(identifier)
  if (!entry) {
    entry = { timestamps: [], tier }
    windows.set(identifier, entry)
  }

  // Slide window: remove timestamps older than window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

  const remaining = Math.max(0, config.requests - entry.timestamps.length)
  const allowed = entry.timestamps.length < config.requests

  if (allowed) {
    entry.timestamps.push(now)
  }

  return {
    allowed,
    tier,
    limit: config.requests,
    remaining: allowed ? remaining - 1 : 0,
    resetAt: windowStart + config.windowMs,
    userId: null,
    keyName: null,
  }
}

// ---------------------------------------------------------------------------
// API Key Validation
// ---------------------------------------------------------------------------

async function hashKey(raw: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(raw)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function validateApiKey(raw: string): Promise<ApiKeyRecord | null> {
  const hashed = await hashKey(raw)

  try {
    const rows = await sql`
      SELECT id, name, user_id, tier, hashed_key, created_at, last_used_at, requests_today, active
      FROM pie_api_keys
      WHERE hashed_key = ${hashed} AND active = true
      LIMIT 1
    `

    if (rows.length === 0) return null

    // Update last_used_at (fire-and-forget)
    sql`UPDATE pie_api_keys SET last_used_at = NOW(), requests_today = requests_today + 1 WHERE id = ${rows[0].id}`.catch(
      () => {}
    )

    return rows[0] as ApiKeyRecord
  } catch {
    // DB error: fall back to anonymous (don't block requests)
    return null
  }
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

/**
 * Check rate limit for a PIE API request.
 * Extracts API key from Authorization header or x-api-key header.
 * Falls back to IP-based anonymous limiting.
 */
export async function checkPieRateLimit(): Promise<RateLimitResult> {
  const hdrs = await headers()

  // Extract API key from headers
  const authHeader = hdrs.get('authorization')
  const xApiKey = hdrs.get('x-api-key')

  const rawKey = xApiKey || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null)

  // Internal bypass for ChefFlow server actions (same origin)
  const internalSecret = hdrs.get('x-pie-internal')
  if (internalSecret === process.env.PIE_INTERNAL_SECRET && process.env.PIE_INTERNAL_SECRET) {
    return {
      allowed: true,
      tier: 'internal',
      limit: RATE_LIMITS.internal.requests,
      remaining: RATE_LIMITS.internal.requests,
      resetAt: Date.now() + 60_000,
      userId: 'internal',
      keyName: 'internal',
    }
  }

  // Authenticated path
  if (rawKey) {
    const record = await validateApiKey(rawKey)
    if (record) {
      const identifier = `key:${record.id}`
      const result = checkWindow(identifier, record.tier as RateTier)
      result.userId = record.user_id
      result.keyName = record.name
      return result
    }
    // Invalid key: treat as anonymous (don't reveal key validity via rate limits)
  }

  // Anonymous path: rate limit by IP
  const forwardedFor = hdrs.get('x-forwarded-for')
  const realIp = hdrs.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'
  const identifier = `ip:${ip}`

  return checkWindow(identifier, 'anonymous')
}

/**
 * Build rate limit response headers.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    'X-RateLimit-Tier': result.tier,
  }
}

// ---------------------------------------------------------------------------
// Key Management (for admin use)
// ---------------------------------------------------------------------------

/**
 * Generate a new API key. Returns the raw key (only shown once).
 */
export async function generateApiKey(opts: {
  name: string
  userId?: string
  tier?: RateTier
}): Promise<{ rawKey: string; id: string }> {
  // Generate a secure random key: pie_live_<32 hex chars>
  const randomBytes = crypto.getRandomValues(new Uint8Array(16))
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const rawKey = `pie_live_${hex}`
  const hashed = await hashKey(rawKey)

  const rows = await sql`
    INSERT INTO pie_api_keys (name, user_id, tier, hashed_key, active)
    VALUES (${opts.name}, ${opts.userId || null}, ${opts.tier || 'authenticated'}, ${hashed}, true)
    RETURNING id
  `

  return { rawKey, id: rows[0].id }
}

/**
 * Revoke an API key.
 */
export async function revokeApiKey(keyId: string): Promise<void> {
  await sql`UPDATE pie_api_keys SET active = false WHERE id = ${keyId}`
}
