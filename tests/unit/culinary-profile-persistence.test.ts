import test from 'node:test'
import assert from 'node:assert/strict'

import { sanitizeCulinaryOutcomeInput } from '@/lib/discovery/culinary-profile-persistence'

test('culinary outcome sanitizer accepts explicit profile outcomes only', () => {
  const outcome = sanitizeCulinaryOutcomeInput({
    item_id: 'dish-pad-thai',
    item_label: 'Pad Thai',
    item_kind: 'dish',
    outcome: 'add_to_profile',
    surface: 'eat',
    occurred_at: '2026-05-13T12:00:00.000Z',
  })

  assert.equal(outcome?.itemId, 'dish-pad-thai')
  assert.equal(outcome?.itemKind, 'dish')
  assert.equal(outcome?.outcome, 'add_to_profile')
  assert.equal(outcome?.surface, 'eat')
  assert.equal(
    sanitizeCulinaryOutcomeInput({
      item_id: 'dish-pad-thai',
      item_label: 'Pad Thai',
      outcome: 'long_dwell',
    }),
    null
  )
})
