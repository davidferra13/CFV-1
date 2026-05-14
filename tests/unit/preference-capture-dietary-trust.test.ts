import test from 'node:test'
import assert from 'node:assert/strict'

import { createPreferenceSignalEntry } from '@/lib/discovery/preference-contract'
import {
  assessDietaryTrustSignal,
  buildDietaryTrustProfile,
} from '@/lib/discovery/preference-capture-dietary-trust'
import { createNegativeFeedbackPreferenceSignal } from '@/lib/discovery/preference-capture-feedback-reasons'

test('dietary trust scoring treats accepted safety signals as hard blocks', () => {
  const allergy = createPreferenceSignalEntry({
    id: 'shellfish-allergy',
    ownerId: 'client-1',
    domain: 'intake',
    source: 'intake_form',
    rawValue: 'shellfish',
    kind: 'allergen',
    polarity: 'allergy',
    consent: { chefSharing: true },
    observedAt: '2026-05-12T12:00:00.000Z',
  })

  const assessment = assessDietaryTrustSignal(allergy)

  assert.equal(assessment?.trustLevel, 'declared')
  assert.equal(assessment?.safetyAction, 'hard_block')
  assert.equal(assessment?.chefVisible, true)
  assert.match(assessment?.reason ?? '', /must block unsafe matches/)
})

test('dietary trust profile separates pending dietary feedback from durable hard blocks', () => {
  const allergy = createPreferenceSignalEntry({
    id: 'tree-nut-allergy',
    ownerId: 'client-1',
    domain: 'intake',
    source: 'user_entered',
    rawValue: 'tree nuts',
    kind: 'allergen',
    polarity: 'allergy',
    observedAt: '2026-05-12T12:00:00.000Z',
  })
  const dietaryFeedback = createNegativeFeedbackPreferenceSignal({
    ownerId: 'client-1',
    itemId: 'dish-1',
    itemLabel: 'Cashew Curry',
    itemValue: 'cashew cream',
    itemKind: 'ingredient',
    reason: 'dietary_issue',
    observedAt: '2026-05-12T12:10:00.000Z',
  })
  assert.ok(dietaryFeedback)

  const profile = buildDietaryTrustProfile([allergy, dietaryFeedback], {
    ownerId: 'client-1',
    generatedAt: '2026-05-12T13:00:00.000Z',
  })

  assert.deepEqual(
    profile.hardBlocks.map((assessment) => assessment.signalId),
    ['tree-nut-allergy']
  )
  assert.deepEqual(
    profile.reviewQueue.map((assessment) => assessment.signalId),
    [dietaryFeedback.id]
  )
  assert.equal(profile.lowestTrustLevel, 'review_needed')
})
