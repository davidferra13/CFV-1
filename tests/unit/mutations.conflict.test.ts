/**
 * Unit tests for conflict helpers in lib/mutations/conflict.ts.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  CONFLICT_ERROR_PREFIX,
  createConflictError,
  parseConflictError,
} from '../../lib/mutations/conflict.js'
import { ConflictError } from '../../lib/errors/app-error.js'

describe('mutations/conflict - createConflictError', () => {
  it('creates ConflictError with prefixed payload message', () => {
    const error = createConflictError('Row version mismatch', '2026-02-27T10:00:00.000Z')
    assert.ok(error instanceof ConflictError)
    assert.ok(error.message.startsWith(CONFLICT_ERROR_PREFIX))
    assert.equal(error.code, 'CONFLICT_ERROR')
    assert.equal(error.category, 'conflict')
  })
})

describe('mutations/conflict - parseConflictError', () => {
  it('parses payload from prefixed conflict error message', () => {
    const parsed = parseConflictError(
      createConflictError('Optimistic concurrency conflict', '2026-02-27T10:01:00.000Z')
    )
    assert.deepEqual(parsed, {
      code: 'CONFLICT',
      message: 'Optimistic concurrency conflict',
      currentUpdatedAt: '2026-02-27T10:01:00.000Z',
    })
  })

  it('extracts fallback conflict payload from ConflictError without prefix', () => {
    const parsed = parseConflictError(
      new ConflictError('This record changed elsewhere.', {
        metadata: { currentUpdatedAt: '2026-02-27T10:02:00.000Z' },
      })
    )
    assert.deepEqual(parsed, {
      code: 'CONFLICT',
      message: 'This record changed elsewhere.',
      currentUpdatedAt: '2026-02-27T10:02:00.000Z',
    })
  })

  it('returns null for non-conflict errors', () => {
    assert.equal(parseConflictError(new Error('boom')), null)
    assert.equal(parseConflictError('random string'), null)
  })

  it('returns null for malformed JSON payload', () => {
    const bad = new Error(`${CONFLICT_ERROR_PREFIX}{bad-json`)
    assert.equal(parseConflictError(bad), null)
  })

  it('returns null when parsed code is not CONFLICT', () => {
    const bad = new Error(`${CONFLICT_ERROR_PREFIX}${JSON.stringify({ code: 'NOPE' })}`)
    assert.equal(parseConflictError(bad), null)
  })
})
