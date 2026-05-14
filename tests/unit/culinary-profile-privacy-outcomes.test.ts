import test from 'node:test'
import assert from 'node:assert/strict'

import {
  mapDiscoveryOutcomeToCulinaryProfileSignals,
  mergeCulinaryProfileOutcomeSignals,
} from '@/lib/discovery/culinary-profile-outcomes'

test('discovery outcomes become reviewed culinary profile signals with privacy metadata', () => {
  const liked = mapDiscoveryOutcomeToCulinaryProfileSignals({
    id: 'decision-1',
    ownerId: 'client-1',
    itemId: 'dish-pad-thai',
    itemLabel: 'Pad Thai',
    itemKind: 'dish',
    outcome: 'liked',
    occurredAt: '2026-05-12T16:00:00.000Z',
    sessionId: 'session-1',
    actorId: 'client-1',
    surface: 'eat',
  }).signals[0]
  const hidden = mapDiscoveryOutcomeToCulinaryProfileSignals({
    id: 'decision-2',
    ownerId: 'client-1',
    itemId: 'ingredient-cilantro',
    itemLabel: 'cilantro',
    itemKind: 'ingredient',
    outcome: 'hide_from_chef',
    occurredAt: '2026-05-12T16:01:00.000Z',
    sessionId: 'session-1',
  }).signals[0]
  const skipped = mapDiscoveryOutcomeToCulinaryProfileSignals({
    id: 'decision-3',
    ownerId: 'client-1',
    itemId: 'restaurant-1',
    itemLabel: 'Bistro Example',
    itemKind: 'restaurant',
    outcome: 'skipped',
    occurredAt: '2026-05-12T16:02:00.000Z',
  }).signals[0]

  assert.equal(liked.reviewState, 'accepted')
  assert.equal(liked.polarity, 'like')
  assert.equal(liked.shareCategory, 'chef_visible')
  assert.equal(liked.consent.chefSharing, true)
  assert.equal(liked.metadata.culinaryProfileCategory, 'dishes')

  assert.equal(hidden.polarity, 'never_show')
  assert.equal(hidden.shareCategory, 'private')
  assert.equal(hidden.consent.chefSharing, false)
  assert.equal(hidden.metadata.hiddenFromChef, true)

  assert.equal(skipped.reviewState, 'pending_review')
  assert.equal(skipped.shareCategory, 'private')
  assert.equal(skipped.confidence < liked.confidence, true)
})

test('outcome signal merge dedupes repeated decision writes by stable id', () => {
  const first = mapDiscoveryOutcomeToCulinaryProfileSignals({
    id: 'decision-1',
    ownerId: 'client-1',
    itemId: 'dish-pad-thai',
    itemLabel: 'Pad Thai',
    itemKind: 'dish',
    outcome: 'add_to_profile',
    occurredAt: '2026-05-12T16:00:00.000Z',
  }).signals[0]
  const duplicate = mapDiscoveryOutcomeToCulinaryProfileSignals({
    id: 'decision-1',
    ownerId: 'client-1',
    itemId: 'dish-pad-thai',
    itemLabel: 'Pad Thai',
    itemKind: 'dish',
    outcome: 'add_to_profile',
    occurredAt: '2026-05-12T16:00:00.000Z',
  }).signals[0]

  const merged = mergeCulinaryProfileOutcomeSignals({
    existing: [first],
    incoming: [duplicate],
  })

  assert.equal(merged.length, 1)
  assert.equal(merged[0]?.id, first.id)
})
