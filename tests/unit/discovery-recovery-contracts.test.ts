import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyDiscoveryResetPlan,
  buildDiscoveryResetPlan,
  buildSmartEmptyResultsRepairActions,
  type DiscoveryExplorationState,
} from '@/lib/discovery/recovery-contracts'

test('current search reset clears temporary exploration state and preserves durable state', () => {
  const state: DiscoveryExplorationState = {
    filters: { craving: 'Sichuan', dietary: 'vegan', fulfillment: 'private_chef' },
    selectedIds: ['chip-1'],
    compareCandidateIds: ['chef-1', 'chef-2'],
    radiusMiles: 5,
    sort: 'distance',
    remyTuning: { preference: 'spicy' },
    sessionHints: ['avoid repeats'],
    durable: {
      savedItemIds: ['chef-9'],
      pinnedItemIds: ['thai'],
      circleShortlistIds: ['circle-item-1'],
      voteIds: ['vote-1'],
    },
  }

  const plan = buildDiscoveryResetPlan({ scope: 'current_search', source: 'remy_reset' }, state)
  const next = applyDiscoveryResetPlan(state, plan)

  assert.equal(plan.analyticsEvent, 'remy_reset')
  assert.equal(plan.requiresConfirmation, false)
  assert.deepEqual(next.filters, {})
  assert.deepEqual(next.selectedIds, [])
  assert.equal(next.remyTuning, null)
  assert.deepEqual(next.durable?.savedItemIds, ['chef-9'])
  assert.deepEqual(next.durable?.circleShortlistIds, ['circle-item-1'])
})

test('fresh mix keeps intent and circle reset requires host or admin confirmation', () => {
  const state: DiscoveryExplorationState = {
    filters: { intent: 'dinner_party', craving: 'Italian' },
    freshMixSeed: 'mix-3',
  }
  const freshMix = buildDiscoveryResetPlan({ scope: 'fresh_mix', source: 'fresh_mix' }, state)
  const mixed = applyDiscoveryResetPlan(state, freshMix)

  assert.deepEqual(mixed.filters, state.filters)
  assert.equal(mixed.freshMixSeed, 'mix-4')

  const denied = buildDiscoveryResetPlan({
    scope: 'circle_planning',
    source: 'circle_planning_reset',
    requestedByRole: 'member',
    confirmed: true,
  })
  const allowed = buildDiscoveryResetPlan({
    scope: 'circle_planning',
    source: 'circle_planning_reset',
    requestedByRole: 'host',
    confirmed: true,
  })

  assert.equal(denied.eligible, false)
  assert.equal(allowed.eligible, true)
  assert.equal(allowed.requiresConfirmation, true)
})

test('smart empty result repair offers concrete recovery actions', () => {
  const repairs = buildSmartEmptyResultsRepairActions({
    filters: { craving: 'Romanian', dietary: 'vegan', fulfillment: 'private_chef' },
    radiusMiles: 10,
    remyAvailable: true,
    similarCuisines: ['Hungarian', 'Balkan'],
  })

  assert.deepEqual(
    repairs.map((repair) => repair.id),
    ['expand_radius', 'remove_filter', 'switch_to_restaurants', 'show_similar_cuisines', 'ask_remy']
  )
  assert.equal(
    repairs.find((repair) => repair.id === 'remove_filter')?.nextFilters?.dietary,
    undefined
  )
})
