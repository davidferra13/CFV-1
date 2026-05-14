/**
 * Tier 0: CHEF OVERRIDE
 * Standing override from chef_ingredient_prices (within 90 days).
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { TierResolver, TierContext } from '../tier-resolver'
import { withDecay, computeFreshness, sourceDisplayStore } from '../resolve-price-helpers'
import type { ResolvedPrice } from '../resolve-price-helpers'

export const chefOverrideResolver: TierResolver = {
  tier: 0,
  name: 'chef_override',

  async resolve(ctx: TierContext): Promise<ResolvedPrice | null> {
    const chefOverride = (await db.execute(sql`
      SELECT price_cents, price_unit, source, confirmed_at::text AS confirmed_at, notes
      FROM chef_ingredient_prices
      WHERE ingredient_id = ${ctx.ingredientId}
        AND chef_id = ${ctx.tenantId}
        AND confirmed_at > NOW() - INTERVAL '90 days'
      LIMIT 1
    `)) as unknown as Array<{
      price_cents: number
      price_unit: string
      source: string
      confirmed_at: string
      notes: string | null
    }>

    if (chefOverride.length > 0) {
      const row = chefOverride[0]
      return withDecay({
        cents: row.price_cents,
        unit: row.price_unit || 'each',
        source: 'chef_override',
        sourceTier: row.source,
        resolutionTier: 'chef_override',
        store: sourceDisplayStore('chef_override', null),
        confidence: 0.98,
        freshness: computeFreshness(row.confirmed_at),
        confirmedAt: row.confirmed_at,
        reason: row.notes,
      })
    }

    return null
  },
}
