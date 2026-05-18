import { getEngagementsBySource } from './engagement-tracker'

// ---------------------------------------------------------------------------
// EMA-based source affinity computation
//
// Computes a 0-100 score per source category using an Exponential Moving
// Average (alpha = 0.1) over a 30-day engagement window. Sources with no
// engagement default to 50. Floor is 10 (never fully suppress a source).
// ---------------------------------------------------------------------------

const EMA_ALPHA = 0.1
const DEFAULT_AFFINITY = 50
const AFFINITY_FLOOR = 10
const AFFINITY_CEILING = 100
const WINDOW_DAYS = 30

function clampAffinity(value: number): number {
  return Math.max(AFFINITY_FLOOR, Math.min(AFFINITY_CEILING, Math.round(value)))
}

/**
 * Compute per-source affinity scores for a user.
 *
 * Returns a Map where keys are source categories and values are 0-100 scores.
 * Sources the user has never interacted with get DEFAULT_AFFINITY (50).
 * The floor is AFFINITY_FLOOR (10), so no source is ever fully suppressed.
 */
export async function computeSourceAffinity(
  tenantId: string,
  userId: string
): Promise<Map<string, number>> {
  const engagements = await getEngagementsBySource(tenantId, userId, WINDOW_DAYS)

  const affinityMap = new Map<string, number>()

  if (engagements.length === 0) {
    return affinityMap // empty map; caller uses DEFAULT_AFFINITY for unknown sources
  }

  // Find the max action count for normalization
  const maxCount = Math.max(...engagements.map((e) => e.actionCount))
  if (maxCount === 0) return affinityMap

  for (const engagement of engagements) {
    // Normalize action count to 0-100 range
    const normalized = (engagement.actionCount / maxCount) * 100

    // Apply EMA: blend normalized score with default baseline
    // EMA formula: score = alpha * newValue + (1 - alpha) * baseline
    const emaScore = EMA_ALPHA * normalized + (1 - EMA_ALPHA) * DEFAULT_AFFINITY

    affinityMap.set(engagement.itemSource, clampAffinity(emaScore))
  }

  return affinityMap
}

/**
 * Look up a single source's affinity from a precomputed map.
 * Returns DEFAULT_AFFINITY if the source has no engagement data.
 */
export function getAffinityForSource(affinityMap: Map<string, number>, source: string): number {
  return affinityMap.get(source) ?? DEFAULT_AFFINITY
}

export { DEFAULT_AFFINITY, AFFINITY_FLOOR }
