/**
 * Tier 2: API QUOTE
 * Live API price from Kroger/Spoonacular/MealMe (within 30 days).
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { TierResolver, TierContext } from '../tier-resolver'
import {
  withDecay,
  computeFreshness,
  sourceDisplayStore,
  type QuoteRow,
  type ResolvedPrice,
} from '../resolve-price-helpers'

export const apiQuoteResolver: TierResolver = {
  tier: 2,
  name: 'api_quote',

  async resolve(ctx: TierContext): Promise<ResolvedPrice | null> {
    const apiQuote = (await db.execute(sql`
      SELECT
        qi.ingredient_id,
        COALESCE(
          LEAST(
            NULLIF(qi.kroger_price_cents, 0),
            NULLIF(qi.spoonacular_price_cents, 0),
            NULLIF(qi.mealme_price_cents, 0)
          ),
          qi.kroger_price_cents,
          qi.spoonacular_price_cents,
          qi.mealme_price_cents
        ) as best_cents,
        qi.source_label,
        q.created_at
      FROM grocery_price_quote_items qi
      JOIN grocery_price_quotes q ON q.id = qi.quote_id
      WHERE qi.ingredient_id = ${ctx.ingredientId}
        AND q.tenant_id = ${ctx.tenantId}
        AND q.status IN ('complete', 'partial')
        AND q.created_at > NOW() - INTERVAL '30 days'
      ORDER BY q.created_at DESC
      LIMIT 1
    `)) as unknown as QuoteRow[]

    if (apiQuote.length > 0) {
      const row = apiQuote[0]
      if (row.best_cents !== null && row.best_cents > 0) {
        return withDecay({
          cents: row.best_cents,
          unit: 'each',
          source: 'api_quote',
          sourceTier: row.source_label || 'api',
          resolutionTier: 'chef_receipt',
          store: sourceDisplayStore('api_quote', row.source_label),
          confidence: 0.75,
          freshness: computeFreshness(row.created_at),
          confirmedAt: row.created_at,
          reason: null,
        })
      }
    }

    return null
  },
}
