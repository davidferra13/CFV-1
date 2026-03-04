import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractAndScoreEmail } from '../../lib/gmail/extract-inquiry-fields.js'

describe('extractAndScoreEmail date placeholder resolution', () => {
  it('resolves YYYY month/day placeholders against observed message date', () => {
    const result = extractAndScoreEmail(
      'Private chef request for September 18',
      'We need dinner for 8 guests in Naples, Maine on September 18 with a budget of $150/person.',
      undefined,
      { observedAt: '2025-08-14T19:47:21Z' }
    )

    assert.equal(result.fields.confirmed_date, '2025-09-18')
    assert.equal(result.fields.confirmed_guest_count, 8)
    assert.equal(result.fields.confirmed_budget_cents, 120000)
  })

  it('rolls to next year when placeholder month/day is already past', () => {
    const result = extractAndScoreEmail(
      'Private chef request for January 10',
      'Planning dinner for January 10 for 4 guests.',
      undefined,
      { observedAt: '2025-12-20T12:00:00Z' }
    )

    assert.equal(result.fields.confirmed_date, '2026-01-10')
  })
})
