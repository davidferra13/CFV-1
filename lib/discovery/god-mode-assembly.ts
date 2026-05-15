import type {
  GodModeResolvedItem,
  GodModeRailResult,
  GodModeStripResult,
  RailTier,
} from './god-mode-types'
import { TIER_ORDER, compareTiers } from './god-mode-types'

// ---------------------------------------------------------------------------
// Escalation
// ---------------------------------------------------------------------------

const TIER_ABOVE: Record<RailTier, RailTier> = {
  p0: 'p0', // Can't go higher
  p1: 'p0',
  p2: 'p1',
  p3: 'p2',
  p4: 'p3',
}

export function applyEscalation(item: GodModeResolvedItem, now: Date): GodModeResolvedItem {
  if (!item.escalatesAt) return item
  if (item.escalatesAt.getTime() > now.getTime()) return item
  return { ...item, tier: TIER_ABOVE[item.tier] }
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export function assembleGodModeRail(
  items: GodModeResolvedItem[],
  dismissedIds: Set<string>,
  now: Date
): GodModeRailResult {
  // 1. Filter dismissed
  const active = items.filter((item) => !dismissedIds.has(item.definitionId))

  // 2. Apply escalation
  const escalated = active.map((item) => applyEscalation(item, now))

  // 3. Filter expired
  const unexpired = escalated.filter((item) => {
    if (!item.expiresAt) return true
    return item.expiresAt.getTime() > now.getTime()
  })

  // 4. Group by tier
  const tiers: Record<RailTier, GodModeResolvedItem[]> = {
    p0: [],
    p1: [],
    p2: [],
    p3: [],
    p4: [],
  }

  for (const item of unexpired) {
    tiers[item.tier].push(item)
  }

  // 5. Sort within each tier by score descending (higher = more important)
  for (const tier of TIER_ORDER) {
    tiers[tier].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  }

  return {
    tiers,
    totalItems: unexpired.length,
    assembledAt: now.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Strip extraction (for compact bar)
// ---------------------------------------------------------------------------

export function extractStrip(
  items: GodModeResolvedItem[],
  now: Date,
  maxItems = 5
): GodModeStripResult {
  // Filter to P0 and P1 only
  const urgent = items.filter((item) => item.tier === 'p0' || item.tier === 'p1')

  // Sort: P0 first, then P1, then by score within tier
  urgent.sort((a, b) => {
    const tierDiff = compareTiers(a.tier, b.tier)
    if (tierDiff !== 0) return tierDiff
    return (b.score ?? 0) - (a.score ?? 0)
  })

  return {
    items: urgent.slice(0, maxItems),
    hasP0: urgent.some((item) => item.tier === 'p0'),
    totalUrgent: urgent.length,
  }
}
