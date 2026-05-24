import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// ---------------------------------------------------------------------------
// Imports: god-mode-assembly (dedup, escalation, scoring)
// ---------------------------------------------------------------------------

const {
  dedupeOperatingLoopItems,
  applyEscalation,
  getOperatingLoopScore,
  assembleGodModeRail,
} = require('../../lib/discovery/god-mode-assembly.ts')

// ---------------------------------------------------------------------------
// Imports: rail-item-scoring (tier assignment, time multiplier, night suppression)
// ---------------------------------------------------------------------------

const {
  assignTierFromScore,
  computeTimeMultiplier,
  isNightSuppressed,
  shouldForcePromoteToCritical,
  getCurrentTimeWindow,
} = require('../../lib/discovery/rail-item-scoring.ts')

// ---------------------------------------------------------------------------
// Imports: rail-item-types (density caps, tier thresholds)
// ---------------------------------------------------------------------------

const {
  DENSITY_CAPS,
  TIER_THRESHOLDS,
  RAIL_ITEM_TIER_ORDER,
} = require('../../lib/discovery/rail-item-types.ts')

// ---------------------------------------------------------------------------
// Inline: hasUnresolvedRailTemplate (from rail-tier-assigner.ts)
// Cannot import rail-tier-assigner.ts directly because it transitively
// imports React.cache via requireChef. The function is a pure regex check
// so we replicate its logic here for testability.
// ---------------------------------------------------------------------------

const UNRESOLVED_TEMPLATE_TOKEN = /\{[a-zA-Z0-9_]+\}/

function hasUnresolvedRailTemplate(item: {
  label: string
  context: string
  nextAction?: string | null
  inlineActions?: Array<{ label: string }> | null
}): boolean {
  const visibleValues = [
    item.label,
    item.context,
    item.nextAction ?? '',
    ...(item.inlineActions?.map((action) => action.label) ?? []),
  ]
  return visibleValues.some((value) => UNRESOLVED_TEMPLATE_TOKEN.test(value))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    definitionId: `test.item.${Math.random().toString(36).slice(2, 8)}`,
    tier: 'p2' as const,
    label: 'Test item',
    context: 'Some context',
    destination: '/test',
    score: 50,
    ...overrides,
  }
}

const NOW = new Date('2026-05-23T12:00:00Z')

/** Build a Date whose LOCAL hour equals the given value (avoids TZ issues). */
function dateAtLocalHour(hour: number): Date {
  return new Date(2026, 4, 23, hour, 0, 0, 0) // months are 0-indexed
}

// ===========================================================================
// hasUnresolvedRailTemplate
// ===========================================================================

test('hasUnresolvedRailTemplate: clean item returns false', () => {
  const item = makeItem({ label: 'Follow up with client', context: 'Overdue 3 days' })
  assert.equal(hasUnresolvedRailTemplate(item), false)
})

test('hasUnresolvedRailTemplate: template token in label returns true', () => {
  const item = makeItem({ label: '{clientName} needs attention' })
  assert.equal(hasUnresolvedRailTemplate(item), true)
})

test('hasUnresolvedRailTemplate: template token in context returns true', () => {
  const item = makeItem({ context: 'Event on {eventDate}' })
  assert.equal(hasUnresolvedRailTemplate(item), true)
})

test('hasUnresolvedRailTemplate: template token in nextAction returns true', () => {
  const item = makeItem({ nextAction: 'Send {documentType}' })
  assert.equal(hasUnresolvedRailTemplate(item), true)
})

test('hasUnresolvedRailTemplate: template token in inline action label returns true', () => {
  const item = makeItem({
    inlineActions: [{ label: 'Open {entityName}', action: 'nav', params: {}, variant: 'default' }],
  })
  assert.equal(hasUnresolvedRailTemplate(item), true)
})

test('hasUnresolvedRailTemplate: curly braces without alphanumeric content returns false', () => {
  const item = makeItem({ label: 'Revenue { } overview' })
  assert.equal(hasUnresolvedRailTemplate(item), false)
})

test('hasUnresolvedRailTemplate: null nextAction and no inlineActions returns false', () => {
  const item = makeItem({ nextAction: null, inlineActions: undefined })
  assert.equal(hasUnresolvedRailTemplate(item), false)
})

// ===========================================================================
// Tier assignment from score (assignTierFromScore)
// ===========================================================================

test('assignTierFromScore: score 100 -> critical', () => {
  assert.equal(assignTierFromScore(100), 'critical')
})

test('assignTierFromScore: score 80 -> critical (floor)', () => {
  assert.equal(assignTierFromScore(80), 'critical')
})

test('assignTierFromScore: score 79 -> action', () => {
  assert.equal(assignTierFromScore(79), 'action')
})

test('assignTierFromScore: score 50 -> action (floor)', () => {
  assert.equal(assignTierFromScore(50), 'action')
})

test('assignTierFromScore: score 49 -> awareness', () => {
  assert.equal(assignTierFromScore(49), 'awareness')
})

test('assignTierFromScore: score 20 -> awareness (floor)', () => {
  assert.equal(assignTierFromScore(20), 'awareness')
})

test('assignTierFromScore: score 19 -> opportunity', () => {
  assert.equal(assignTierFromScore(19), 'opportunity')
})

test('assignTierFromScore: score 0 -> opportunity', () => {
  assert.equal(assignTierFromScore(0), 'opportunity')
})

test('assignTierFromScore: negative score clamped to opportunity', () => {
  assert.equal(assignTierFromScore(-10), 'opportunity')
})

test('assignTierFromScore: score > 100 clamped to critical', () => {
  assert.equal(assignTierFromScore(150), 'critical')
})

// ===========================================================================
// Tier threshold consistency
// ===========================================================================

test('TIER_THRESHOLDS floor values align with assignTierFromScore', () => {
  for (const tier of RAIL_ITEM_TIER_ORDER) {
    const floor = TIER_THRESHOLDS[tier].floor
    assert.equal(assignTierFromScore(floor), tier, `floor ${floor} should map to ${tier}`)
  }
})

test('TIER_THRESHOLDS ceiling values map correctly', () => {
  assert.equal(assignTierFromScore(TIER_THRESHOLDS.critical.ceiling), 'critical')
  assert.equal(assignTierFromScore(TIER_THRESHOLDS.action.ceiling), 'action')
  assert.equal(assignTierFromScore(TIER_THRESHOLDS.awareness.ceiling), 'awareness')
  assert.equal(assignTierFromScore(TIER_THRESHOLDS.opportunity.ceiling), 'opportunity')
})

// ===========================================================================
// Deduplication (dedupeOperatingLoopItems)
// ===========================================================================

test('dedupeOperatingLoopItems: no duplicates, all items survive', () => {
  const items = [
    makeItem({ definitionId: 'a', destination: '/a', sourceKind: 'event', data: { eventId: '1' } }),
    makeItem({ definitionId: 'b', destination: '/b', sourceKind: 'event', data: { eventId: '2' } }),
  ]
  const result = dedupeOperatingLoopItems(items, NOW)
  assert.equal(result.length, 2)
})

test('dedupeOperatingLoopItems: same entity key keeps higher tier', () => {
  const items = [
    makeItem({
      definitionId: 'low',
      tier: 'p3',
      score: 20,
      sourceKind: 'event',
      data: { eventId: 'shared-123' },
    }),
    makeItem({
      definitionId: 'high',
      tier: 'p0',
      score: 90,
      sourceKind: 'event',
      data: { eventId: 'shared-123' },
    }),
  ]
  const result = dedupeOperatingLoopItems(items, NOW)
  assert.equal(result.length, 1)
  assert.equal(result[0].tier, 'p0')
})

test('dedupeOperatingLoopItems: same tier, higher score wins', () => {
  const items = [
    makeItem({
      definitionId: 'weak',
      tier: 'p1',
      score: 30,
      sourceKind: 'inquiry',
      data: { inquiryId: 'q-1' },
      loopState: 'stale',
    }),
    makeItem({
      definitionId: 'strong',
      tier: 'p1',
      score: 80,
      sourceKind: 'inquiry',
      data: { inquiryId: 'q-1' },
      loopState: 'blocked',
    }),
  ]
  const result = dedupeOperatingLoopItems(items, NOW)
  assert.equal(result.length, 1)
  const winner = result[0]
  assert.equal(winner.loopState, 'blocked')
})

test('dedupeOperatingLoopItems: merged item preserves context from loser if winner has none', () => {
  const items = [
    makeItem({
      definitionId: 'a',
      tier: 'p0',
      score: 90,
      sourceKind: 'event',
      data: { eventId: 'e-1' },
      context: '',
      nextAction: null,
    }),
    makeItem({
      definitionId: 'b',
      tier: 'p2',
      score: 40,
      sourceKind: 'event',
      data: { eventId: 'e-1' },
      context: 'Important detail from second resolver',
      nextAction: 'Send contract',
    }),
  ]
  const result = dedupeOperatingLoopItems(items, NOW)
  assert.equal(result.length, 1)
  assert.equal(result[0].context, 'Important detail from second resolver')
  assert.equal(result[0].nextAction, 'Send contract')
})

test('dedupeOperatingLoopItems: same sourceKind + same destination deduplicates', () => {
  const items = [
    makeItem({
      definitionId: 'a',
      tier: 'p2',
      score: 50,
      sourceKind: 'task',
      destination: '/events/123',
      data: {},
    }),
    makeItem({
      definitionId: 'b',
      tier: 'p1',
      score: 70,
      sourceKind: 'task',
      destination: '/events/123',
      data: {},
    }),
  ]
  const result = dedupeOperatingLoopItems(items, NOW)
  assert.equal(result.length, 1)
  assert.equal(result[0].tier, 'p1')
})

// ===========================================================================
// Escalation (applyEscalation)
// ===========================================================================

test('applyEscalation: no escalatesAt returns item unchanged', () => {
  const item = makeItem({ tier: 'p2' })
  const result = applyEscalation(item, NOW)
  assert.equal(result.tier, 'p2')
})

test('applyEscalation: escalatesAt in the future returns item unchanged', () => {
  const future = new Date(NOW.getTime() + 86_400_000)
  const item = makeItem({ tier: 'p2', escalatesAt: future })
  const result = applyEscalation(item, NOW)
  assert.equal(result.tier, 'p2')
})

test('applyEscalation: escalatesAt in the past promotes one tier', () => {
  const past = new Date(NOW.getTime() - 3_600_000)
  const item = makeItem({ tier: 'p2', escalatesAt: past })
  const result = applyEscalation(item, NOW)
  assert.equal(result.tier, 'p1')
})

test('applyEscalation: p0 stays p0 even after escalation', () => {
  const past = new Date(NOW.getTime() - 1000)
  const item = makeItem({ tier: 'p0', escalatesAt: past })
  const result = applyEscalation(item, NOW)
  assert.equal(result.tier, 'p0')
})

test('applyEscalation: p4 escalates to p3', () => {
  const past = new Date(NOW.getTime() - 1000)
  const item = makeItem({ tier: 'p4', escalatesAt: past })
  const result = applyEscalation(item, NOW)
  assert.equal(result.tier, 'p3')
})

// ===========================================================================
// Operating loop score (getOperatingLoopScore)
// ===========================================================================

test('getOperatingLoopScore: blocked item scores higher than stale item', () => {
  const blocked = makeItem({ score: 50, loopState: 'blocked' })
  const stale = makeItem({ score: 50, loopState: 'stale' })
  const blockedScore = getOperatingLoopScore(blocked, NOW)
  const staleScore = getOperatingLoopScore(stale, NOW)
  assert.ok(
    blockedScore > staleScore,
    `blocked (${blockedScore}) should beat stale (${staleScore})`
  )
})

test('getOperatingLoopScore: confirmed evidence scores higher than disputed', () => {
  const confirmed = makeItem({ score: 50, evidenceLabel: 'confirmed' })
  const disputed = makeItem({ score: 50, evidenceLabel: 'disputed' })
  assert.ok(getOperatingLoopScore(confirmed, NOW) > getOperatingLoopScore(disputed, NOW))
})

test('getOperatingLoopScore: inquiry sourceKind scores higher than system', () => {
  const inquiry = makeItem({ score: 50, sourceKind: 'inquiry' })
  const system = makeItem({ score: 50, sourceKind: 'system' })
  assert.ok(getOperatingLoopScore(inquiry, NOW) > getOperatingLoopScore(system, NOW))
})

test('getOperatingLoopScore: item with nextAction scores higher than without', () => {
  const withAction = makeItem({ score: 50, nextAction: 'Send contract' })
  const withoutAction = makeItem({ score: 50, nextAction: null })
  assert.ok(getOperatingLoopScore(withAction, NOW) > getOperatingLoopScore(withoutAction, NOW))
})

test('getOperatingLoopScore: overdue followUp boosts score', () => {
  const overdue = makeItem({
    score: 50,
    waitingOn: {
      kind: 'person',
      label: 'Client reply',
      followUpAt: new Date(NOW.getTime() - 3_600_000).toISOString(),
    },
  })
  const noFollowUp = makeItem({ score: 50, waitingOn: null })
  assert.ok(getOperatingLoopScore(overdue, NOW) > getOperatingLoopScore(noFollowUp, NOW))
})

test('getOperatingLoopScore: dismissed loopState produces strong penalty', () => {
  const dismissed = makeItem({ score: 50, loopState: 'dismissed' })
  const active = makeItem({ score: 50, loopState: 'active' })
  const dismissedScore = getOperatingLoopScore(dismissed, NOW)
  const activeScore = getOperatingLoopScore(active, NOW)
  assert.ok(activeScore > dismissedScore, 'active should beat dismissed')
  assert.ok(activeScore - dismissedScore >= 40)
})

// ===========================================================================
// assembleGodModeRail (full assembly of god-mode items)
// ===========================================================================

test('assembleGodModeRail: filters dismissed items', () => {
  const items = [
    makeItem({ definitionId: 'keep', tier: 'p1', score: 60 }),
    makeItem({ definitionId: 'dismiss', tier: 'p1', score: 70 }),
  ]
  const dismissed = new Set(['dismiss'])
  const result = assembleGodModeRail(items, dismissed, NOW)
  assert.equal(result.totalItems, 1)
  assert.equal(result.tiers.p1[0].definitionId, 'keep')
})

test('assembleGodModeRail: filters expired items', () => {
  const items = [
    makeItem({ definitionId: 'live', tier: 'p1', score: 60 }),
    makeItem({
      definitionId: 'expired',
      tier: 'p1',
      score: 80,
      expiresAt: new Date(NOW.getTime() - 1000),
    }),
  ]
  const result = assembleGodModeRail(items, new Set(), NOW)
  assert.equal(result.totalItems, 1)
  assert.equal(result.tiers.p1[0].definitionId, 'live')
})

test('assembleGodModeRail: sorts items within tier by score descending', () => {
  const items = [
    makeItem({ definitionId: 'low', tier: 'p1', score: 30, loopState: 'stale' }),
    makeItem({ definitionId: 'high', tier: 'p1', score: 70, loopState: 'blocked' }),
    makeItem({ definitionId: 'mid', tier: 'p1', score: 50, loopState: 'active' }),
  ]
  const result = assembleGodModeRail(items, new Set(), NOW)
  const p1Ids = result.tiers.p1.map((i: { definitionId: string }) => i.definitionId)
  assert.equal(p1Ids[0], 'high')
  assert.equal(p1Ids[p1Ids.length - 1], 'low')
})

test('assembleGodModeRail: groups items into correct tiers', () => {
  const items = [
    makeItem({ definitionId: 'a', tier: 'p0', score: 90 }),
    makeItem({ definitionId: 'b', tier: 'p2', score: 40 }),
    makeItem({ definitionId: 'c', tier: 'p4', score: 10 }),
  ]
  const result = assembleGodModeRail(items, new Set(), NOW)
  assert.equal(result.tiers.p0.length, 1)
  assert.equal(result.tiers.p2.length, 1)
  assert.equal(result.tiers.p4.length, 1)
  assert.equal(result.tiers.p1.length, 0)
  assert.equal(result.tiers.p3.length, 0)
})

// ===========================================================================
// Time-of-day multiplier (computeTimeMultiplier)
// These pass string window names directly, no Date/TZ sensitivity.
// ===========================================================================

test('computeTimeMultiplier: morning boosts critical/action by 1.2x', () => {
  assert.equal(computeTimeMultiplier('critical', 'morning'), 1.2)
  assert.equal(computeTimeMultiplier('action', 'morning'), 1.2)
})

test('computeTimeMultiplier: morning leaves awareness/opportunity at 1.0x', () => {
  assert.equal(computeTimeMultiplier('awareness', 'morning'), 1.0)
  assert.equal(computeTimeMultiplier('opportunity', 'morning'), 1.0)
})

test('computeTimeMultiplier: evening dampens awareness/opportunity to 0.7x', () => {
  assert.equal(computeTimeMultiplier('awareness', 'evening'), 0.7)
  assert.equal(computeTimeMultiplier('opportunity', 'evening'), 0.7)
})

test('computeTimeMultiplier: night suppresses awareness/opportunity to 0.0x', () => {
  assert.equal(computeTimeMultiplier('awareness', 'night'), 0.0)
  assert.equal(computeTimeMultiplier('opportunity', 'night'), 0.0)
})

test('computeTimeMultiplier: active hours are neutral (1.0x) for all tiers', () => {
  for (const tier of RAIL_ITEM_TIER_ORDER) {
    assert.equal(computeTimeMultiplier(tier, 'active'), 1.0, `${tier} should be 1.0 during active`)
  }
})

// ===========================================================================
// Night suppression (isNightSuppressed)
// getCurrentTimeWindow uses getHours() (local time), so we construct dates
// with specific local hours via dateAtLocalHour to avoid TZ drift.
// ===========================================================================

test('isNightSuppressed: critical is never suppressed at night', () => {
  assert.equal(isNightSuppressed('critical', dateAtLocalHour(23)), false)
})

test('isNightSuppressed: action is suppressed at night', () => {
  assert.equal(isNightSuppressed('action', dateAtLocalHour(23)), true)
})

test('isNightSuppressed: awareness is suppressed at night', () => {
  assert.equal(isNightSuppressed('awareness', dateAtLocalHour(23)), true)
})

test('isNightSuppressed: opportunity is suppressed at night', () => {
  assert.equal(isNightSuppressed('opportunity', dateAtLocalHour(23)), true)
})

test('isNightSuppressed: nothing suppressed during daytime', () => {
  for (const tier of RAIL_ITEM_TIER_ORDER) {
    assert.equal(
      isNightSuppressed(tier, dateAtLocalHour(14)),
      false,
      `${tier} should not suppress at 2pm`
    )
  }
})

// ===========================================================================
// getCurrentTimeWindow
// ===========================================================================

test('getCurrentTimeWindow: 3am local -> night', () => {
  assert.equal(getCurrentTimeWindow(dateAtLocalHour(3)), 'night')
})

test('getCurrentTimeWindow: 7am local -> morning', () => {
  assert.equal(getCurrentTimeWindow(dateAtLocalHour(7)), 'morning')
})

test('getCurrentTimeWindow: 12pm local -> active', () => {
  assert.equal(getCurrentTimeWindow(dateAtLocalHour(12)), 'active')
})

test('getCurrentTimeWindow: 8pm local -> evening', () => {
  assert.equal(getCurrentTimeWindow(dateAtLocalHour(20)), 'evening')
})

test('getCurrentTimeWindow: 10pm local -> night (wraps)', () => {
  assert.equal(getCurrentTimeWindow(dateAtLocalHour(22)), 'night')
})

// ===========================================================================
// shouldForcePromoteToCritical
// ===========================================================================

test('shouldForcePromoteToCritical: no expiresAt returns false', () => {
  assert.equal(shouldForcePromoteToCritical(undefined, NOW), false)
})

test('shouldForcePromoteToCritical: expires in 1 hour returns true', () => {
  const oneHourOut = new Date(NOW.getTime() + 3_600_000)
  assert.equal(shouldForcePromoteToCritical(oneHourOut, NOW), true)
})

test('shouldForcePromoteToCritical: expires in 3 hours returns false', () => {
  const threeHoursOut = new Date(NOW.getTime() + 3 * 3_600_000)
  assert.equal(shouldForcePromoteToCritical(threeHoursOut, NOW), false)
})

test('shouldForcePromoteToCritical: already expired returns false', () => {
  const past = new Date(NOW.getTime() - 1000)
  assert.equal(shouldForcePromoteToCritical(past, NOW), false)
})

test('shouldForcePromoteToCritical: exactly 2 hours out is boundary (true)', () => {
  const twoHours = new Date(NOW.getTime() + 2 * 3_600_000)
  assert.equal(shouldForcePromoteToCritical(twoHours, NOW), true)
})

// ===========================================================================
// Density caps (DENSITY_CAPS)
// ===========================================================================

test('DENSITY_CAPS: critical has the smallest cap', () => {
  assert.equal(DENSITY_CAPS.critical.maxVisible, 3)
})

test('DENSITY_CAPS: action allows more items than critical', () => {
  assert.ok(DENSITY_CAPS.action.maxVisible > DENSITY_CAPS.critical.maxVisible)
})

test('DENSITY_CAPS: awareness allows the most items', () => {
  assert.ok(DENSITY_CAPS.awareness.maxVisible >= DENSITY_CAPS.action.maxVisible)
  assert.ok(DENSITY_CAPS.awareness.maxVisible >= DENSITY_CAPS.opportunity.maxVisible)
})

test('DENSITY_CAPS: density cap truncation simulation', () => {
  const items = Array.from({ length: 20 }, (_, i) =>
    makeItem({ definitionId: `item-${i}`, score: 90 - i })
  )
  const cap = DENSITY_CAPS.critical.maxVisible
  const sliced = items.slice(0, cap)
  assert.equal(sliced.length, cap)
  assert.equal(sliced.length, 3)
})

// ===========================================================================
// Scoring relative ordering: compound scenarios
// ===========================================================================

test('getOperatingLoopScore: blocked + confirmed + inquiry = highest relative score', () => {
  const best = makeItem({
    score: 50,
    loopState: 'blocked',
    evidenceLabel: 'confirmed',
    sourceKind: 'inquiry',
    nextAction: 'Reply urgently',
    proofHref: '/proof',
  })
  const worst = makeItem({
    score: 50,
    loopState: 'dismissed',
    evidenceLabel: 'disputed',
    sourceKind: 'system',
    nextAction: null,
    proofHref: null,
  })
  const bestScore = getOperatingLoopScore(best, NOW)
  const worstScore = getOperatingLoopScore(worst, NOW)
  assert.ok(
    bestScore > worstScore + 50,
    `best (${bestScore}) should dominate worst (${worstScore})`
  )
})

test('getOperatingLoopScore: confidence multiplier adds proportional bonus', () => {
  const highConf = makeItem({ score: 50, confidence: 1.0 })
  const lowConf = makeItem({ score: 50, confidence: 0.1 })
  const noConf = makeItem({ score: 50, confidence: null })
  const highScore = getOperatingLoopScore(highConf, NOW)
  const lowScore = getOperatingLoopScore(lowConf, NOW)
  const noScore = getOperatingLoopScore(noConf, NOW)
  assert.ok(highScore > lowScore, 'high confidence should score higher')
  assert.ok(lowScore > noScore || lowScore === noScore, 'low confidence >= no confidence')
})

// ===========================================================================
// Integration: dedup + escalation + assembly pipeline
// ===========================================================================

test('pipeline: escalated item appears in correct tier after dedup', () => {
  const past = new Date(NOW.getTime() - 1000)
  const items = [
    makeItem({
      definitionId: 'escalatable',
      tier: 'p3',
      score: 30,
      escalatesAt: past,
      sourceKind: 'event',
      data: { eventId: 'e-99' },
    }),
  ]
  const result = assembleGodModeRail(items, new Set(), NOW)
  assert.equal(result.tiers.p3.length, 0)
  assert.equal(result.tiers.p2.length, 1)
  assert.equal(result.tiers.p2[0].definitionId, 'escalatable')
})

test('pipeline: dismissed + expired + live items produce correct counts', () => {
  const items = [
    makeItem({ definitionId: 'live-1', tier: 'p1', score: 60 }),
    makeItem({ definitionId: 'live-2', tier: 'p0', score: 90 }),
    makeItem({ definitionId: 'dismissed', tier: 'p0', score: 95 }),
    makeItem({
      definitionId: 'expired',
      tier: 'p1',
      score: 70,
      expiresAt: new Date(NOW.getTime() - 1000),
    }),
  ]
  const result = assembleGodModeRail(items, new Set(['dismissed']), NOW)
  assert.equal(result.totalItems, 2)
  assert.equal(result.tiers.p0.length, 1)
  assert.equal(result.tiers.p1.length, 1)
})
