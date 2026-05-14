/**
 * Tier 4: FLYER
 * Weekly circular prices (openclaw_flyer) within 14 days.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { TierResolver, TierContext } from '../tier-resolver'
import {
  withDecay,
  computeFreshness,
  sourceDisplayStore,
  tierForReceiptSource,
  type PriceRow,
  type ResolvedPrice,
} from '../resolve-price-helpers'
import {
  getMarketSeasonStatus,
  seasonalConfidenceMultiplier,
  shouldExcludeForSeason,
} from '../farmers-market-seasonal'

export const flyerPriceResolver: TierResolver = {
  tier: 4,
  name: 'flyer',

  async resolve(ctx: TierContext): Promise<ResolvedPrice | null> {
    const flyer = (await db.execute(sql`
      SELECT price_per_unit_cents, unit, store_name, purchase_date
      FROM ingredient_price_history
      WHERE ingredient_id = ${ctx.ingredientId}
        AND (tenant_id = ${ctx.tenantId} OR tenant_id IS NULL)
        AND source = 'openclaw_flyer'
        AND purchase_date > CURRENT_DATE - INTERVAL '14 days'
      ORDER BY
        CASE WHEN ${ctx.preferredStore} IS NOT NULL AND LOWER(store_name) = LOWER(${ctx.preferredStore}) THEN 0 ELSE 1 END,
        CASE WHEN ${ctx.preferredState} IS NOT NULL AND store_name ILIKE '%' || ${ctx.preferredState || ''} || '%' THEN 0 ELSE 1 END,
        purchase_date DESC
      LIMIT 1
    `)) as unknown as PriceRow[]

    if (flyer.length > 0) {
      const row = flyer[0]
      if (row.price_per_unit_cents !== null) {
        const flyerMarketStatus = await getMarketSeasonStatus(row.store_name, ctx.preferredState)
        if (!shouldExcludeForSeason(flyerMarketStatus)) {
          const flyerSeasonalMult = seasonalConfidenceMultiplier(flyerMarketStatus)
          return withDecay({
            cents: row.price_per_unit_cents,
            unit: row.unit || 'each',
            source: 'flyer',
            sourceTier: 'openclaw_flyer',
            resolutionTier: tierForReceiptSource(
              'openclaw_flyer',
              row.store_name,
              ctx.preferredState
            ),
            store: sourceDisplayStore('flyer', row.store_name),
            confidence: Math.min(0.7 * flyerSeasonalMult, 1.0),
            freshness: computeFreshness(row.purchase_date),
            confirmedAt: row.purchase_date,
            reason:
              flyerMarketStatus === 'in_season'
                ? 'Farmers market in-season (freshness boost)'
                : null,
          })
        }
      }
    }

    return null
  },
}
