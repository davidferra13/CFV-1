/**
 * Tier 9.5: SYNTHETIC (DB)
 * Pre-computed synthetic price from synthetic engine cron (openclaw.synthetic_prices).
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { TierResolver, TierContext } from '../tier-resolver'
import { withDecay, computeFreshness, type ResolvedPrice } from '../resolve-price-helpers'
import { normalizeIngredientName } from '../name-normalizer'

export const syntheticDbResolver: TierResolver = {
  tier: 9.5,
  name: 'synthetic_db',

  async resolve(ctx: TierContext): Promise<ResolvedPrice | null> {
    try {
      const ingredientNameRow = (await db.execute(sql`
        SELECT name FROM ingredients WHERE id = ${ctx.ingredientId} LIMIT 1
      `)) as unknown as Array<{ name: string }>
      const lookupName = ingredientNameRow[0]?.name
      if (!lookupName) return null

      const normalizedSlug = normalizeIngredientName(lookupName).toLowerCase().replace(/\s+/g, '-')
      const syntheticRows = (await db.execute(sql`
        SELECT sp.price_cents, sp.price_unit, sp.confidence,
               sp.derivation_method, pr.slug AS region_slug,
               sp.updated_at::text AS updated_at
        FROM openclaw.synthetic_prices sp
        JOIN openclaw.pricing_regions pr ON pr.id = sp.pricing_region_id
        WHERE sp.canonical_ingredient_id = ${normalizedSlug}
          AND (
            pr.slug = ${ctx.preferredState?.toLowerCase() || ''}
            OR sp.pricing_region_id IN (
              SELECT zc.pricing_region_id FROM openclaw.zip_centroids zc
              JOIN chefs ch ON ch.zip_code = zc.zip
              WHERE ch.id = ${ctx.tenantId}
            )
          )
        ORDER BY sp.confidence DESC
        LIMIT 1
      `)) as unknown as Array<{
        price_cents: number
        price_unit: string
        confidence: number
        derivation_method: string
        region_slug: string
        updated_at: string | null
      }>

      if (syntheticRows.length > 0 && syntheticRows[0].price_cents > 0) {
        const row = syntheticRows[0]
        return withDecay({
          cents: row.price_cents,
          unit: row.price_unit?.replace('per_', '') || 'each',
          source: 'synthetic',
          sourceTier: row.derivation_method,
          resolutionTier: 'synthetic',
          store: `Synthetic (${row.derivation_method}, ${row.region_slug})`,
          confidence: Math.min(Number(row.confidence), 0.15),
          freshness: computeFreshness(row.updated_at),
          confirmedAt: row.updated_at,
          reason: `Synthetic price via ${row.derivation_method}`,
        })
      }
    } catch {
      // synthetic_prices table may not exist yet; fall through to inline synthetic
    }

    return null
  },
}
