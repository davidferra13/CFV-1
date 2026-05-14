/**
 * Tier 6.5: MARKET AGGREGATE
 * System-level market price via ingredient alias bridge.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { TierResolver, TierContext } from '../tier-resolver'
import {
  withDecay,
  computeFreshness,
  sourceDisplayStore,
  applyRpp,
  type ResolvedPrice,
} from '../resolve-price-helpers'

export const marketAggregateResolver: TierResolver = {
  tier: 6.5,
  name: 'market_aggregate',

  async resolve(ctx: TierContext): Promise<ResolvedPrice | null> {
    const marketAgg = (await db.execute(sql`
      SELECT sip.avg_price_cents, sip.median_price_cents, sip.price_unit,
             sip.store_count, sip.state_count, sip.confidence,
             sip.newest_price_at::text AS newest_date,
             sip.states as covered_states
      FROM ingredient_aliases ia
      JOIN openclaw.system_ingredient_prices sip ON sip.system_ingredient_id = ia.system_ingredient_id
      WHERE ia.ingredient_id = ${ctx.ingredientId}
        AND ia.tenant_id = ${ctx.tenantId}
        AND ia.system_ingredient_id IS NOT NULL
        AND ia.match_method != 'dismissed'
      LIMIT 1
    `)) as unknown as Array<{
      avg_price_cents: number
      median_price_cents: number | null
      price_unit: string
      store_count: number
      state_count: number
      confidence: number
      newest_date: string | null
      covered_states: string[] | null
    }>

    if (marketAgg.length > 0) {
      const row = marketAgg[0]
      const priceCents = row.median_price_cents ?? row.avg_price_cents
      if (priceCents > 0) {
        // Boost confidence if the requested state is covered by this price data
        const statesArr = row.covered_states || []
        const coversRequestedState = ctx.preferredState && statesArr.includes(ctx.preferredState)
        const baseConf = Math.min(parseFloat(String(row.confidence)) || 0.55, 0.65)
        const adjustedConf = coversRequestedState ? Math.min(baseConf + 0.1, 0.75) : baseConf

        // RPP-adjust when the market data does NOT cover the chef's state
        const adjustedCents = coversRequestedState
          ? priceCents
          : applyRpp(priceCents, ctx.preferredState)

        return withDecay({
          cents: adjustedCents,
          unit: row.price_unit || 'each',
          source: 'market_aggregate',
          sourceTier: 'system_ingredient_market',
          resolutionTier: coversRequestedState ? 'market_state' : 'market_national',
          store: `Market Average (${row.store_count} stores, ${row.state_count} state${row.state_count !== 1 ? 's' : ''})`,
          confidence: adjustedConf,
          freshness: computeFreshness(row.newest_date),
          confirmedAt: row.newest_date,
          reason: coversRequestedState
            ? null
            : ctx.preferredState
              ? `National avg adjusted for ${ctx.preferredState}`
              : null,
        })
      }
    }

    return null
  },
}
