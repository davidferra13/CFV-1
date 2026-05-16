/**
 * Rail Item Aggregator
 *
 * Collects RailItems from all sources, scores them, applies density caps,
 * enforces lifecycle state transitions, and produces a tiered result.
 *
 * Integrates with rail-tier-assigner by accepting GodModeResolvedItems
 * and converting them to RailItems for unified scoring.
 */

import type {
  RailItem,
  RailItemTier,
  RailItemState,
  RailItemSource,
  RailItemScoringInput,
  RailItemScoreBreakdown,
  CrossRailSignal,
} from './rail-item-types'
import { DENSITY_CAPS, RAIL_ITEM_TIER_ORDER, VALID_TRANSITIONS } from './rail-item-types'
import {
  scoreRailItem,
  assignTierFromScore,
  detectTierMovement,
  isNightSuppressed,
  shouldForcePromoteToCritical,
} from './rail-item-scoring'
import type { GodModeResolvedItem } from './god-mode-types'
import type { UnifiedTier } from './rail-tier-assigner'

// ---------------------------------------------------------------------------
// Aggregated result
// ---------------------------------------------------------------------------

export interface RailItemAggregateResult {
  tiers: Record<RailItemTier, ScoredRailItem[]>
  overflow: Record<RailItemTier, number>
  totalItems: number
  suppressedByNight: number
  assembledAt: string
}

export interface ScoredRailItem {
  item: RailItem
  breakdown: RailItemScoreBreakdown
}

// ---------------------------------------------------------------------------
// State transition validation
// ---------------------------------------------------------------------------

export function isValidTransition(from: RailItemState, to: RailItemState): boolean {
  return VALID_TRANSITIONS.some((t) => t.from === from && t.to === to)
}

export function transitionItem(item: RailItem, to: RailItemState, now: Date): RailItem {
  if (!isValidTransition(item.state, to)) {
    return item // invalid transition, return unchanged
  }

  const updated = { ...item, state: to }

  switch (to) {
    case 'seen':
      updated.seenAt = now
      break
    case 'acted':
      updated.actedAt = now
      break
    case 'resolved':
      updated.resolvedAt = now
      break
    case 'snoozed':
      // Default snooze: 1 hour
      updated.snoozedUntil = new Date(now.getTime() + 60 * 60_000)
      break
    case 'surfaced':
      // Re-surfacing from snooze
      updated.surfacedAt = now
      updated.snoozedUntil = undefined
      break
  }

  return updated
}

// ---------------------------------------------------------------------------
// Lifecycle enforcement: expire items past TTL or expiresAt
// ---------------------------------------------------------------------------

export function enforceLifecycle(items: RailItem[], now: Date): RailItem[] {
  return items.map((item) => {
    // Skip already terminal states
    if (item.state === 'archived' || item.state === 'expired' || item.state === 'resolved') {
      return item
    }

    // Check hard TTL (expiresAt)
    if (item.expiresAt && item.expiresAt.getTime() <= now.getTime()) {
      return { ...item, state: 'expired' as RailItemState }
    }

    // Check snooze expiry (re-surface)
    if (item.state === 'snoozed' && item.snoozedUntil) {
      if (item.snoozedUntil.getTime() <= now.getTime()) {
        return {
          ...item,
          state: 'surfaced' as RailItemState,
          surfacedAt: now,
          snoozedUntil: undefined,
        }
      }
    }

    return item
  })
}

// ---------------------------------------------------------------------------
// Filter out non-visible states
// ---------------------------------------------------------------------------

function isVisibleState(state: RailItemState): boolean {
  return state === 'surfaced' || state === 'seen' || state === 'acted'
}

// ---------------------------------------------------------------------------
// Density cap enforcement
// ---------------------------------------------------------------------------

function applyDensityCaps(tiers: Record<RailItemTier, ScoredRailItem[]>): {
  capped: Record<RailItemTier, ScoredRailItem[]>
  overflow: Record<RailItemTier, number>
} {
  const capped: Record<RailItemTier, ScoredRailItem[]> = {
    critical: [],
    action: [],
    awareness: [],
    opportunity: [],
  }
  const overflow: Record<RailItemTier, number> = {
    critical: 0,
    action: 0,
    awareness: 0,
    opportunity: 0,
  }

  for (const tier of RAIL_ITEM_TIER_ORDER) {
    const cap = DENSITY_CAPS[tier].maxVisible
    const items = tiers[tier]
    capped[tier] = items.slice(0, cap)
    overflow[tier] = Math.max(0, items.length - cap)
  }

  return { capped, overflow }
}

// ---------------------------------------------------------------------------
// Source-type density: prevent one source from flooding a tier
// ---------------------------------------------------------------------------

function enforceSourceDiversity(items: ScoredRailItem[], maxPerSource: number): ScoredRailItem[] {
  const sourceCounts = new Map<RailItemSource, number>()
  const result: ScoredRailItem[] = []

  for (const scored of items) {
    const source = scored.item.source
    const count = sourceCounts.get(source) ?? 0
    if (count < maxPerSource) {
      result.push(scored)
      sourceCounts.set(source, count + 1)
    }
  }

  return result
}

// Max items from a single source within one tier
const MAX_PER_SOURCE_IN_TIER: Record<RailItemTier, number> = {
  critical: 2,
  action: 4,
  awareness: 6,
  opportunity: 3,
}

// ---------------------------------------------------------------------------
// Convert GodModeResolvedItem to RailItem for unified scoring
// ---------------------------------------------------------------------------

function godModeTierToSource(sourceKind?: string): RailItemSource {
  switch (sourceKind) {
    case 'event':
      return 'event_fsm'
    case 'inquiry':
    case 'message':
      return 'communication'
    case 'payment':
    case 'invoice':
      return 'finance'
    case 'task':
    case 'handoff':
      return 'lifecycle'
    default:
      return 'cil'
  }
}

export function adaptGodModeItemToRailItem(
  item: GodModeResolvedItem,
  tenantId: string,
  now: Date
): RailItem {
  const score = item.score ?? 50

  return {
    id: item.definitionId,
    tenantId,
    source: godModeTierToSource(item.sourceKind),
    tier: assignTierFromScore(score),
    state: 'surfaced',
    score,
    title: item.label,
    subtitle: item.context || undefined,
    actionUrl: item.destination || undefined,
    createdAt: now,
    surfacedAt: now,
    expiresAt: item.expiresAt ?? undefined,
    ttlMinutes: item.expiresAt
      ? Math.max(0, (item.expiresAt.getTime() - now.getTime()) / 60_000)
      : 7 * 24 * 60, // default 7-day TTL
    metadata: item.data ?? {},
  }
}

// ---------------------------------------------------------------------------
// Cross-rail signal conversion
// ---------------------------------------------------------------------------

export function crossRailSignalToRailItem(
  signal: CrossRailSignal,
  tenantId: string,
  now: Date
): RailItem {
  return {
    id: `discovery-signal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tenantId,
    source: 'discovery',
    tier: 'opportunity', // always Opportunity per spec
    state: 'surfaced',
    score: Math.max(10, Math.min(19, signal.baseScore)), // clamp to 10-19
    title: signal.dashboardTitle,
    subtitle: signal.dashboardSubtitle,
    ttlMinutes: 24 * 60, // 24-hour TTL for discovery signals
    createdAt: now,
    surfacedAt: now,
    metadata: signal.metadata,
  }
}

// ---------------------------------------------------------------------------
// Main aggregation function
// ---------------------------------------------------------------------------

export function aggregateRailItems(items: RailItem[], now: Date): RailItemAggregateResult {
  // 1. Enforce lifecycle (expire stale, re-surface snoozed)
  const lifecycled = enforceLifecycle(items, now)

  // 2. Filter to visible states only
  const visible = lifecycled.filter((item) => isVisibleState(item.state))

  // 3. Score each item
  const scored: ScoredRailItem[] = visible.map((item) => {
    const input: RailItemScoringInput = {
      baseScore: item.score,
      expiresAt: item.expiresAt,
      ttlMinutes: item.ttlMinutes,
      interactionCount: item.actedAt ? 1 : item.seenAt ? 1 : 0,
      dismissCount: 0,
      source: item.source,
    }
    const breakdown = scoreRailItem(input, item.surfacedAt, now)
    return { item: { ...item, score: breakdown.finalScore, tier: breakdown.tier }, breakdown }
  })

  // 4. Apply tier promotion/demotion and track movement
  for (const s of scored) {
    const movement = detectTierMovement(s.item.tier, s.breakdown.tier)
    if (movement.promoted) {
      s.item.promotedFrom = s.item.tier
    } else if (movement.demoted) {
      s.item.demotedFrom = s.item.tier
    }
    s.item.tier = s.breakdown.tier

    // Force-promote to critical if expiring within 2 hours
    if (shouldForcePromoteToCritical(s.item.expiresAt, now)) {
      if (s.item.tier !== 'critical') {
        s.item.promotedFrom = s.item.tier
        s.item.tier = 'critical'
      }
    }
  }

  // 5. Suppress non-critical at night
  let suppressedByNight = 0
  const afterNight = scored.filter((s) => {
    if (isNightSuppressed(s.item.tier, now)) {
      suppressedByNight++
      return false
    }
    return true
  })

  // 6. Sort by score descending
  afterNight.sort((a, b) => b.breakdown.finalScore - a.breakdown.finalScore)

  // 7. Distribute to tiers
  const tiers: Record<RailItemTier, ScoredRailItem[]> = {
    critical: [],
    action: [],
    awareness: [],
    opportunity: [],
  }

  for (const s of afterNight) {
    tiers[s.item.tier].push(s)
  }

  // 8. Enforce source diversity within each tier
  for (const tier of RAIL_ITEM_TIER_ORDER) {
    tiers[tier] = enforceSourceDiversity(tiers[tier], MAX_PER_SOURCE_IN_TIER[tier])
  }

  // 9. Apply density caps
  const { capped, overflow } = applyDensityCaps(tiers)

  const totalItems = RAIL_ITEM_TIER_ORDER.reduce((sum, tier) => sum + capped[tier].length, 0)

  return {
    tiers: capped,
    overflow,
    totalItems,
    suppressedByNight,
    assembledAt: now.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Integration bridge: convert TieredRailResult items through lifecycle scoring
// ---------------------------------------------------------------------------

export function rescoredTieredItems(
  godModeItems: GodModeResolvedItem[],
  tenantId: string,
  now: Date
): RailItemAggregateResult {
  const railItems = godModeItems.map((item) => adaptGodModeItemToRailItem(item, tenantId, now))
  return aggregateRailItems(railItems, now)
}
