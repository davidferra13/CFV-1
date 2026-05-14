import assert from 'node:assert/strict'
import test from 'node:test'

import { classifyDiscoveryFreshness } from '@/lib/discovery/data-freshness'
import { evaluateDiscoverySourceUse } from '@/lib/discovery/source-policy'

test('source policy allows fresh attributed direct website metadata claims', () => {
  const result = evaluateDiscoverySourceUse({
    sourceType: 'direct_operator_website',
    intendedUse: 'public_claim',
    hasAttribution: true,
    isFresh: true,
  })

  assert.equal(result.allowed, true)
  assert.equal(result.state, 'eligible')
})

test('source policy blocks copied provider menu content without operator rights', () => {
  const result = evaluateDiscoverySourceUse({
    sourceType: 'yelp',
    intendedUse: 'full_content',
    hasAttribution: true,
    isFresh: true,
    isOperatorControlled: false,
  })

  assert.equal(result.allowed, false)
  assert.equal(result.state, 'suppressed')
  assert.match(result.reasons.join(' '), /does not allow full_content/)
})

test('private ChefFlow data fails closed for public discovery', () => {
  const result = evaluateDiscoverySourceUse({
    sourceType: 'chef_flow_private',
    intendedUse: 'public_metadata',
  })

  assert.equal(result.allowed, false)
  assert.equal(result.state, 'suppressed')
})

test('freshness SLA classifies boundary states for menu data', () => {
  const currentAt = '2026-05-13T12:00:00.000Z'

  assert.equal(
    classifyDiscoveryFreshness({
      dataClass: 'menu',
      checkedAt: '2026-05-12T12:00:00.000Z',
      currentAt,
    }).state,
    'fresh'
  )

  assert.equal(
    classifyDiscoveryFreshness({
      dataClass: 'menu',
      checkedAt: '2026-05-07T12:00:00.000Z',
      currentAt,
    }).state,
    'aging'
  )

  assert.equal(
    classifyDiscoveryFreshness({
      dataClass: 'menu',
      checkedAt: '2026-04-01T12:00:00.000Z',
      currentAt,
    }).state,
    'stale'
  )
})

test('event freshness invalidates cancelled or elapsed events', () => {
  assert.equal(
    classifyDiscoveryFreshness({
      dataClass: 'event_status',
      eventStatus: 'cancelled',
      currentAt: '2026-05-13T12:00:00.000Z',
      checkedAt: '2026-05-13T11:00:00.000Z',
    }).state,
    'invalid'
  )

  assert.equal(
    classifyDiscoveryFreshness({
      dataClass: 'event_status',
      eventEndsAt: '2026-05-12T12:00:00.000Z',
      currentAt: '2026-05-13T12:00:00.000Z',
    }).state,
    'invalid'
  )
})
