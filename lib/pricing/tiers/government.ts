/**
 * Tier 7: GOVERNMENT
 * BLS/USDA NE regional average (openclaw_government), no age limit.
 * RPP-adjusted for chef's state.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { TierResolver, TierContext } from '../tier-resolver'
import {
  withDecay,
  computeFreshness,
  sourceDisplayStore,
  applyRpp,
  STATE_RPP,
  type PriceRow,
  type ResolvedPrice,
} from '../resolve-price-helpers'

export const governmentResolver: TierResolver = {
  tier: 7,
  name: 'government',

  async resolve(ctx: TierContext): Promise<ResolvedPrice | null> {
    const gov = (await db.execute(sql`
      SELECT price_per_unit_cents, unit, purchase_date
      FROM ingredient_price_history
      WHERE ingredient_id = ${ctx.ingredientId}
        AND (tenant_id = ${ctx.tenantId} OR tenant_id IS NULL)
        AND source = 'openclaw_government'
      ORDER BY purchase_date DESC
      LIMIT 1
    `)) as unknown as PriceRow[]

    if (gov.length > 0) {
      const row = gov[0]
      if (row.price_per_unit_cents !== null) {
        return withDecay({
          cents: applyRpp(row.price_per_unit_cents, ctx.preferredState),
          unit: row.unit || 'each',
          source: 'government',
          sourceTier: 'openclaw_government',
          resolutionTier: 'government',
          store: sourceDisplayStore('government', null),
          confidence: 0.4,
          freshness: computeFreshness(row.purchase_date),
          confirmedAt: row.purchase_date,
          reason: ctx.preferredState
            ? `USDA avg adjusted for ${ctx.preferredState} (RPP ${STATE_RPP[ctx.preferredState] || 100})`
            : null,
        })
      }
    }

    return null
  },
}
