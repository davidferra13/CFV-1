/**
 * Tier 6.25: RESOLVED NATIONAL
 * Pre-computed regional price from openclaw.resolved_prices via ingredient alias bridge.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { TierResolver, TierContext } from '../tier-resolver'
import { withDecay, computeFreshness, type ResolvedPrice } from '../resolve-price-helpers'

export const resolvedNationalResolver: TierResolver = {
  tier: 6.25,
  name: 'resolved_national',

  async resolve(ctx: TierContext): Promise<ResolvedPrice | null> {
    try {
      const resolvedNational = (await db.execute(sql`
        SELECT rp.price_cents, rp.price_unit, rp.confidence,
               rp.price_low_cents, rp.price_high_cents,
               rp.observation_count, rp.source_count,
               rp.freshest_observation::text AS freshest,
               rp.computation_method,
               pr.name AS region_name
        FROM ingredient_aliases ia
        JOIN system_ingredients si ON si.id = ia.system_ingredient_id
        JOIN openclaw.resolved_prices rp
          ON rp.canonical_ingredient_id = si.id::text
        JOIN openclaw.pricing_regions pr ON pr.id = rp.pricing_region_id
        JOIN openclaw.zip_centroids zc ON zc.pricing_region_id = pr.id
        JOIN chefs ch ON ch.id = ${ctx.tenantId}
        WHERE ia.ingredient_id = ${ctx.ingredientId}
          AND ia.tenant_id = ${ctx.tenantId}
          AND ia.system_ingredient_id IS NOT NULL
          AND ia.match_method != 'dismissed'
          AND rp.price_type = 'retail'
          AND rp.confidence > 0.2
          AND (
            zc.zip = ch.zip_code
            OR zc.state = ${ctx.preferredState || ''}
          )
        ORDER BY
          CASE WHEN zc.zip = ch.zip_code THEN 0 ELSE 1 END,
          rp.confidence DESC
        LIMIT 1
      `)) as unknown as Array<{
        price_cents: number
        price_unit: string
        confidence: number
        price_low_cents: number
        price_high_cents: number
        observation_count: number
        source_count: number
        freshest: string | null
        computation_method: string
        region_name: string
      }>

      if (resolvedNational.length > 0) {
        const row = resolvedNational[0]
        if (row.price_cents > 0) {
          const isLocal = row.computation_method !== 'cost_index_estimate'
          return withDecay({
            cents: row.price_cents,
            unit: row.price_unit?.replace('per_', '') || 'each',
            source: 'resolved_national',
            sourceTier: row.computation_method,
            resolutionTier: isLocal ? 'regional' : 'market_national',
            store: `${row.region_name} (${row.source_count} sources)`,
            confidence: Math.min(Number(row.confidence), 0.7),
            freshness: computeFreshness(row.freshest),
            confirmedAt: row.freshest,
            reason: null,
          })
        }
      }
    } catch {
      // resolved_prices table may not exist yet; gracefully skip
    }

    return null
  },
}
