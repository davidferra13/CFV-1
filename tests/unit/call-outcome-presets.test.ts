import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { CALL_OUTCOME_PRESETS, getPresetDueDateValue } from '@/lib/calls/outcome-presets'

describe('call outcome presets', () => {
  it('covers the expected lifecycle outcomes', () => {
    const ids = CALL_OUTCOME_PRESETS.map((preset) => preset.id)

    assert.deepEqual(ids, [
      'qualified_send_proposal',
      'budget_mismatch_revise_scope',
      'waiting_on_client',
      'verbal_acceptance',
      'deposit_reminder',
      'logistics_confirmed',
      'rebooking_opportunity',
      'not_a_fit',
    ])
  })

  it('computes stable due date values from a base date', () => {
    const preset = CALL_OUTCOME_PRESETS.find((item) => item.id === 'waiting_on_client')

    assert.ok(preset)
    assert.equal(getPresetDueDateValue(preset, new Date('2026-04-28T12:00:00Z')), '2026-04-30')
  })
})
