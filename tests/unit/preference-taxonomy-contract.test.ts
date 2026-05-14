import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildPreferenceConsumerReadiness,
  createPreferenceSignalEntry,
  derivePreferenceProfile,
} from '@/lib/discovery/preference-contract'
import {
  foodTaxonomyTermsOverlap,
  normalizeFoodTaxonomyTerm,
} from '@/lib/discovery/preference-taxonomy'

test('food taxonomy canonicalizes aliases while preserving display intent', () => {
  const shrimp = normalizeFoodTaxonomyTerm('shrimp', 'ingredient')
  const prawns = normalizeFoodTaxonomyTerm('prawns', 'ingredient')
  const shellfish = normalizeFoodTaxonomyTerm('Shellfish', 'allergen')
  const padThai = normalizeFoodTaxonomyTerm('pad thai', 'dish')
  const coriander = normalizeFoodTaxonomyTerm('fresh coriander', 'ingredient')
  const unknown = normalizeFoodTaxonomyTerm('grandma sauce', 'ingredient')

  assert.equal(shrimp.canonicalKey, prawns.canonicalKey)
  assert.equal(shrimp.displayLabel, 'Shrimp')
  assert.ok(foodTaxonomyTermsOverlap(shrimp, shellfish))
  assert.ok(padThai.matchKeys.includes('cuisine:thai'))
  assert.equal(coriander.canonicalKey, 'ingredient:cilantro')
  assert.equal(unknown.canonicalKey, 'ingredient:grandma_sauce')
  assert.equal(unknown.originalLabel, 'grandma sauce')
  assert.equal(unknown.isKnown, false)
})

test('preference contract keeps source, confidence, consent, scope, and review metadata', () => {
  const explicitDislike = createPreferenceSignalEntry({
    id: 'explicit-dislike',
    ownerId: 'client-1',
    domain: 'profile',
    source: 'user_entered',
    rawValue: 'prawns',
    kind: 'ingredient',
    polarity: 'dislike',
    observedAt: '2026-05-12T12:00:00.000Z',
    scope: { level: 'person', householdMemberId: 'member-1', label: 'Avery' },
    shareCategory: 'chef_visible',
    consent: { chefSharing: true },
  })
  const inferredLike = createPreferenceSignalEntry({
    id: 'inferred-like',
    ownerId: 'client-1',
    domain: 'discovery',
    source: 'discovery_interaction',
    rawValue: 'shrimp',
    kind: 'ingredient',
    polarity: 'like',
    reviewState: 'accepted',
    confidence: 0.4,
    observedAt: '2026-05-12T11:00:00.000Z',
    scope: { level: 'person', householdMemberId: 'member-1', label: 'Avery' },
  })
  const pendingInference = createPreferenceSignalEntry({
    id: 'pending-inference',
    ownerId: 'client-1',
    domain: 'search',
    source: 'search',
    rawValue: 'Thai',
    kind: 'cuisine',
    polarity: 'like',
    observedAt: '2026-05-12T10:00:00.000Z',
  })
  const eventOverride = createPreferenceSignalEntry({
    id: 'event-override',
    ownerId: 'client-1',
    domain: 'event',
    source: 'user_entered',
    rawValue: 'seafood',
    kind: 'ingredient',
    polarity: 'never_show',
    observedAt: '2026-05-12T13:00:00.000Z',
    scope: { level: 'event', eventId: 'event-1', label: 'Birthday' },
  })

  const profile = derivePreferenceProfile(
    [inferredLike, explicitDislike, pendingInference, eventOverride],
    { ownerId: 'client-1', generatedAt: '2026-05-12T14:00:00.000Z' }
  )
  const readiness = buildPreferenceConsumerReadiness(profile)

  assert.equal(explicitDislike.explicit, true)
  assert.equal(explicitDislike.confidence, 1)
  assert.equal(explicitDislike.reviewState, 'accepted')
  assert.equal(explicitDislike.consent.chefSharing, true)
  assert.equal(profile.positives.length, 0)
  assert.equal(profile.negatives[0]?.id, 'explicit-dislike')
  assert.equal(profile.shadowed[0]?.id, 'inferred-like')
  assert.deepEqual(
    profile.inferredForReview.map((signal) => signal.id),
    ['pending-inference']
  )
  assert.equal(readiness.canPersonalize, true)
  assert.equal(readiness.hasEventOverrides, true)
  assert.equal(readiness.hasHouseholdOrGuestScope, true)
  assert.equal(readiness.downstreamContractVersion, 'preference-profile-v1')
})
