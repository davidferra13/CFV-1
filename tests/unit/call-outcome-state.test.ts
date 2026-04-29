import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { callNeedsOutcome, hasLoggedCallOutcome } from '../../lib/calls/outcome-state'

describe('call outcome state', () => {
  it('flags completed calls without an outcome, notes, or next action', () => {
    assert.equal(
      callNeedsOutcome({
        status: 'completed',
        outcome_summary: null,
        call_notes: '  ',
        next_action: null,
      }),
      true
    )
  })

  it('treats any captured result field as a logged outcome', () => {
    assert.equal(
      hasLoggedCallOutcome({
        status: 'completed',
        outcome_summary: null,
        call_notes: null,
        next_action: 'Send the updated proposal',
      }),
      true
    )
    assert.equal(
      callNeedsOutcome({
        status: 'completed',
        outcome_summary: 'Client approved the menu direction.',
        call_notes: null,
        next_action: null,
      }),
      false
    )
  })

  it('does not require outcomes for active or cancelled calls', () => {
    assert.equal(callNeedsOutcome({ status: 'scheduled' }), false)
    assert.equal(callNeedsOutcome({ status: 'cancelled' }), false)
    assert.equal(callNeedsOutcome({ status: 'no_show' }), false)
  })
})
