import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeErrorForClient } from '../../lib/ai/remy-input-validation'

describe('Remy client-facing error sanitization', () => {
  it('passes through non-internal error messages unchanged', () => {
    const message = sanitizeErrorForClient(new Error('Task web.search timed out after 12s.'))
    assert.equal(message, 'Task web.search timed out after 12s.')
  })

  it('passes through short non-internal errors unchanged', () => {
    const message = sanitizeErrorForClient(
      new Error('Missing required input "date" for calendar.check.')
    )
    assert.equal(message, 'Missing required input "date" for calendar.check.')
  })

  it('sanitizes errors containing internal path patterns', () => {
    const message = sanitizeErrorForClient(new Error('Failed at /lib/ai/remy-actions.ts:42'))
    assert.match(message, /ran into an issue/i)
  })

  it('sanitizes errors containing supabase references', () => {
    const message = sanitizeErrorForClient(new Error('supabase connection refused'))
    assert.match(message, /ran into an issue/i)
  })

  it('truncates overly long error messages', () => {
    const longMessage = 'x'.repeat(250)
    const message = sanitizeErrorForClient(new Error(longMessage))
    assert.match(message, /ran into an issue/i)
  })
})
