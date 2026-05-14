/**
 * Tier 9: CATEGORY BASELINE
 * Category-level median from materialized view.
 * RPP-adjusted for chef's state.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { TierResolver, TierContext } from '../tier-resolver'
import {
  withDecay,
  applyRpp,
  type PriceFreshness,
  type ResolvedPrice,
} from '../resolve-price-helpers'
import { getCategoryBaseline } from '../category-baseline'

export const categoryBaselineResolver: TierResolver = {
  tier: 9,
  name: 'category_baseline',

  async resolve(ctx: TierContext): Promise<ResolvedPrice | null> {
    const ingredientCat = (await db.execute(sql`
      SELECT category FROM ingredients WHERE id = ${ctx.ingredientId} LIMIT 1
    `)) as unknown as Array<{ category: string | null }>

    if (ingredientCat.length === 0 || !ingredientCat[0].category) return null

    const baseline = await getCategoryBaseline(ingredientCat[0].category)
    if (!baseline) return null

    return withDecay({
      cents: applyRpp(baseline.medianCentsPerUnit, ctx.preferredState),
      unit: baseline.mostCommonUnit,
      source: 'category_baseline',
      sourceTier: 'category_baseline',
      resolutionTier: 'category_baseline',
      store: `${baseline.category} category estimate`,
      confidence: 0.2,
      freshness: 'stale' as PriceFreshness,
      confirmedAt: null,
      reason: ctx.preferredState
        ? `Median of ${baseline.ingredientCount} ${baseline.category} items, adjusted for ${ctx.preferredState}`
        : `Based on median of ${baseline.ingredientCount} ${baseline.category} ingredients`,
    })
  },
}
