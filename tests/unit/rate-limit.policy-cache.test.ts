import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import {
  __getCachedRedisPolicyCountForTests,
  __primeRedisPolicyForTests,
  __resetRateLimitStateForTests,
} from '../../lib/rateLimit.js'

const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL
const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN

function restoreRedisEnv() {
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

after(() => {
  restoreRedisEnv()
  __resetRateLimitStateForTests()
})

test('rateLimit caches Redis limiters per policy instead of a single global instance', () => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
  __resetRateLimitStateForTests()

  __primeRedisPolicyForTests(5, 60)
  assert.equal(__getCachedRedisPolicyCountForTests(), 1)

  __primeRedisPolicyForTests(5, 60)
  assert.equal(__getCachedRedisPolicyCountForTests(), 1)

  __primeRedisPolicyForTests(10, 60)
  assert.equal(__getCachedRedisPolicyCountForTests(), 2)

  __primeRedisPolicyForTests(10, 300)
  assert.equal(__getCachedRedisPolicyCountForTests(), 3)
})
