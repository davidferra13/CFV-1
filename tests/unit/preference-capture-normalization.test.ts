import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createNegativeFeedbackPreferenceSignal,
  getNegativeFeedbackReasonPolicy,
} from '@/lib/discovery/preference-capture-feedback-reasons'
import { normalizeVisualTasteOnboardingChoices } from '@/lib/discovery/preference-capture-normalization'

test('visual taste onboarding choices normalize into explicit consent-aware signals', () => {
  const signals = normalizeVisualTasteOnboardingChoices(
    [
      { id: 'choice-yes', rawValue: 'Thai', kind: 'cuisine', choice: 'yes' },
      { id: 'choice-no', rawValue: 'cilantro', kind: 'ingredient', choice: 'no' },
      { id: 'choice-sometimes', rawValue: 'spicy', kind: 'tag', choice: 'sometimes' },
      { id: 'choice-not-tonight', rawValue: 'seafood', kind: 'ingredient', choice: 'not_tonight' },
    ],
    {
      ownerId: 'client-1',
      eventId: 'event-1',
      observedAt: '2026-05-12T12:00:00.000Z',
      consent: { chefSharing: true },
    }
  )

  assert.deepEqual(
    signals.map((signal) => [signal.id, signal.polarity, signal.reviewState, signal.explicit]),
    [
      ['choice-yes', 'like', 'accepted', true],
      ['choice-no', 'dislike', 'accepted', true],
      ['choice-sometimes', 'context', 'accepted', true],
      ['choice-not-tonight', 'dislike', 'accepted', true],
    ]
  )
  assert.equal(signals[0].source, 'user_entered')
  assert.equal(signals[0].confidence, 1)
  assert.equal(signals[0].consent.chefSharing, true)
  assert.equal(signals[3].scope.level, 'event')
  assert.equal(signals[3].scope.eventId, 'event-1')
  assert.equal(signals[3].shareCategory, 'event_visible')
  assert.equal(signals[3].metadata.eventScoped, true)
})

test('negative feedback reasons create deterministic learning policies without casualizing safety', () => {
  const genericHide = createNegativeFeedbackPreferenceSignal({
    ownerId: 'client-1',
    itemId: 'dish-1',
    itemLabel: 'Steak Frites',
    reason: 'generic_hide',
  })
  const neverShow = createNegativeFeedbackPreferenceSignal({
    ownerId: 'client-1',
    itemId: 'dish-2',
    itemLabel: 'Oyster Tower',
    itemValue: 'oysters',
    itemKind: 'ingredient',
    reason: 'never_show_again',
    observedAt: '2026-05-12T12:00:00.000Z',
  })
  const dietaryIssue = createNegativeFeedbackPreferenceSignal({
    ownerId: 'client-1',
    itemId: 'dish-3',
    itemLabel: 'Cashew Curry',
    itemValue: 'cashew cream',
    itemKind: 'ingredient',
    reason: 'dietary_issue',
    observedAt: '2026-05-12T12:01:00.000Z',
  })

  assert.equal(genericHide, null)
  assert.equal(getNegativeFeedbackReasonPolicy('never_show_again').rankingPenalty, 1)
  assert.equal(neverShow?.polarity, 'never_show')
  assert.equal(neverShow?.reviewState, 'accepted')
  assert.equal(neverShow?.metadata.hardExclusion, true)
  assert.equal(dietaryIssue?.polarity, 'restriction')
  assert.equal(dietaryIssue?.reviewState, 'pending_review')
  assert.equal(dietaryIssue?.shareCategory, 'chef_visible')
  assert.equal(dietaryIssue?.metadata.safetyEscalation, true)
})
