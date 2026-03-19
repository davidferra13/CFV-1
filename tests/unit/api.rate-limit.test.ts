/**
 * Unit tests for lib/api/rate-limit.ts (in-memory implementation).
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { checkRateLimit } from '../../lib/api/rate-limit.js'

describe('api/rate-limit - in-memory', () => {
  it('allows requests and returns remaining count', async () => {
    const key = `api-test-${Date.now()}`
    const result = await checkRateLimit(key)

    assert.equal(result.success, true)
    assert.equal(result.remaining, 99)
    assert.ok(result.reset > Date.now())
  })

  it('tracks separate identifiers independently', async () => {
    const a = await checkRateLimit(`api-a-${Date.now()}`)
    const b = await checkRateLimit(`api-b-${Date.now()}`)

    assert.equal(a.success, true)
    assert.equal(b.success, true)
    assert.equal(a.remaining, 99)
    assert.equal(b.remaining, 99)
  })
})
