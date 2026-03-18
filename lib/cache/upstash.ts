// Upstash - serverless Redis (rate limiting, caching)
// https://upstash.com/
// 10K commands/day free, no credit card
// Perfect for: rate limiting, session cache, real-time counters

/**
 * Upstash Redis via REST API - no persistent connection needed.
 * Works perfectly in serverless/edge environments (self-hosted, Next.js API routes).
 *
 * Setup requires:
 *   npm install @upstash/redis
 *
 * Env vars:
 *   UPSTASH_REDIS_REST_URL - your Redis REST endpoint
 *   UPSTASH_REDIS_REST_TOKEN - your Redis REST token
 *
 * This file provides higher-level utilities for ChefFlow use cases.
 */

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetInSeconds: number
}

/**
 * Simple rate limiter using Upstash Redis.
 * e.g. limit API calls to 10 per minute per IP.
 *
 * @param key - Unique identifier (e.g. IP address, user ID)
 * @param limit - Max requests allowed
 * @param windowSeconds - Time window in seconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const { Redis } = require('@upstash/redis')
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })

    const redisKey = `ratelimit:${key}`
    const current = await redis.incr(redisKey)

    if (current === 1) {
      await redis.expire(redisKey, windowSeconds)
    }

    const ttl = await redis.ttl(redisKey)

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetInSeconds: ttl > 0 ? ttl : windowSeconds,
    }
  } catch {
    // Redis unavailable - allow the request (fail open)
    return { allowed: true, remaining: limit, resetInSeconds: 0 }
  }
}

/**
 * Cache a value with TTL.
 * Great for expensive API calls or database queries.
 */
export async function cacheSet(key: string, value: any, ttlSeconds: number): Promise<void> {
  try {
    const { Redis } = require('@upstash/redis')
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds })
  } catch {
    // Cache miss is fine - just skip
  }
}

/**
 * Get a cached value.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const { Redis } = require('@upstash/redis')
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    const value = await redis.get(key)
    if (value === null) return null
    return typeof value === 'string' ? JSON.parse(value) : value
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
 * Increment a counter (e.g. page views, API usage tracking).
 */
export async function incrementCounter(key: string): Promise<number> {
  try {
    const { Redis } = require('@upstash/redis')
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    return await redis.incr(`counter:${key}`)
  } catch {
    return 0
  }
}
