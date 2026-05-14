/**
 * Tier 6: REGIONAL AVERAGE
 * Cross-store average from materialized view.
 */

import type { TierResolver, TierContext } from '../tier-resolver'
import { withDecay, computeFreshness, type ResolvedPrice } from '../resolve-price-helpers'
import { getRegionalAverage } from '../cross-store-average'

export const regionalAverageResolver: TierResolver = {
  tier: 6,
  name: 'regional_average',

  async resolve(ctx: TierContext): Promise<ResolvedPrice | null> {
    const regionalAvg = await getRegionalAverage(ctx.ingredientId, ctx.preferredState)
    if (!regionalAvg) return null

    // Check freshness: only use if most recent data is within 60 days
    const daysSinceRecent = regionalAvg.mostRecentDate
      ? Math.floor(
          (new Date().getTime() - new Date(regionalAvg.mostRecentDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 999
    if (daysSinceRecent > 60) return null

    return withDecay({
      cents: regionalAvg.avgPricePerUnitCents,
      unit: regionalAvg.mostCommonUnit,
      source: 'regional_average',
      sourceTier: 'regional_average',
      resolutionTier: 'regional',
      store: `Regional Average (${regionalAvg.storeCount} stores)`,
      confidence: 0.5,
      freshness: computeFreshness(regionalAvg.mostRecentDate),
      confirmedAt: regionalAvg.mostRecentDate,
      reason: null,
    })
  },
}
