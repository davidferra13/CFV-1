import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCompareMatrix,
  resolveDinnerPlanHandoffReadiness,
  type DiscoveryCompareCandidate,
} from '@/lib/discovery/compare-contracts'

test('compare matrix scores mixed candidates across required dimensions', () => {
  const candidates: DiscoveryCompareCandidate[] = [
    {
      id: 'chef-1',
      type: 'chef',
      label: 'Chef Nina',
      href: '/chef/nina',
      cuisineTags: ['Italian'],
      distanceMiles: 4,
      priceLevel: 'premium',
      supportsGroupSize: 8,
      available: true,
      confidence: 0.86,
      whyRecommended: ['Matches seafood', 'Accepting inquiries'],
    },
    {
      id: 'restaurant-1',
      type: 'restaurant',
      label: 'Pasta Bar',
      href: '/nearby/pasta-bar',
      cuisineTags: ['Italian'],
      distanceMiles: 14,
      priceLevel: 'moderate',
      supportsGroupSize: 4,
      available: null,
      confidence: 0.62,
      whyRecommended: ['Near downtown'],
    },
  ]

  const matrix = buildCompareMatrix(candidates, {
    desiredCuisine: 'Italian',
    maxDistanceMiles: 10,
    budget: 'premium',
    groupSize: 6,
  })

  assert.equal(matrix.length, 2)
  assert.equal(matrix[0].signals.length, 7)
  assert.ok(matrix[0].score > matrix[1].score)
  assert.equal(matrix[1].signals.find((signal) => signal.dimension === 'group_fit')?.status, 'weak')
})

test('dinner plan handoff chooses one primary action and useful fallbacks', () => {
  const restaurant: DiscoveryCompareCandidate = {
    id: 'restaurant-1',
    type: 'restaurant',
    label: 'Pasta Bar',
    href: '/nearby/pasta-bar',
    available: true,
    actionData: {
      menuHref: '/nearby/pasta-bar/menu',
      directionsHref: 'https://maps.example/pasta',
    },
  }

  const handoff = resolveDinnerPlanHandoffReadiness(restaurant)

  assert.equal(handoff.ready, true)
  assert.equal(handoff.primaryAction.id, 'view_menu')
  assert.ok(handoff.secondaryActions.some((action) => action.id === 'get_directions'))
  assert.ok(handoff.secondaryActions.some((action) => action.id === 'reopen_discovery'))
})

test('sparse selected item degrades to manual next step with blockers', () => {
  const sparse: DiscoveryCompareCandidate = {
    id: 'manual-1',
    type: 'manual_pick',
    label: 'Mystery dinner',
    available: false,
  }

  const handoff = resolveDinnerPlanHandoffReadiness(sparse)

  assert.equal(handoff.ready, false)
  assert.equal(handoff.primaryAction.id, 'view_details')
  assert.ok(handoff.blockers.includes('Missing detail destination'))
  assert.ok(handoff.blockers.includes('Availability is not confirmed'))
})
