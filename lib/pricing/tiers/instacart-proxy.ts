/**
 * Tier 5: INSTACART
 * Markup-adjusted Instacart prices (openclaw_instacart) within 30 days.
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

export const instacartProxyResolver: TierResolver = {
  tier: 5,
  name: 'instacart',

  async resolve(ctx: TierContext): Promise<ResolvedPrice | null> {
    const instacart = (await db.execute(sql`
      SELECT price_per_unit_cents, unit, store_name, purchase_date
      FROM ingredient_price_history
      WHERE ingredient_id = ${ctx.ingredientId}
        AND (tenant_id = ${ctx.tenantId} OR tenant_id IS NULL)
        AND source = 'openclaw_instacart'
        AND purchase_date > CURRENT_DATE - INTERVAL '30 days'
      ORDER BY
        CASE WHEN ${ctx.preferredStore} IS NOT NULL AND LOWER(store_name) = LOWER(${ctx.preferredStore}) THEN 0 ELSE 1 END,
        CASE WHEN ${ctx.preferredState} IS NOT NULL AND store_name ILIKE '%' || ${ctx.preferredState || ''} || '%' THEN 0 ELSE 1 END,
        purchase_date DESC
      LIMIT 1
    `)) as unknown as PriceRow[]

    if (instacart.length > 0) {
      const row = instacart[0]
      if (row.price_per_unit_cents !== null) {
        const icMarketStatus = await getMarketSeasonStatus(row.store_name, ctx.preferredState)
        if (!shouldExcludeForSeason(icMarketStatus)) {
          const icSeasonalMult = seasonalConfidenceMultiplier(icMarketStatus)
          return withDecay({
            cents: row.price_per_unit_cents,
            unit: row.unit || 'each',
            source: 'instacart',
            sourceTier: 'openclaw_instacart',
            resolutionTier: tierForReceiptSource(
              'openclaw_instacart',
              row.store_name,
              ctx.preferredState
            ),
            store: sourceDisplayStore('instacart', row.store_name),
            confidence: Math.min(0.6 * icSeasonalMult, 1.0),
            freshness: computeFreshness(row.purchase_date),
            confirmedAt: row.purchase_date,
            reason:
              icMarketStatus === 'in_season' ? 'Farmers market in-season (freshness boost)' : null,
          })
        }
      }
    }

    return null
  },
}
