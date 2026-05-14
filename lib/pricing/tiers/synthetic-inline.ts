/**
 * Tier 10: SYNTHETIC (INLINE)
 * Category floor + RPP (absolute last resort, PIE Law 9: NEVER null).
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { TierResolver, TierContext } from '../tier-resolver'
import {
  withDecay,
  generateInlineSynthetic,
  getSpendTierFactor,
  type PriceFreshness,
  type ResolvedPrice,
} from '../resolve-price-helpers'
import { normalizeIngredientName } from '../name-normalizer'

export const syntheticInlineResolver: TierResolver = {
  tier: 10,
  name: 'synthetic_inline',

  async resolve(ctx: TierContext): Promise<ResolvedPrice | null> {
    // Look up ingredient category and name
    const ingredientRow = (await db.execute(sql`
      SELECT name, category FROM ingredients WHERE id = ${ctx.ingredientId} LIMIT 1
    `)) as unknown as Array<{ name: string; category: string | null }>

    const categoryForFloor = ingredientRow[0]?.category || null
    const ingredientName = ingredientRow[0]?.name || null
    const spendFactor = await getSpendTierFactor(ctx.tenantId)
    const { cents: syntheticCents, reason: syntheticReason } = generateInlineSynthetic(
      categoryForFloor,
      ctx.preferredState,
      ingredientName,
      spendFactor
    )

    // PIE Law 9: NEVER return null. This tier always produces a price.
    return withDecay({
      cents: syntheticCents,
      unit: 'each',
      source: 'synthetic',
      sourceTier: 'category_floor_inline',
      resolutionTier: 'synthetic',
      store: 'Synthetic estimate',
      confidence: 0.1,
      freshness: 'stale' as PriceFreshness,
      confirmedAt: null,
      reason: syntheticReason,
    })
  },
}
