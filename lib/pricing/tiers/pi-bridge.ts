/**
 * Tier 2.7: PI BRIDGE (LIVE)
 * Real-time query to Pi's 1.1M prices over direct ethernet.
 * Falls back gracefully if Pi is unreachable.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { TierResolver, TierContext } from '../tier-resolver'
import {
  withDecay,
  computeFreshness,
  sourceDisplayStore,
  normalizeToStandardUnit,
  type ResolvedPrice,
} from '../resolve-price-helpers'
import { normalizeIngredientName } from '../name-normalizer'
import { isProductRelevantToIngredient } from '../product-relevance'
import { lookupPrice } from '../pi-bridge'
import {
  getMarketSeasonStatus,
  seasonalConfidenceMultiplier,
  shouldExcludeForSeason,
} from '../farmers-market-seasonal'

export const piBridgeResolver: TierResolver = {
  tier: 2.7,
  name: 'pi_bridge_live',

  async resolve(ctx: TierContext): Promise<ResolvedPrice | null> {
    const ingredientNameRow = (await db.execute(sql`
      SELECT name FROM ingredients WHERE id = ${ctx.ingredientId} LIMIT 1
    `)) as unknown as Array<{ name: string }>
    const ingredientName = ingredientNameRow[0]?.name

    if (!ingredientName) return null

    const normalizedName = normalizeIngredientName(ingredientName)
    const piResult = await lookupPrice(normalizedName, ctx.preferredState || undefined)
    if (!piResult || piResult.prices.length === 0) return null

    // Use the freshest in-stock price from Pi, but only after defending
    // against product-level false positives from the catalog.
    const relevantPrices = piResult.prices.filter(
      (price) =>
        price.in_stock &&
        isProductRelevantToIngredient(price.product_name, normalizedName) &&
        (!ctx.preferredState || !price.state || price.state === ctx.preferredState.toUpperCase())
    )
    const best = relevantPrices[0]
    if (!best) return null

    // Prefer Pi's pre-normalized price; otherwise normalize ourselves
    let priceCents = best.price_per_standard_unit_cents
    let priceUnit = best.standard_unit || best.price_unit || 'each'
    if (!priceCents && best.price_cents) {
      const normalized = normalizeToStandardUnit(best.price_cents, best.price_unit || 'each')
      if (normalized) {
        priceCents = normalized.cents
        priceUnit = normalized.unit
      } else {
        priceCents = best.price_cents
      }
    }
    if (!priceCents || priceCents <= 0) return null

    // Farmers market seasonal check: exclude out-of-season, boost in-season
    const marketStatus = await getMarketSeasonStatus(best.store, best.state || ctx.preferredState)
    if (shouldExcludeForSeason(marketStatus)) return null

    const seasonalMult = seasonalConfidenceMultiplier(marketStatus)
    return withDecay({
      cents: priceCents,
      unit: priceUnit,
      source: 'direct_scrape',
      sourceTier: 'pi_bridge_live',
      resolutionTier:
        ctx.preferredState && best.state === ctx.preferredState?.toUpperCase()
          ? 'zip_local'
          : 'regional',
      store: sourceDisplayStore('direct_scrape', best.store || best.product_name),
      confidence: Math.min(0.82 * seasonalMult, 1.0),
      freshness: computeFreshness(best.last_confirmed_at),
      confirmedAt: best.last_confirmed_at,
      reason: marketStatus === 'in_season' ? 'Farmers market in-season (freshness boost)' : null,
    })
  },
}
