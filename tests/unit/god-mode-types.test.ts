import test from 'node:test'
import assert from 'node:assert/strict'
import type {
  RailTier,
  GodModeResolvedItem,
  InlineAction,
  GodModeResolverContext,
  GodModeRailResult,
} from '@/lib/discovery/god-mode-types'
import {
  TIER_ORDER,
  TIER_CONFIG,
  compareTiers,
  isExpandedByDefault,
} from '@/lib/discovery/god-mode-types'

test('TIER_ORDER sorts P0 before P4', () => {
  assert.deepEqual(TIER_ORDER, ['p0', 'p1', 'p2', 'p3', 'p4'])
})

test('TIER_CONFIG has correct names', () => {
  assert.equal(TIER_CONFIG.p0.name, 'Act Now')
  assert.equal(TIER_CONFIG.p1.name, 'Today')
  assert.equal(TIER_CONFIG.p2.name, 'This Week')
  assert.equal(TIER_CONFIG.p3.name, 'On Your Radar')
  assert.equal(TIER_CONFIG.p4.name, 'Ambient')
})

test('TIER_CONFIG has correct colors', () => {
  assert.equal(TIER_CONFIG.p0.color, 'red')
  assert.equal(TIER_CONFIG.p1.color, 'amber')
  assert.equal(TIER_CONFIG.p2.color, 'blue')
  assert.equal(TIER_CONFIG.p3.color, 'gray')
  assert.equal(TIER_CONFIG.p4.color, 'dim')
})

test('P0 and P1 are always expanded', () => {
  assert.equal(TIER_CONFIG.p0.alwaysExpanded, true)
  assert.equal(TIER_CONFIG.p1.alwaysExpanded, true)
  assert.equal(TIER_CONFIG.p2.alwaysExpanded, false)
  assert.equal(TIER_CONFIG.p3.alwaysExpanded, false)
  assert.equal(TIER_CONFIG.p4.alwaysExpanded, false)
})

test('compareTiers sorts P0 before P1', () => {
  assert.ok(compareTiers('p0', 'p1') < 0)
  assert.ok(compareTiers('p4', 'p0') > 0)
  assert.equal(compareTiers('p2', 'p2'), 0)
})

test('isExpandedByDefault matches alwaysExpanded + P2', () => {
  assert.equal(isExpandedByDefault('p0'), true)
  assert.equal(isExpandedByDefault('p1'), true)
  assert.equal(isExpandedByDefault('p2'), true)
  assert.equal(isExpandedByDefault('p3'), false)
  assert.equal(isExpandedByDefault('p4'), false)
})
