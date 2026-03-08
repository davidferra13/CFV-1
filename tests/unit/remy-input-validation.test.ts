import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeErrorForClient } from '../../lib/ai/remy-input-validation'

describe('Remy client-facing error sanitization', () => {
  it('maps task timeouts to a specific user-facing message', () => {
    const message = sanitizeErrorForClient(new Error('Task web.search timed out after 12s.'))
    assert.match(message, /took too long/i)
  })

  it('maps missing parsed inputs to a rephrase request', () => {
    const message = sanitizeErrorForClient(
      new Error('Missing required input "date" for calendar.check.')
    )
    assert.match(message, /rephrase/i)
  })

  it('maps setup timeouts to a context loading message', () => {
    const message = sanitizeErrorForClient(new Error('Pre-stream setup timed out after 120s'))
    assert.match(message, /business context/i)
  })
})
