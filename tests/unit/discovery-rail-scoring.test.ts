import test from 'node:test'
import assert from 'node:assert/strict'

import { scoreDiscoveryRailItems } from '@/lib/discovery/discovery-rail-scoring'
import type { UserScrollSignals } from '@/lib/discovery/user-scroll-signals'

const emptySignals: UserScrollSignals = {
  boostedCuisines: [],
  boostedServiceTypes: [],
  rankedPreferences: [],
  rankedPreferencesByType: {},
  suppressedItems: [],
  savedLocation: null,
  hasHistory: false,
}

test('scoreDiscoveryRailItems promotes positive learned signals', () => {
  const signals: UserScrollSignals = {
    ...emptySignals,
    rankedPreferences: [
      {
        itemType: 'cuisine',
        itemValue: 'thai',
        score: 10,
        positiveScore: 10,
        negativeScore: 0,
        interactionCount: 1,
        positiveInteractionCount: 1,
        negativeInteractionCount: 0,
        lastInteractedAt: '2026-05-12T12:00:00.000Z',
      },
    ],
  }

  const scored = scoreDiscoveryRailItems(
    [
      { type: 'cuisine', label: 'Italian', href: '/chefs?cuisine=italian' },
      { type: 'cuisine', label: 'Thai', href: '/chefs?cuisine=thai' },
    ],
    signals,
    { role: 'cuisine' }
  )

  assert.equal(scored[0].item.label, 'Thai')
  assert.ok(scored[0].debug.reason.includes('learned'))
})

test('scoreDiscoveryRailItems hides hard negative learned signals', () => {
  const signals: UserScrollSignals = {
    ...emptySignals,
    rankedPreferences: [
      {
        itemType: 'cuisine',
        itemValue: 'thai',
        score: -12,
        positiveScore: 0,
        negativeScore: 12,
        interactionCount: 1,
        positiveInteractionCount: 0,
        negativeInteractionCount: 1,
        lastInteractedAt: '2026-05-12T12:00:00.000Z',
      },
    ],
    suppressedItems: [{ itemType: 'cuisine', itemValue: 'thai', score: -12 }],
  }

  const scored = scoreDiscoveryRailItems(
    [
      { type: 'cuisine', label: 'Italian', href: '/chefs?cuisine=italian' },
      { type: 'cuisine', label: 'Thai', href: '/chefs?cuisine=thai' },
    ],
    signals,
    { role: 'cuisine' }
  )

  assert.deepEqual(
    scored.map((entry) => entry.item.label),
    ['Italian']
  )
})
