/**
 * Tier 0.5: PINNED_PRICE
 * Chef manually pinned a price for this ingredient.
 * Sits between chef_override (Tier 0) and receipt (Tier 1).
 * Confidence 0.95. Expires based on pinned_price_expires_at.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { TierResolver, TierContext } from '../tier-resolver'
import { withDecay, computeFreshness } from '../resolve-price-helpers'
import type { ResolvedPrice } from '../resolve-price-helpers'

export const pinnedPriceResolver: TierResolver = {
  tier: 0.5,
  name: 'pinned_price',

  async resolve(ctx: TierContext): Promise<ResolvedPrice | null> {
    const rows = (await db.execute(sql`
      SELECT pinned_price_cents, pinned_price_unit, pinned_price_source,
             pinned_price_vendor, pinned_price_set_at::text AS set_at
      FROM ingredients
      WHERE id = ${ctx.ingredientId}
        AND tenant_id = ${ctx.tenantId}
        AND pinned_price_cents IS NOT NULL
        AND pinned_price_cents > 0
        AND (pinned_price_expires_at IS NULL OR pinned_price_expires_at > NOW())
      LIMIT 1
    `)) as unknown as Array<{
      pinned_price_cents: number
      pinned_price_unit: string | null
      pinned_price_source: string | null
      pinned_price_vendor: string | null
      set_at: string | null
    }>

    if (rows.length > 0) {
      const row = rows[0]
      const store = row.pinned_price_vendor ? `Pinned (${row.pinned_price_vendor})` : 'Pinned price'
      return withDecay({
        cents: row.pinned_price_cents,
        unit: row.pinned_price_unit || 'each',
        source: 'pinned_price',
        sourceTier: row.pinned_price_source || 'manual_pin',
        resolutionTier: 'chef_receipt',
        store,
        confidence: 0.95,
        freshness: computeFreshness(row.set_at),
        confirmedAt: row.set_at,
        reason: row.pinned_price_source ? `Pinned from: ${row.pinned_price_source}` : null,
      })
    }

    return null
  },
}
