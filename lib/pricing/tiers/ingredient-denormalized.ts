/**
 * Tier 2.75: INGREDIENT DENORMALIZED
 * Reads prices synced directly onto ingredients.last_price_* columns.
 * 273K+ ingredients carry fresh openclaw prices here while the normalized
 * history tables may be empty for those same sources.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { TierResolver, TierContext } from '../tier-resolver'
import {
  withDecay,
  computeFreshness,
  sourceDisplayStore,
  type PriceSource,
  type ResolvedPrice,
} from '../resolve-price-helpers'

const SOURCE_TO_PRICE_SOURCE: Record<string, PriceSource> = {
  openclaw_market: 'direct_scrape',
  openclaw_flyer: 'flyer',
  openclaw_instacart: 'instacart',
}

const SOURCE_CONFIDENCE: Record<string, number> = {
  openclaw_market: 0.85,
  openclaw_flyer: 0.7,
  openclaw_instacart: 0.6,
}

export const ingredientDenormalizedResolver: TierResolver = {
  tier: 2.75,
  name: 'ingredient_denormalized',

  async resolve(ctx: TierContext): Promise<ResolvedPrice | null> {
    const rows = (await db.execute(sql`
      SELECT last_price_cents, last_price_source, last_price_store,
             last_price_confidence, last_price_date::text AS last_price_date
      FROM ingredients
      WHERE id = ${ctx.ingredientId}
        AND last_price_cents IS NOT NULL
        AND last_price_cents > 0
      LIMIT 1
    `)) as unknown as Array<{
      last_price_cents: number
      last_price_source: string | null
      last_price_store: string | null
      last_price_confidence: string | null
      last_price_date: string | null
    }>

    if (rows.length === 0) return null

    const row = rows[0]
    const rawSource = row.last_price_source || 'openclaw_market'
    const priceSource = SOURCE_TO_PRICE_SOURCE[rawSource] || 'direct_scrape'
    const storedConf = row.last_price_confidence ? parseFloat(row.last_price_confidence) : null
    const confidence =
      storedConf && storedConf > 0 ? Math.min(storedConf, 0.9) : SOURCE_CONFIDENCE[rawSource] || 0.6

    return withDecay({
      cents: row.last_price_cents,
      unit: 'each',
      source: priceSource,
      sourceTier: rawSource,
      resolutionTier: row.last_price_store ? 'regional' : 'market_national',
      store: sourceDisplayStore(priceSource, row.last_price_store),
      confidence,
      freshness: computeFreshness(row.last_price_date),
      confirmedAt: row.last_price_date,
      reason: null,
    })
  },
}
