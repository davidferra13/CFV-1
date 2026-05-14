import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyDiscoveryRailItemToSession,
  buildDiscoverySessionDestination,
  createDiscoverySession,
  executeDiscoverySessionReset,
  expireDiscoverySession,
  getDiscoverySessionFeatureDecision,
  getDiscoverySessionRouteEligibility,
} from '@/lib/discovery/session-lifecycle-contract'
import type { DiscoveryRailItem } from '@/lib/discovery/homepage-discovery-rail'

const now = new Date('2026-05-13T01:30:08.000Z')

test('discovery session selection bridges rail item clicks into shared filters and analytics', () => {
  const session = createDiscoverySession({
    id: 'session-1',
    role: 'client',
    source: 'homepage',
    now,
  })
  const item: DiscoveryRailItem = {
    type: 'cuisine',
    label: 'Shaanxi',
    href: '/chefs?cuisine=shaanxi',
  }

  const result = applyDiscoveryRailItemToSession(session, item)
  const destination = buildDiscoverySessionDestination(result.session)

  assert.equal(result.session.filters.cuisines[0], 'shaanxi')
  assert.equal(result.session.selectedItems[0].label, 'Shaanxi')
  assert.equal(result.analytics?.event, 'discovery_rail_select')
  assert.equal(destination.href, '/eat?cuisine=shaanxi')
  assert.equal(destination.eligible, true)
})

test('discovery session refuses unsafe destinations before state mutation', () => {
  const session = createDiscoverySession({
    id: 'session-2',
    role: 'public',
    now,
  })
  const unsafe: DiscoveryRailItem = {
    type: 'cuisine',
    label: 'Internal cuisine',
    href: '/eat?userId=4d3adac4-1cf2-45d5-95e1-709c0a48a2ff',
  }

  const result = applyDiscoveryRailItemToSession(session, unsafe)
  const eligibility = getDiscoverySessionRouteEligibility(session, unsafe)

  assert.equal(result.session, session)
  assert.equal(result.analytics, null)
  assert.equal(eligibility.actionable, false)
  assert.equal(eligibility.route.privateIdLeak, true)
})

test('current search reset clears temporary exploration state and preserves durable state', () => {
  const session = createDiscoverySession({
    id: 'session-3',
    role: 'client',
    filters: {
      cuisines: ['romanian'],
      occasion: 'dinner_party',
      radiusMiles: 10,
      remyTuning: 'guided',
    },
    compareItemIds: ['chef-1'],
    remyHints: ['more budget friendly'],
    durableState: {
      savedItemIds: ['chef-1'],
      pinnedItemIds: ['menu-1'],
      hiddenItemKeys: ['cuisine:sushi'],
      circleDecisionIds: ['decision-1'],
    },
    collaborativeState: {
      circleId: 'circle-1',
      shortlistItemIds: ['chef-2'],
      voteIds: ['vote-1'],
      commentIds: ['comment-1'],
    },
    now,
  })

  const result = executeDiscoverySessionReset(session, {
    scope: 'current_search',
    source: 'manual_reset',
    actorRole: 'client',
  })

  assert.equal(result.executed, true)
  assert.deepEqual(result.session.filters.cuisines, [])
  assert.equal(result.session.filters.occasion, undefined)
  assert.deepEqual(result.session.compareItemIds, [])
  assert.deepEqual(result.session.remyHints, [])
  assert.deepEqual(result.session.durableState.savedItemIds, ['chef-1'])
  assert.deepEqual(result.session.collaborativeState.shortlistItemIds, ['chef-2'])
  assert.ok(result.preserves.includes('durable_memory'))
})

test('fresh mix keeps active intent and selected state while changing rail seed', () => {
  const session = createDiscoverySession({
    id: 'session-4',
    role: 'guest',
    seed: 'seed-a',
    filters: { occasion: 'weekend', cuisines: ['thai'] },
    now,
  })

  const result = executeDiscoverySessionReset(session, {
    scope: 'fresh_mix',
    source: 'fresh_mix',
    actorRole: 'guest',
  })

  assert.equal(result.executed, true)
  assert.equal(result.session.filters.occasion, 'weekend')
  assert.deepEqual(result.session.filters.cuisines, ['thai'])
  assert.notEqual(result.session.seed, session.seed)
  assert.ok(result.clears.includes('rail_order'))
})

test('circle planning reset is role gated and confirmation gated', () => {
  const session = createDiscoverySession({
    id: 'session-5',
    role: 'client',
    collaborativeState: {
      circleId: 'circle-1',
      shortlistItemIds: ['chef-1'],
      voteIds: ['vote-1'],
      commentIds: ['comment-1'],
    },
    now,
  })

  const denied = executeDiscoverySessionReset(session, {
    scope: 'circle_planning',
    source: 'circle_planning_reset',
    actorRole: 'client',
  })
  const needsConfirmation = executeDiscoverySessionReset(session, {
    scope: 'circle_planning',
    source: 'circle_planning_reset',
    actorRole: 'client',
    canManageCircle: true,
  })
  const confirmed = executeDiscoverySessionReset(session, {
    scope: 'circle_planning',
    source: 'circle_planning_reset',
    actorRole: 'client',
    canManageCircle: true,
    confirmed: true,
  })

  assert.equal(denied.executed, false)
  assert.equal(needsConfirmation.requiresConfirmation, true)
  assert.equal(confirmed.executed, true)
  assert.deepEqual(confirmed.session.collaborativeState.shortlistItemIds, [])
  assert.deepEqual(confirmed.session.collaborativeState.voteIds, [])
  assert.equal(confirmed.session.collaborativeState.circleId, 'circle-1')
})

test('feature flags and kill switches resolve session capabilities without UI wiring', () => {
  const publicSession = createDiscoverySession({ id: 'session-6', role: 'public', now })

  assert.equal(
    getDiscoverySessionFeatureDecision(publicSession, 'active_filter_summary').enabled,
    true
  )
  assert.equal(
    getDiscoverySessionFeatureDecision(publicSession, 'active_filter_summary', {
      killSwitches: { active_filter_summary: true },
    }).enabled,
    false
  )
  assert.equal(
    getDiscoverySessionFeatureDecision(publicSession, 'data_freshness_dashboard').enabled,
    false
  )
  assert.equal(
    getDiscoverySessionFeatureDecision(publicSession, 'remy_tuning', { remyAvailable: false })
      .source,
    'dependency'
  )
})

test('session lifecycle expiry is deterministic from the session ttl', () => {
  const session = createDiscoverySession({
    id: 'session-7',
    role: 'public',
    now,
    ttlMinutes: 10,
  })
  const expired = expireDiscoverySession(session, new Date('2026-05-13T01:41:00.000Z'))

  assert.equal(session.lifecycle, 'active')
  assert.equal(expired.lifecycle, 'expired')
})
