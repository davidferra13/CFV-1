/**
 * Rail Item Scoring Engine
 *
 * Pure functions (no DB). Computes final score for rail items using:
 *   finalScore = baseScore * urgencyMultiplier * freshnessDecay * userRelevance
 *
 * Also handles:
 * - Time-of-day multipliers (morning boost, evening dampen, night suppress)
 * - Tier assignment from score
 * - Tier promotion/demotion detection
 * - Freshness decay (linear over ttlMinutes)
 * - Urgency escalation as expiresAt approaches
 */

import type {
  RailItem,
  RailItemTier,
  RailItemScoringInput,
  RailItemScoreBreakdown,
  TimeWindow,
} from './rail-item-types'
import { TIER_THRESHOLDS, TIME_WINDOWS, RAIL_ITEM_TIER_ORDER } from './rail-item-types'

// ---------------------------------------------------------------------------
// Time window detection
// ---------------------------------------------------------------------------

export function getCurrentTimeWindow(now: Date): TimeWindow {
  const hour = now.getHours()

  // Night wraps around midnight: 22-5
  if (hour >= 22 || hour < 5) return 'night'
  if (hour >= 5 && hour < 9) return 'morning'
  if (hour >= 9 && hour < 17) return 'active'
  return 'evening'
}

// ---------------------------------------------------------------------------
// Freshness decay: linear from 1.0 to 0.0 over ttlMinutes
// ---------------------------------------------------------------------------

export function computeFreshnessDecay(surfacedAt: Date, ttlMinutes: number, now: Date): number {
  if (ttlMinutes <= 0) return 1.0

  const elapsedMs = now.getTime() - surfacedAt.getTime()
  const ttlMs = ttlMinutes * 60_000
  const ratio = Math.min(1, Math.max(0, elapsedMs / ttlMs))

  // Linear decay from 1.0 to 0.0
  return 1.0 - ratio
}

// ---------------------------------------------------------------------------
// Urgency multiplier: approaches 2x as expiresAt nears, 1.0 if no expiry
// ---------------------------------------------------------------------------

export function computeUrgencyMultiplier(expiresAt: Date | undefined, now: Date): number {
  if (!expiresAt) return 1.0

  const remainingMs = expiresAt.getTime() - now.getTime()
  if (remainingMs <= 0) return 2.0

  // 2 hours in ms
  const twoHoursMs = 2 * 60 * 60_000

  if (remainingMs <= twoHoursMs) {
    // Linear ramp from 1.5 to 2.0 in last 2 hours
    const ratio = 1 - remainingMs / twoHoursMs
    return 1.5 + 0.5 * ratio
  }

  // 24 hours in ms
  const dayMs = 24 * 60 * 60_000

  if (remainingMs <= dayMs) {
    // Linear ramp from 1.0 to 1.5 in last 24 hours
    const ratio = 1 - remainingMs / dayMs
    return 1.0 + 0.5 * ratio
  }

  return 1.0
}

// ---------------------------------------------------------------------------
// User relevance: boosted by interactions, penalized by dismissals
// ---------------------------------------------------------------------------

export function computeUserRelevance(interactionCount: number, dismissCount: number): number {
  // Base relevance is 1.0
  // Each interaction adds 0.05 (max +0.3)
  const interactionBoost = Math.min(0.3, interactionCount * 0.05)

  // Each dismissal subtracts 0.15 (max -0.6)
  const dismissPenalty = Math.min(0.6, dismissCount * 0.15)

  return Math.max(0.2, 1.0 + interactionBoost - dismissPenalty)
}

// ---------------------------------------------------------------------------
// Time-of-day multiplier for a given tier
// ---------------------------------------------------------------------------

export function computeTimeMultiplier(tier: RailItemTier, timeWindow: TimeWindow): number {
  const config = TIME_WINDOWS[timeWindow]

  if (tier === 'critical' || tier === 'action') {
    return config.criticalActionMultiplier
  }
  return config.awarenessOpportunityMultiplier
}

// ---------------------------------------------------------------------------
// Tier assignment from score
// ---------------------------------------------------------------------------

export function assignTierFromScore(score: number): RailItemTier {
  const clamped = Math.max(0, Math.min(100, score))

  if (clamped >= TIER_THRESHOLDS.critical.floor) return 'critical'
  if (clamped >= TIER_THRESHOLDS.action.floor) return 'action'
  if (clamped >= TIER_THRESHOLDS.awareness.floor) return 'awareness'
  return 'opportunity'
}

// ---------------------------------------------------------------------------
// Detect tier promotion/demotion
// ---------------------------------------------------------------------------

export function detectTierMovement(
  previousTier: RailItemTier,
  newTier: RailItemTier
): { promoted: boolean; demoted: boolean } {
  const prevIndex = RAIL_ITEM_TIER_ORDER.indexOf(previousTier)
  const newIndex = RAIL_ITEM_TIER_ORDER.indexOf(newTier)

  return {
    promoted: newIndex < prevIndex,
    demoted: newIndex > prevIndex,
  }
}

// ---------------------------------------------------------------------------
// Force-promote to Critical if expiresAt within 2 hours
// ---------------------------------------------------------------------------

export function shouldForcePromoteToCritical(expiresAt: Date | undefined, now: Date): boolean {
  if (!expiresAt) return false
  const remainingMs = expiresAt.getTime() - now.getTime()
  const twoHoursMs = 2 * 60 * 60_000
  return remainingMs > 0 && remainingMs <= twoHoursMs
}

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------

export function scoreRailItem(
  input: RailItemScoringInput,
  surfacedAt: Date,
  now: Date
): RailItemScoreBreakdown {
  const freshnessDecay = computeFreshnessDecay(surfacedAt, input.ttlMinutes, now)
  const urgencyMultiplier = computeUrgencyMultiplier(input.expiresAt, now)
  const userRelevance = computeUserRelevance(input.interactionCount, input.dismissCount)

  // Compute raw score before time window
  const rawScore = input.baseScore * urgencyMultiplier * freshnessDecay * userRelevance

  // Determine preliminary tier for time window multiplier
  const preliminaryTier = assignTierFromScore(rawScore)

  // Apply time-of-day multiplier
  const timeWindow = getCurrentTimeWindow(now)
  const timeMultiplier = computeTimeMultiplier(preliminaryTier, timeWindow)

  // Final score clamped to 0-100
  let finalScore = Math.max(0, Math.min(100, rawScore * timeMultiplier))

  // Force-promote to critical if expiring within 2 hours
  if (shouldForcePromoteToCritical(input.expiresAt, now)) {
    finalScore = Math.max(finalScore, TIER_THRESHOLDS.critical.floor)
  }

  const tier = assignTierFromScore(finalScore)

  return {
    baseScore: input.baseScore,
    urgencyMultiplier,
    freshnessDecay,
    userRelevance,
    timeWindowMultiplier: timeMultiplier,
    finalScore,
    tier,
  }
}

// ---------------------------------------------------------------------------
// Batch scoring and sorting
// ---------------------------------------------------------------------------

export function scoreAndSortRailItems(
  items: Array<{ item: RailItem; input: RailItemScoringInput }>,
  now: Date
): Array<{ item: RailItem; breakdown: RailItemScoreBreakdown }> {
  return items
    .map(({ item, input }) => {
      const breakdown = scoreRailItem(input, item.surfacedAt, now)
      return { item, breakdown }
    })
    .sort((a, b) => b.breakdown.finalScore - a.breakdown.finalScore)
}

// ---------------------------------------------------------------------------
// Night suppression: only Critical surfaces at night
// ---------------------------------------------------------------------------

export function isNightSuppressed(tier: RailItemTier, now: Date): boolean {
  if (getCurrentTimeWindow(now) !== 'night') return false
  return tier !== 'critical'
}
