import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { evaluateCallOutcomeQuality } from '../../lib/calls/outcome-quality'

describe('call outcome quality', () => {
  it('does not score calls before completion', () => {
    const quality = evaluateCallOutcomeQuality({ status: 'scheduled' })

    assert.equal(quality.level, 'missing')
    assert.equal(quality.score, 0)
    assert.equal(quality.nextStep, null)
  })

  it('flags completed calls with vague or missing outcomes as weak', () => {
    const quality = evaluateCallOutcomeQuality({
      status: 'completed',
      outcome_summary: 'Talked to client.',
      call_notes: null,
      next_action: null,
      next_action_due_at: null,
      actual_duration_minutes: null,
    })

    assert.equal(quality.level, 'weak')
    assert.ok(quality.gaps.some((gap) => gap.includes('what was decided')))
    assert.ok(quality.gaps.some((gap) => gap.includes('next action')))
  })

  it('scores actionable completed outcomes as strong', () => {
    const quality = evaluateCallOutcomeQuality({
      status: 'completed',
      outcome_summary: 'Client approved the revised proposal and confirmed the deposit plan.',
      call_notes:
        'They prefer a family-style first course, want the shellfish allergy kept separate, and asked for the final menu by Friday.',
      next_action: 'Send final menu and deposit reminder',
      next_action_due_at: '2026-05-01T16:00:00.000Z',
      actual_duration_minutes: 22,
    })

    assert.equal(quality.level, 'strong')
    assert.ok(quality.score >= 80)
    assert.equal(quality.nextStep, null)
  })
})
