import test from 'node:test'
import assert from 'node:assert/strict'

import { mapExistingClientDataToPreferenceSuggestions } from '@/lib/discovery/preference-import-mapping'

test('import mapping turns existing client records into review-gated source-aware suggestions', () => {
  const suggestions = mapExistingClientDataToPreferenceSuggestions(
    [
      {
        id: 'allergy-1',
        source: 'allergy_record',
        observedAt: '2026-05-10T12:00:00.000Z',
        terms: [{ value: 'shellfish', kind: 'allergen', polarity: 'allergy' }],
      },
      {
        id: 'approval-1',
        source: 'menu_approval',
        observedAt: '2026-05-11T12:00:00.000Z',
        terms: [{ value: 'pad thai', kind: 'dish', polarity: 'like', evidence: 'approved menu' }],
      },
      {
        id: 'note-1',
        source: 'client_note',
        observedAt: '2026-05-12T12:00:00.000Z',
        terms: [{ value: 'cilantro', kind: 'ingredient', polarity: 'dislike' }],
      },
    ],
    { ownerId: 'client-1', actorId: 'import-job-1' }
  )

  const allergy = suggestions.find((signal) => signal.rawValue === 'shellfish')
  const padThai = suggestions.find((signal) => signal.rawValue === 'pad thai')
  const cilantro = suggestions.find((signal) => signal.rawValue === 'cilantro')

  assert.equal(suggestions.length, 3)
  assert.equal(allergy?.source, 'import')
  assert.equal(allergy?.domain, 'intake')
  assert.equal(allergy?.reviewState, 'pending_review')
  assert.equal(allergy?.explicit, false)
  assert.equal(allergy?.shareCategory, 'chef_visible')
  assert.equal(allergy?.metadata.reviewGate, 'safety_critical')
  assert.equal(padThai?.domain, 'menu')
  assert.equal(padThai?.metadata.evidence, 'approved menu')
  assert.equal(cilantro?.metadata.importSource, 'client_note')
})

test('event-scoped imported meal request suggestions stay attached to the source event', () => {
  const [suggestion] = mapExistingClientDataToPreferenceSuggestions(
    [
      {
        id: 'meal-request-1',
        source: 'meal_request',
        eventId: 'event-1',
        terms: [{ value: 'vegetarian', kind: 'dietary', polarity: 'restriction' }],
      },
    ],
    { ownerId: 'client-1' }
  )

  assert.equal(suggestion.scope.level, 'event')
  assert.equal(suggestion.scope.eventId, 'event-1')
  assert.equal(suggestion.domain, 'event')
  assert.equal(suggestion.reviewState, 'pending_review')
})
