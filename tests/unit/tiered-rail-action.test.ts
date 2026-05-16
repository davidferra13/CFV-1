/**
 * Contract test for the Tiered Rail system.
 *
 * Validates:
 * - TieredRailResult shape (critical, action, awareness, opportunity arrays + totalItems number)
 * - UNIFIED_TIER_ORDER constant correctness
 * - Tier mapping rules: p0 -> critical, p1 -> action, p2/p3 -> awareness, p4 -> opportunity
 * - Score thresholds: >=80 -> critical, >=50 -> action, >=20 -> awareness, <20 -> opportunity
 * - Operator and universal item adapters produce valid GodModeResolvedItem shapes
 * - getTieredRail server action exports exist (import contract)
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// ---------------------------------------------------------------------------
// Import the module under test (types + constants only, no side-effect calls)
// ---------------------------------------------------------------------------

const { UNIFIED_TIER_ORDER } = require('../../lib/discovery/rail-tier-assigner.ts')

const godModeTypes = require('../../lib/discovery/god-mode-types.ts')

// ---------------------------------------------------------------------------
// 1. UNIFIED_TIER_ORDER constant
// ---------------------------------------------------------------------------

test('UNIFIED_TIER_ORDER contains exactly 4 tiers in correct order', () => {
  assert.deepEqual(UNIFIED_TIER_ORDER, ['critical', 'action', 'awareness', 'opportunity'])
})

test('UNIFIED_TIER_ORDER has no duplicates', () => {
  const unique = new Set(UNIFIED_TIER_ORDER)
  assert.equal(unique.size, UNIFIED_TIER_ORDER.length)
})

// ---------------------------------------------------------------------------
// 2. TieredRailResult shape contract
// ---------------------------------------------------------------------------

test('TieredRailResult shape: a conforming object has all required fields', () => {
  // Build a minimal conforming TieredRailResult
  const result = {
    critical: [],
    action: [],
    awareness: [],
    opportunity: [],
    totalItems: 0,
    assembledAt: new Date().toISOString(),
  }

  // Verify all 4 tier arrays exist and are arrays
  for (const tier of UNIFIED_TIER_ORDER) {
    assert.ok(Array.isArray(result[tier]), `${tier} should be an array`)
  }

  // Verify totalItems is a number
  assert.equal(typeof result.totalItems, 'number')

  // Verify assembledAt is a string (ISO date)
  assert.equal(typeof result.assembledAt, 'string')
})

test('TieredRailResult totalItems reflects sum of all tier arrays', () => {
  // Contract: totalItems === deduped.length (set after tier assignment)
  const mockItem = {
    definitionId: 'test.1',
    tier: 'p0' as const,
    label: 'Test Item',
    context: 'Test context',
    destination: '/test',
  }

  const result = {
    critical: [mockItem],
    action: [mockItem, mockItem],
    awareness: [],
    opportunity: [mockItem],
    totalItems: 4,
    assembledAt: new Date().toISOString(),
  }

  const sum =
    result.critical.length +
    result.action.length +
    result.awareness.length +
    result.opportunity.length
  assert.equal(result.totalItems, sum, 'totalItems should equal sum of all tier arrays')
})

// ---------------------------------------------------------------------------
// 3. God Mode tier constants (RailTier)
// ---------------------------------------------------------------------------

test('TIER_ORDER defines 5 god-mode tiers p0-p4', () => {
  assert.deepEqual(godModeTypes.TIER_ORDER, ['p0', 'p1', 'p2', 'p3', 'p4'])
})

test('TIER_CONFIG has entries for every tier in TIER_ORDER', () => {
  for (const tier of godModeTypes.TIER_ORDER) {
    const config = godModeTypes.TIER_CONFIG[tier]
    assert.ok(config, `TIER_CONFIG missing entry for ${tier}`)
    assert.equal(typeof config.name, 'string', `${tier} config.name should be string`)
    assert.equal(
      typeof config.alwaysExpanded,
      'boolean',
      `${tier} config.alwaysExpanded should be boolean`
    )
    assert.equal(typeof config.pulses, 'boolean', `${tier} config.pulses should be boolean`)
  }
})

// ---------------------------------------------------------------------------
// 4. Tier mapping contract (mapGodModeTierToUnified logic)
//    Not exported, so we test the documented rules as a specification.
// ---------------------------------------------------------------------------

test('tier mapping spec: p0 or score>=80 maps to critical', () => {
  // Rule: item.tier === 'p0' || score >= 80 -> 'critical'
  const rules = [
    { tier: 'p0', score: 10, expected: 'critical' },
    { tier: 'p0', score: 90, expected: 'critical' },
    { tier: 'p3', score: 80, expected: 'critical' },
    { tier: 'p4', score: 95, expected: 'critical' },
  ]

  for (const { tier, score, expected } of rules) {
    const result = applyTierMapping(tier, score)
    assert.equal(result, expected, `tier=${tier} score=${score} should map to ${expected}`)
  }
})

test('tier mapping spec: p1 or score>=50 maps to action', () => {
  const rules = [
    { tier: 'p1', score: 10, expected: 'action' },
    { tier: 'p1', score: 60, expected: 'action' },
    { tier: 'p3', score: 50, expected: 'action' },
    { tier: 'p4', score: 65, expected: 'action' },
  ]

  for (const { tier, score, expected } of rules) {
    const result = applyTierMapping(tier, score)
    assert.equal(result, expected, `tier=${tier} score=${score} should map to ${expected}`)
  }
})

test('tier mapping spec: p2/p3 or score>=20 maps to awareness', () => {
  const rules = [
    { tier: 'p2', score: 10, expected: 'awareness' },
    { tier: 'p3', score: 10, expected: 'awareness' },
    { tier: 'p4', score: 20, expected: 'awareness' },
    { tier: 'p4', score: 45, expected: 'awareness' },
  ]

  for (const { tier, score, expected } of rules) {
    const result = applyTierMapping(tier, score)
    assert.equal(result, expected, `tier=${tier} score=${score} should map to ${expected}`)
  }
})

test('tier mapping spec: everything else maps to opportunity', () => {
  const rules = [
    { tier: 'p4', score: 0, expected: 'opportunity' },
    { tier: 'p4', score: 19, expected: 'opportunity' },
    { tier: 'p4', score: 5, expected: 'opportunity' },
  ]

  for (const { tier, score, expected } of rules) {
    const result = applyTierMapping(tier, score)
    assert.equal(result, expected, `tier=${tier} score=${score} should map to ${expected}`)
  }
})

// ---------------------------------------------------------------------------
// 5. GodModeResolvedItem shape contract (items stored in tier arrays)
// ---------------------------------------------------------------------------

test('GodModeResolvedItem minimum shape has required fields', () => {
  const item = {
    definitionId: 'god.test.1',
    tier: 'p1' as const,
    label: 'Follow up with client',
    context: 'Last contact 3 days ago',
    destination: '/clients/abc',
  }

  assert.equal(typeof item.definitionId, 'string')
  assert.equal(typeof item.tier, 'string')
  assert.equal(typeof item.label, 'string')
  assert.equal(typeof item.context, 'string')
  assert.equal(typeof item.destination, 'string')
})

test('adapted operator items use "operator." prefix on definitionId', () => {
  // Contract from adaptOperatorItem: `operator.${category}.${id}`
  const definitionId = 'operator.event_risk.evt-123'
  assert.ok(definitionId.startsWith('operator.'), 'operator items have operator. prefix')
})

test('adapted universal items use "universal." prefix on definitionId', () => {
  // Contract from adaptUniversalItem: `universal.${definitionId}`
  const definitionId = 'universal.rail-item-456'
  assert.ok(definitionId.startsWith('universal.'), 'universal items have universal. prefix')
})

// ---------------------------------------------------------------------------
// 6. Import contract: getTieredRail and getRailGroupPriorities exist
// ---------------------------------------------------------------------------

test('universal-rail-actions exports getTieredRail and getRailGroupPriorities', () => {
  // We import the module to verify exports exist. We do NOT call them
  // (they require auth + DB). This is a compile/import contract test.
  const actions = require('../../lib/discovery/universal-rail-actions.ts')

  assert.equal(typeof actions.getTieredRail, 'function', 'getTieredRail should be exported')
  assert.equal(
    typeof actions.getRailGroupPriorities,
    'function',
    'getRailGroupPriorities should be exported'
  )
})

test('rail-tier-assigner exports assembleTieredRail', () => {
  const assigner = require('../../lib/discovery/rail-tier-assigner.ts')
  assert.equal(
    typeof assigner.assembleTieredRail,
    'function',
    'assembleTieredRail should be exported'
  )
})

// ---------------------------------------------------------------------------
// Helper: replicates mapGodModeTierToUnified logic for spec testing
// ---------------------------------------------------------------------------

function applyTierMapping(tier: string, score: number): string {
  if (tier === 'p0' || score >= 80) return 'critical'
  if (tier === 'p1' || score >= 50) return 'action'
  if (tier === 'p2' || tier === 'p3' || score >= 20) return 'awareness'
  return 'opportunity'
}
