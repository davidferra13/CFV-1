import test from 'node:test'
import assert from 'node:assert/strict'
import { checkRateLimit } from '../../lib/rateLimit.js'

test('rateLimit allows requests under the limit', async () => {
  const key = `test-${Date.now()}`
  // Should not throw for first 10 attempts (default max)
  for (let i = 0; i < 10; i++) {
    await checkRateLimit(key)
  }
})

test('rateLimit throws after exceeding the limit', async () => {
  const key = `test-exceed-${Date.now()}`
  // Fill up the limit
  for (let i = 0; i < 5; i++) {
    await checkRateLimit(key, 5)
  }
  // Next attempt should throw
  await assert.rejects(() => checkRateLimit(key, 5), {
    message: 'Too many attempts. Please try again later.',
  })
})

test('rateLimit respects different max values per key', async () => {
  const keyA = `test-a-${Date.now()}`
  const keyB = `test-b-${Date.now()}`

  // keyA with max 2
  await checkRateLimit(keyA, 2)
  await checkRateLimit(keyA, 2)
  await assert.rejects(() => checkRateLimit(keyA, 2))

  // keyB with max 3 should still work
  await checkRateLimit(keyB, 3)
  await checkRateLimit(keyB, 3)
  await checkRateLimit(keyB, 3)
  await assert.rejects(() => checkRateLimit(keyB, 3))
})
