/**
 * Tier 8: HISTORICAL
 * Chef's own average from past purchases (any age).
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { TierResolver, TierContext } from '../tier-resolver'
import {
  withDecay,
  computeFreshness,
  sourceDisplayStore,
  type AvgRow,
  type ResolvedPrice,
} from '../resolve-price-helpers'

export const historicalResolver: TierResolver = {
  tier: 8,
  name: 'historical',

  async resolve(ctx: TierContext): Promise<ResolvedPrice | null> {
    const historical = (await db.execute(sql`
      SELECT
        ROUND(AVG(price_per_unit_cents))::int as avg_cents,
        (ARRAY_AGG(unit ORDER BY purchase_date DESC))[1] as unit,
        MAX(purchase_date) as latest_date
      FROM ingredient_price_history
      WHERE ingredient_id = ${ctx.ingredientId}
        AND tenant_id = ${ctx.tenantId}
        AND source IN ('manual', 'receipt', 'grocery_entry', 'po_receipt', 'vendor_invoice')
        AND price_per_unit_cents IS NOT NULL
    `)) as unknown as AvgRow[]

    if (historical.length > 0) {
      const row = historical[0]
      if (row.avg_cents !== null) {
        return withDecay({
          cents: row.avg_cents,
          unit: row.unit || 'each',
          source: 'historical',
          sourceTier: null,
          resolutionTier: 'historical',
          store: sourceDisplayStore('historical', null),
          confidence: 0.3,
          freshness: computeFreshness(row.latest_date),
          confirmedAt: row.latest_date,
          reason: null,
        })
      }
    }

    return null
  },
}
