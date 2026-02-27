/**
 * Unit tests for lib/api/rate-limit.ts.
 *
 * Focuses on deterministic fallback behavior when Upstash is not configured.
 */

import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { checkRateLimit } from '../../lib/api/rate-limit.js'

const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL
const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN

function clearUpstashEnv() {
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
}

function restoreUpstashEnv() {
  if (originalRedisUrl === undefined) {
    delete process.env.UPSTASH_REDIS_REST_URL
  } else {
    process.env.UPSTASH_REDIS_REST_URL = originalRedisUrl
  }

  if (originalRedisToken === undefined) {
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  } else {
    process.env.UPSTASH_REDIS_REST_TOKEN = originalRedisToken
  }
}

before(() => {
  clearUpstashEnv()
})

after(() => {
  restoreUpstashEnv()
})

describe('api/rate-limit - fallback mode (no Redis env)', () => {
  it('allows request and returns static fallback remaining/reset envelope', async () => {
    clearUpstashEnv()
    const start = Date.now()
    const result = await checkRateLimit('ip:127.0.0.1')

    assert.equal(result.success, true)
    assert.equal(result.remaining, 99)
    assert.ok(result.reset >= start + 59_000)
    assert.ok(result.reset <= start + 61_000)
  })

  it('returns same fallback semantics for multiple identifiers', async () => {
    clearUpstashEnv()
    const a = await checkRateLimit('ip:1.1.1.1')
    const b = await checkRateLimit('ip:2.2.2.2')

    assert.equal(a.success, true)
    assert.equal(b.success, true)
    assert.equal(a.remaining, 99)
    assert.equal(b.remaining, 99)
  })
})
