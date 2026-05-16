// Rail Item Lifecycle Engine: pure scoring functions (no DB, no side effects)

import {
  type RailItem,
  type RailTier,
  type ScoringFactors,
  type TieredResult,
  TIER_THRESHOLDS,
  DENSITY_CAPS,
  QUIET_HOURS,
  BUSINESS_HOURS,
  EVENING,
  RAIL_TIER_ORDER,
} from './types'

/**
 * Compute a final 0-100 score from the four scoring factors.
 */
export function calculateScore(factors: ScoringFactors): number {
  return Math.round(
    Math.min(
      100,
      Math.max(
        0,
        factors.baseScore *
          factors.urgencyMultiplier *
          factors.freshnessDecay *
          factors.userRelevance
      )
    )
  )
}

/**
 * Urgency ramps from 1.0 to 2.0 as the deadline approaches.
 * Returns 1.0 if there is no expiry.
 */
export function calculateUrgencyMultiplier(expiresAt: Date | undefined, now: Date): number {
  if (!expiresAt) return 1.0
  const timeRemaining = expiresAt.getTime() - now.getTime()
  const totalWindow = expiresAt.getTime() - now.getTime()
  // totalWindow is the remaining window from "now" perspective;
  // we need the original window. Since we only have expiresAt, treat
  // the full window as the time from surfaced to expiry. Without
  // surfacedAt here, use a simple ratio off remaining time vs 1 hour baseline.
  // Corrected: the spec formula is 1.0 + max(0, min(1.0, 1.0 - timeRemaining / totalWindow))
  // Since totalWindow === timeRemaining when called standalone, we use
  // a 24-hour reference window for the ramp.
  const referenceWindow = 24 * 60 * 60 * 1000 // 24 hours in ms
  if (timeRemaining <= 0) return 2.0
  return 1.0 + Math.max(0, Math.min(1.0, 1.0 - timeRemaining / referenceWindow))
}

/**
 * Linear decay from 1.0 to 0.0 over ttlMinutes.
 * Returns 0 if past TTL.
 */
export function calculateFreshnessDecay(surfacedAt: Date, ttlMinutes: number, now: Date): number {
  const elapsed = now.getTime() - surfacedAt.getTime()
  const ttlMs = ttlMinutes * 60 * 1000
  if (elapsed >= ttlMs) return 0
  return 1.0 - elapsed / ttlMs
}

/**
 * Map a numeric score to its tier.
 * 80-100 = critical, 50-79 = action, 20-49 = awareness, 0-19 = opportunity
 */
export function assignTier(score: number): RailTier {
  for (const t of TIER_THRESHOLDS) {
    if (score >= t.floor && score <= t.ceiling) return t.tier
  }
  return 'opportunity'
}

/**
 * Check if the current hour falls within a time window.
 * Handles overnight wrap (e.g. 22-7).
 */
function isInWindow(hour: number, window: { start: number; end: number }): boolean {
  if (window.start <= window.end) {
    return hour >= window.start && hour < window.end
  }
  // Overnight wrap
  return hour >= window.start || hour < window.end
}

/**
 * Apply time-of-day damping to a score.
 * QUIET_HOURS (22-7) = 0.3, EVENING (17-22) = 0.7, BUSINESS (9-17) = 1.0
 * Hours 7-9 fall through to default 1.0.
 */
export function applyTimeOfDayDampening(score: number, now: Date): number {
  const hour = now.getHours()
  if (isInWindow(hour, QUIET_HOURS)) {
    return Math.round(score * QUIET_HOURS.dampingFactor)
  }
  if (isInWindow(hour, EVENING)) {
    return Math.round(score * EVENING.dampingFactor)
  }
  if (isInWindow(hour, BUSINESS_HOURS)) {
    return Math.round(score * BUSINESS_HOURS.dampingFactor)
  }
  // Default (e.g. 7-9 morning gap): no damping
  return score
}

/**
 * Group items by tier, sort by score descending within each group,
 * cap each tier to its density limit, return a TieredResult.
 */
export function applyDensityCaps<T extends { tier: RailTier; score: number }>(
  items: T[]
): TieredResult<T> {
  const grouped: Record<RailTier, T[]> = {
    critical: [],
    action: [],
    awareness: [],
    opportunity: [],
  }

  for (const item of items) {
    grouped[item.tier].push(item)
  }

  // Sort each tier by score descending, then cap
  for (const tier of RAIL_TIER_ORDER) {
    grouped[tier].sort((a, b) => b.score - a.score)
    grouped[tier] = grouped[tier].slice(0, DENSITY_CAPS[tier])
  }

  const totalItems =
    grouped.critical.length +
    grouped.action.length +
    grouped.awareness.length +
    grouped.opportunity.length

  return {
    critical: grouped.critical,
    action: grouped.action,
    awareness: grouped.awareness,
    opportunity: grouped.opportunity,
    totalItems,
    assembledAt: new Date().toISOString(),
  }
}

/**
 * If an item's current score exceeds its tier ceiling,
 * return the tier it should be promoted to. Otherwise null.
 */
export function shouldPromote(item: RailItem): RailTier | null {
  const currentThreshold = TIER_THRESHOLDS.find((t) => t.tier === item.tier)
  if (!currentThreshold) return null
  if (item.score > currentThreshold.ceiling) {
    const newTier = assignTier(item.score)
    if (newTier !== item.tier) return newTier
  }
  return null
}

/**
 * If an item's current score has dropped below its tier floor,
 * return the tier it should be demoted to. Otherwise null.
 */
export function shouldDemote(item: RailItem): RailTier | null {
  const currentThreshold = TIER_THRESHOLDS.find((t) => t.tier === item.tier)
  if (!currentThreshold) return null
  if (item.score < currentThreshold.floor) {
    const newTier = assignTier(item.score)
    if (newTier !== item.tier) return newTier
  }
  return null
}
