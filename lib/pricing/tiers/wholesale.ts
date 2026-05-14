/**
 * Tier 2.5: WHOLESALE
 * Wholesale distributor pricing (openclaw_wholesale) within 30 days.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { TierResolver, TierContext } from '../tier-resolver'
import {
  withDecay,
  computeFreshness,
  sourceDisplayStore,
  type PriceRow,
  type ResolvedPrice,
} from '../resolve-price-helpers'

export const wholesaleResolver: TierResolver = {
  tier: 2.5,
  name: 'wholesale',

  async resolve(ctx: TierContext): Promise<ResolvedPrice | null> {
    const wholesale = (await db.execute(sql`
      SELECT price_per_unit_cents, unit, store_name, purchase_date
      FROM ingredient_price_history
      WHERE ingredient_id = ${ctx.ingredientId}
        AND (tenant_id = ${ctx.tenantId} OR tenant_id IS NULL)
        AND source = 'openclaw_wholesale'
        AND purchase_date > CURRENT_DATE - INTERVAL '30 days'
      ORDER BY purchase_date DESC
      LIMIT 1
    `)) as unknown as PriceRow[]

    if (wholesale.length > 0) {
      const row = wholesale[0]
      if (row.price_per_unit_cents !== null) {
        return withDecay({
          cents: row.price_per_unit_cents,
          unit: row.unit || 'each',
          source: 'wholesale',
          sourceTier: 'openclaw_wholesale',
          resolutionTier: 'wholesale',
          store: sourceDisplayStore('wholesale', row.store_name),
          confidence: 0.8,
          freshness: computeFreshness(row.purchase_date),
          confirmedAt: row.purchase_date,
          reason: null,
        })
      }
    }

    return null
  },
}
