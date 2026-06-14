/**
 * Unified Price Resolution Chain
 * Single function that resolves the best price for any ingredient
 * using a 13-tier fallback chain.
 *
 * This is NOT a 'use server' file. It's internal logic called by
 * server actions and server components.
 *
 * Resolution order (by trust):
 *   0. CHEF OVERRIDE      - Standing override from chef_ingredient_prices
 *   1. RECEIPT            - Chef's own purchase (manual, grocery_entry, po_receipt, vendor_invoice)
 *   2. API QUOTE          - Live API price from Kroger/Spoonacular/MealMe
 *  2.5 WHOLESALE          - Wholesale distributor pricing (openclaw_wholesale)
 *   3. DIRECT SCRAPE      - Real store website price (openclaw_scrape) [PostgreSQL fallback]
 *   4. FLYER              - Weekly circular (openclaw_flyer)
 *   5. INSTACART          - Markup-adjusted proxy (openclaw_instacart)
 *   6. REGIONAL AVERAGE   - Cross-store average from all OpenClaw sources (2+ stores)
 *  6.25 RESOLVED NATIONAL - Pre-computed per-region price via alias bridge
 *  6.5 MARKET AGGREGATE   - System-level market price via ingredient alias bridge
 *   7. GOVERNMENT         - BLS/USDA NE regional average (openclaw_government)
 *   8. HISTORICAL         - Chef's own average from past purchases
 *   9. CATEGORY BASELINE  - Category-level median (e.g., average spice price per oz)
 * 9.5. SYNTHETIC (DB)     - Pre-computed synthetic price from synthetic engine cron
 *  10. SYNTHETIC (INLINE)  - Category floor + RPP (absolute last resort, NEVER null)
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { getRegionalAveragesBatch } from './cross-store-average'
import { getCategoryBaselinesBatch } from './category-baseline'
import { normalizeIngredientName } from './name-normalizer'
import {
  getMarketSeasonStatus,
  seasonalConfidenceMultiplier,
  shouldExcludeForSeason,
} from './farmers-market-seasonal'
import {
  getRegionalBiasCorrection,
  getConfidenceAdjustment,
  applyLearningCorrections,
} from './learning-corrections'

// Re-export types and helpers from the shared module so external consumers
// that import from resolve-price.ts continue to work unchanged.
export type {
  PriceSource,
  PriceFreshness,
  ResolutionTier,
  CoverageLevel,
  ResolvedPrice,
} from './resolve-price-helpers'

export {
  computeFreshness,
  withDecay,
  applyRpp,
  STATE_RPP,
  sourceDisplayStore,
  tierForReceiptSource,
  normalizeToStandardUnit,
  generateInlineSynthetic,
  getChefHomeState,
  getSpendTierFactor,
  coverageLevelForTier,
} from './resolve-price-helpers'

import type { ResolvedPrice, PriceFreshness, PriceSource } from './resolve-price-helpers'
import {
  withDecay,
  computeFreshness,
  sourceDisplayStore,
  tierForReceiptSource,
  applyRpp,
  STATE_RPP,
  normalizeToStandardUnit,
  generateInlineSynthetic,
  getChefHomeState,
  getSpendTierFactor,
} from './resolve-price-helpers'
import type { PriceRow, QuoteRow, AvgRow } from './resolve-price-helpers'

// --- Tier resolvers (single-ingredient path) ---
import type { TierResolver, TierContext } from './tier-resolver'
import { chefOverrideResolver } from './tiers/chef-override'
import { pinnedPriceResolver } from './tiers/pinned-price'
import { receiptPriceResolver } from './tiers/receipt-price'
import { apiQuoteResolver } from './tiers/api-quote'
import { wholesaleResolver } from './tiers/wholesale'
import { ingredientDenormalizedResolver } from './tiers/ingredient-denormalized'
import { directScrapeResolver } from './tiers/direct-scrape'
import { flyerPriceResolver } from './tiers/flyer-price'
import { instacartProxyResolver } from './tiers/instacart-proxy'
import { regionalAverageResolver } from './tiers/regional-average'
import { resolvedNationalResolver } from './tiers/resolved-national'
import { marketAggregateResolver } from './tiers/market-aggregate'
import { governmentResolver } from './tiers/government'
import { historicalResolver } from './tiers/historical'
import { categoryBaselineResolver } from './tiers/category-baseline'
import { syntheticDbResolver } from './tiers/synthetic-db'
import { syntheticInlineResolver } from './tiers/synthetic-inline'

// --- LRU Price Cache ---
// In-memory TTL cache to avoid repeated DB hits for the same ingredient+tenant
// within a short window. Especially valuable during menu/event costing where
// the same ingredient appears in multiple recipes.

interface CacheEntry {
  price: ResolvedPrice
  expiry: number
}

const PRICE_CACHE_TTL_MS = 60_000 // 60 seconds (single lookups)
const PRICE_CACHE_BATCH_TTL_MS = 300_000 // 5 minutes (batch operations, recipe/event costing)
const PRICE_CACHE_MAX_SIZE = 4000 // Max entries before eviction (raised for batch pre-warming)

const priceCache = new Map<string, CacheEntry>()

function priceCacheKey(ingredientId: string, tenantId: string, state?: string): string {
  return `${tenantId}:${ingredientId}:${state || ''}`
}

function getCachedPrice(key: string): ResolvedPrice | null {
  const entry = priceCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    priceCache.delete(key)
    return null
  }
  return entry.price
}

function setCachedPrice(key: string, price: ResolvedPrice, ttlMs?: number): void {
  // Simple size eviction: if over max, clear oldest 25%
  if (priceCache.size >= PRICE_CACHE_MAX_SIZE) {
    const keys = Array.from(priceCache.keys())
    const evictCount = Math.floor(PRICE_CACHE_MAX_SIZE * 0.25)
    for (let i = 0; i < evictCount; i++) {
      priceCache.delete(keys[i])
    }
  }
  priceCache.set(key, { price, expiry: Date.now() + (ttlMs || PRICE_CACHE_TTL_MS) })
}

/** Clear all cached prices. Call after mutations (cost refresh, chef override update). */
export function invalidatePriceCache(tenantId?: string): void {
  if (!tenantId) {
    priceCache.clear()
    return
  }
  for (const key of priceCache.keys()) {
    if (key.startsWith(`${tenantId}:`)) priceCache.delete(key)
  }
}

// --- Tier waterfall (ordered) ---

const tierResolvers: TierResolver[] = [
  chefOverrideResolver, // 0
  pinnedPriceResolver, // 0.5
  receiptPriceResolver, // 1
  apiQuoteResolver, // 2
  wholesaleResolver, // 2.5
  ingredientDenormalizedResolver, // 2.75
  directScrapeResolver, // 3
  flyerPriceResolver, // 4
  instacartProxyResolver, // 5
  regionalAverageResolver, // 6
  resolvedNationalResolver, // 6.25
  marketAggregateResolver, // 6.5
  governmentResolver, // 7
  historicalResolver, // 8
  categoryBaselineResolver, // 9
  syntheticDbResolver, // 9.5
  syntheticInlineResolver, // 10
]

// --- Single ingredient resolution ---

export async function resolvePrice(
  ingredientId: string,
  tenantId: string,
  options?: { preferredStore?: string; state?: string }
): Promise<ResolvedPrice> {
  // LRU cache check
  const cacheKey = priceCacheKey(ingredientId, tenantId, options?.state)
  const cached = getCachedPrice(cacheKey)
  if (cached) return cached

  const result = await resolvePriceUncached(ingredientId, tenantId, options)
  setCachedPrice(cacheKey, result)
  return result
}

async function resolvePriceUncached(
  ingredientId: string,
  tenantId: string,
  options?: { preferredStore?: string; state?: string }
): Promise<ResolvedPrice> {
  const preferredStore = options?.preferredStore || null
  const preferredState = options?.state || (await getChefHomeState(tenantId))

  const ctx: TierContext = {
    ingredientId,
    tenantId,
    preferredStore,
    preferredState,
  }

  for (const tier of tierResolvers) {
    try {
      const result = await tier.resolve(ctx)
      if (result) {
        // Apply compound-learning corrections (regional bias + confidence calibration)
        return applyLearningCorrections(result, preferredState)
      }
    } catch (err) {
      // Tier resolver failed - skip to next tier rather than surfacing a 500
      console.warn(`[PIE] Tier ${tier.name} failed for ingredient ${ingredientId}:`, err)
    }
  }

  // Should never reach here due to synthetic inline (PIE Law 9), but TypeScript needs this
  const spendFactor = await getSpendTierFactor(tenantId)
  const { cents, reason } = generateInlineSynthetic(null, preferredState, null, spendFactor)
  return withDecay({
    cents,
    unit: 'each',
    source: 'synthetic',
    sourceTier: 'category_floor_inline',
    resolutionTier: 'synthetic',
    store: 'Synthetic estimate',
    confidence: 0.1,
    freshness: 'stale' as PriceFreshness,
    confirmedAt: null,
    reason,
  })
}

// --- Batch resolution (N+1 avoidance) ---

/**
 * Resolve prices for multiple ingredients in 3 queries total.
 * Returns a Map from ingredient ID to resolved price.
 *
 * Strategy:
 *   1. One query for all receipt history rows
 *   2. One query for all grocery API quote rows
 *   3. One query for all OpenClaw history rows
 *   4. Resolve tier priority in memory
 */
export async function resolvePricesBatch(
  ingredientIds: string[],
  tenantId: string,
  options?: { preferredStore?: string; state?: string }
): Promise<Map<string, ResolvedPrice>> {
  const preferredStore = options?.preferredStore || null
  const preferredState = options?.state || (await getChefHomeState(tenantId))
  const spendFactor = await getSpendTierFactor(tenantId)
  const result = new Map<string, ResolvedPrice>()

  if (ingredientIds.length === 0) return result

  // Query 0: Chef standing overrides (Tier 0)
  const overrideRows = (await db.execute(sql`
    SELECT ingredient_id, price_cents, price_unit, source,
           confirmed_at::text AS confirmed_at, notes
    FROM chef_ingredient_prices
    WHERE ingredient_id = ANY(${ingredientIds})
      AND chef_id = ${tenantId}
      AND confirmed_at > NOW() - INTERVAL '90 days'
  `)) as unknown as Array<{
    ingredient_id: string
    price_cents: number
    price_unit: string
    source: string
    confirmed_at: string
    notes: string | null
  }>

  const overrideByIngredient = new Map<string, (typeof overrideRows)[0]>()
  for (const row of overrideRows) {
    overrideByIngredient.set(row.ingredient_id, row)
  }

  // Query 0.5: Pinned prices (Tier 0.5)
  const pinnedRows = (await db.execute(sql`
    SELECT id AS ingredient_id, pinned_price_cents, pinned_price_unit,
           pinned_price_source, pinned_price_vendor,
           pinned_price_set_at::text AS set_at
    FROM ingredients
    WHERE id = ANY(${ingredientIds})
      AND tenant_id = ${tenantId}
      AND pinned_price_cents IS NOT NULL
      AND pinned_price_cents > 0
      AND (pinned_price_expires_at IS NULL OR pinned_price_expires_at > NOW())
  `)) as unknown as Array<{
    ingredient_id: string
    pinned_price_cents: number
    pinned_price_unit: string | null
    pinned_price_source: string | null
    pinned_price_vendor: string | null
    set_at: string | null
  }>

  const pinnedPriceByIngredient = new Map<string, (typeof pinnedRows)[0]>()
  for (const row of pinnedRows) {
    pinnedPriceByIngredient.set(row.ingredient_id, row)
  }

  // Query 1: All receipt history rows for these ingredients
  const receiptRows = (await db.execute(sql`
    SELECT ingredient_id, price_per_unit_cents, unit, store_name, purchase_date, source
    FROM ingredient_price_history
    WHERE ingredient_id = ANY(${ingredientIds})
      AND tenant_id = ${tenantId}
      AND source IN ('manual', 'receipt', 'grocery_entry', 'po_receipt', 'vendor_invoice')
    ORDER BY ingredient_id, purchase_date DESC
  `)) as unknown as (PriceRow & { ingredient_id: string })[]

  // Query 2: Best API quote price per ingredient (most recent complete quote, within 30 days)
  const quoteRows = (await db.execute(sql`
    SELECT DISTINCT ON (qi.ingredient_id)
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
    WHERE qi.ingredient_id = ANY(${ingredientIds})
      AND q.tenant_id = ${tenantId}
      AND q.status IN ('complete', 'partial')
      AND q.created_at > NOW() - INTERVAL '30 days'
    ORDER BY qi.ingredient_id, q.created_at DESC
  `)) as unknown as QuoteRow[]

  // Query 3: All OpenClaw history rows for these ingredients
  const openclawRows = (await db.execute(sql`
    SELECT ingredient_id, price_per_unit_cents, unit, store_name, purchase_date, source
    FROM ingredient_price_history
    WHERE ingredient_id = ANY(${ingredientIds})
      AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
      AND source IN ('openclaw_scrape', 'openclaw_flyer', 'openclaw_instacart', 'openclaw_government', 'openclaw_wholesale')
    ORDER BY ingredient_id, source, purchase_date DESC
  `)) as unknown as (PriceRow & { ingredient_id: string })[]

  // Group by ingredient
  const receiptByIngredient = new Map<string, (PriceRow & { ingredient_id: string })[]>()
  for (const row of receiptRows) {
    if (!receiptByIngredient.has(row.ingredient_id)) receiptByIngredient.set(row.ingredient_id, [])
    receiptByIngredient.get(row.ingredient_id)!.push(row)
  }

  const quoteByIngredient = new Map<string, QuoteRow>()
  for (const row of quoteRows) {
    // DISTINCT ON already gives us one row per ingredient (most recent)
    if (!quoteByIngredient.has(row.ingredient_id)) {
      quoteByIngredient.set(row.ingredient_id, row)
    }
  }

  const openclawByIngredient = new Map<string, (PriceRow & { ingredient_id: string })[]>()
  for (const row of openclawRows) {
    if (!openclawByIngredient.has(row.ingredient_id))
      openclawByIngredient.set(row.ingredient_id, [])
    openclawByIngredient.get(row.ingredient_id)!.push(row)
  }

  // Query 4: Regional averages for all ingredients (batch)
  const regionalAverages = await getRegionalAveragesBatch(ingredientIds, preferredState)

  // Query 5: Get names, categories, and denormalized prices for all ingredients
  const categoryRows = (await db.execute(sql`
    SELECT id, name, category, last_price_cents, last_price_source, last_price_store,
           last_price_confidence, last_price_date::text AS last_price_date
    FROM ingredients WHERE id = ANY(${ingredientIds})
  `)) as unknown as Array<{
    id: string
    name: string
    category: string | null
    last_price_cents: number | null
    last_price_source: string | null
    last_price_store: string | null
    last_price_confidence: string | null
    last_price_date: string | null
  }>
  const categoryById = new Map<string, string | null>()
  const nameById = new Map<string, string>()
  const denormPriceById = new Map<
    string,
    {
      cents: number
      source: string | null
      store: string | null
      confidence: string | null
      date: string | null
    }
  >()
  for (const row of categoryRows) {
    categoryById.set(row.id, row.category)
    nameById.set(row.id, row.name)
    if (row.last_price_cents && row.last_price_cents > 0) {
      denormPriceById.set(row.id, {
        cents: row.last_price_cents,
        source: row.last_price_source,
        store: row.last_price_store,
        confidence: row.last_price_confidence,
        date: row.last_price_date,
      })
    }
  }

  // Query 6: Category baselines for all unique categories
  const uniqueCategories = [...new Set([...categoryById.values()].filter(Boolean))] as string[]
  const categoryBaselines = await getCategoryBaselinesBatch(uniqueCategories)

  // Query 6.25: Batch resolved_prices lookup via ingredient alias bridge
  type ResolvedNationalRow = {
    ingredient_id: string
    price_cents: number
    price_unit: string
    confidence: number
    source_count: number
    freshest: string | null
    computation_method: string
    region_name: string
  }
  const resolvedNationalByIngredient = new Map<string, ResolvedNationalRow>()
  try {
    const rnRows = (await db.execute(sql`
      SELECT DISTINCT ON (ia.ingredient_id)
        ia.ingredient_id,
        rp.price_cents, rp.price_unit, rp.confidence,
        rp.source_count,
        rp.freshest_observation::text AS freshest,
        rp.computation_method,
        pr.name AS region_name
      FROM ingredient_aliases ia
      JOIN system_ingredients si ON si.id = ia.system_ingredient_id
      JOIN openclaw.resolved_prices rp
        ON rp.canonical_ingredient_id = si.id::text
      JOIN openclaw.pricing_regions pr ON pr.id = rp.pricing_region_id
      WHERE ia.ingredient_id = ANY(${ingredientIds})
        AND ia.tenant_id = ${tenantId}
        AND ia.system_ingredient_id IS NOT NULL
        AND ia.match_method != 'dismissed'
        AND rp.price_type = 'retail'
        AND rp.confidence > 0.2
        AND (
          pr.slug = ${preferredState?.toLowerCase() || ''}
          OR rp.pricing_region_id IN (
            SELECT zc.pricing_region_id FROM openclaw.zip_centroids zc
            JOIN chefs ch ON ch.zip_code = zc.zip
            WHERE ch.id = ${tenantId}
          )
        )
      ORDER BY ia.ingredient_id, rp.confidence DESC
    `)) as unknown as ResolvedNationalRow[]

    for (const row of rnRows) {
      if (!resolvedNationalByIngredient.has(row.ingredient_id)) {
        resolvedNationalByIngredient.set(row.ingredient_id, row)
      }
    }
  } catch {
    // resolved_prices table may not exist yet; gracefully skip
  }

  // Query 7: Batch synthetic_prices lookup (Tier 9.5)
  // Bridge: ingredient name -> normalized slug -> synthetic_prices
  type SyntheticRow = {
    slug: string
    price_cents: number
    price_unit: string
    confidence: number
    derivation_method: string
    region_slug: string
    updated_at: string | null
  }
  const syntheticBySlug = new Map<string, SyntheticRow>()
  const slugById = new Map<string, string>()
  for (const id of ingredientIds) {
    const raw = nameById.get(id)
    if (raw) {
      const slug = normalizeIngredientName(raw).toLowerCase().replace(/\s+/g, '-')
      slugById.set(id, slug)
    }
  }
  const uniqueSlugs = [...new Set([...slugById.values()])]
  if (uniqueSlugs.length > 0) {
    try {
      const synRows = (await db.execute(sql`
        SELECT DISTINCT ON (sp.canonical_ingredient_id)
          sp.canonical_ingredient_id AS slug,
          sp.price_cents, sp.price_unit, sp.confidence,
          sp.derivation_method, pr.slug AS region_slug,
          sp.updated_at::text AS updated_at
        FROM openclaw.synthetic_prices sp
        JOIN openclaw.pricing_regions pr ON pr.id = sp.pricing_region_id
        WHERE sp.canonical_ingredient_id = ANY(${uniqueSlugs})
          AND (
            pr.slug = ${preferredState?.toLowerCase() || ''}
            OR sp.pricing_region_id IN (
              SELECT zc.pricing_region_id FROM openclaw.zip_centroids zc
              JOIN chefs ch ON ch.zip_code = zc.zip
              WHERE ch.id = ${tenantId}
            )
          )
        ORDER BY sp.canonical_ingredient_id, sp.confidence DESC
      `)) as unknown as SyntheticRow[]

      for (const row of synRows) {
        if (row.price_cents > 0) {
          syntheticBySlug.set(row.slug, row)
        }
      }
    } catch {
      // synthetic_prices table may not exist yet; skip
    }
  }

  // Resolve each ingredient
  const now = new Date()
  const daysAgo = (d: string) =>
    Math.floor((now.getTime() - new Date(d).getTime()) / (1000 * 60 * 60 * 24))

  for (const id of ingredientIds) {
    // Tier 0: Chef standing override
    const override = overrideByIngredient.get(id)
    if (override) {
      result.set(
        id,
        withDecay({
          cents: override.price_cents,
          unit: override.price_unit || 'each',
          source: 'chef_override',
          sourceTier: override.source,
          resolutionTier: 'chef_override',
          store: sourceDisplayStore('chef_override', null),
          confidence: 0.98,
          freshness: computeFreshness(override.confirmed_at),
          confirmedAt: override.confirmed_at,
          reason: override.notes,
        })
      )
      continue
    }

    // Tier 0.5: Pinned price (chef manually set, non-expired)
    const pinned = pinnedPriceByIngredient.get(id)
    if (pinned) {
      const pinStore = pinned.pinned_price_vendor
        ? `Pinned (${pinned.pinned_price_vendor})`
        : 'Pinned price'
      result.set(
        id,
        withDecay({
          cents: pinned.pinned_price_cents,
          unit: pinned.pinned_price_unit || 'each',
          source: 'pinned_price',
          sourceTier: pinned.pinned_price_source || 'manual_pin',
          resolutionTier: 'chef_receipt',
          store: pinStore,
          confidence: 0.95,
          freshness: computeFreshness(pinned.set_at),
          confirmedAt: pinned.set_at,
          reason: pinned.pinned_price_source ? `Pinned from: ${pinned.pinned_price_source}` : null,
        })
      )
      continue
    }

    const receipts = receiptByIngredient.get(id) || []
    const quote = quoteByIngredient.get(id)
    const openclaw = openclawByIngredient.get(id) || []

    // Tier 1: Recent receipt (within 90 days)
    const recentReceipt = receipts.find(
      (r) => r.price_per_unit_cents !== null && daysAgo(r.purchase_date) <= 90
    )
    if (recentReceipt && recentReceipt.price_per_unit_cents !== null) {
      result.set(
        id,
        withDecay({
          cents: recentReceipt.price_per_unit_cents,
          unit: recentReceipt.unit || 'each',
          source: 'receipt',
          sourceTier: recentReceipt.source,
          resolutionTier: 'chef_receipt',
          store: sourceDisplayStore('receipt', recentReceipt.store_name),
          confidence: 1.0,
          freshness: computeFreshness(recentReceipt.purchase_date),
          confirmedAt: recentReceipt.purchase_date,
          reason: null,
        })
      )
      continue
    }

    // Tier 2: API quote (within 30 days, already filtered by query)
    if (quote && quote.best_cents !== null && quote.best_cents > 0) {
      result.set(
        id,
        withDecay({
          cents: quote.best_cents,
          unit: 'each',
          source: 'api_quote',
          sourceTier: quote.source_label || 'api',
          resolutionTier: 'chef_receipt',
          store: sourceDisplayStore('api_quote', quote.source_label),
          confidence: 0.75,
          freshness: computeFreshness(quote.created_at),
          confirmedAt: quote.created_at,
          reason: null,
        })
      )
      continue
    }

    // Tier 2.75: Denormalized ingredient price (273K+ ingredients have fresh prices here)
    const denorm = denormPriceById.get(id)
    if (denorm) {
      const DENORM_SRC: Record<string, PriceSource> = {
        openclaw_market: 'direct_scrape',
        openclaw_flyer: 'flyer',
        openclaw_instacart: 'instacart',
      }
      const DENORM_CONF: Record<string, number> = {
        openclaw_market: 0.85,
        openclaw_flyer: 0.7,
        openclaw_instacart: 0.6,
      }
      const rawSrc = denorm.source || 'openclaw_market'
      const priceSrc: PriceSource = DENORM_SRC[rawSrc] || 'direct_scrape'
      const storedConf = denorm.confidence ? parseFloat(denorm.confidence) : null
      const conf =
        storedConf && storedConf > 0 ? Math.min(storedConf, 0.9) : DENORM_CONF[rawSrc] || 0.6
      result.set(
        id,
        withDecay({
          cents: denorm.cents,
          unit: 'each',
          source: priceSrc,
          sourceTier: rawSrc,
          resolutionTier: denorm.store ? 'regional' : 'market_national',
          store: sourceDisplayStore(priceSrc, denorm.store),
          confidence: conf,
          freshness: computeFreshness(denorm.date),
          confirmedAt: denorm.date,
          reason: null,
        })
      )
      continue
    }

    // Helper: find best row for a source, preferring the chef's store
    const findBestRow = (
      rows: (PriceRow & { ingredient_id: string })[],
      source: string,
      maxDays: number | null
    ) => {
      const eligible = rows.filter(
        (r) =>
          r.source === source &&
          r.price_per_unit_cents !== null &&
          (maxDays === null || daysAgo(r.purchase_date) <= maxDays)
      )
      if (eligible.length === 0) return undefined
      if (preferredStore) {
        const storeMatch = eligible.find(
          (r) => r.store_name?.toLowerCase() === preferredStore.toLowerCase()
        )
        if (storeMatch) return storeMatch
      }
      return eligible[0] // already ordered by purchase_date DESC
    }

    // Tier 2.5: Wholesale (within 30 days)
    const wholesaleRow = findBestRow(openclaw, 'openclaw_wholesale', 30)
    if (wholesaleRow && wholesaleRow.price_per_unit_cents !== null) {
      result.set(
        id,
        withDecay({
          cents: wholesaleRow.price_per_unit_cents,
          unit: wholesaleRow.unit || 'each',
          source: 'wholesale',
          sourceTier: 'openclaw_wholesale',
          resolutionTier: 'wholesale',
          store: sourceDisplayStore('wholesale', wholesaleRow.store_name),
          confidence: 0.8,
          freshness: computeFreshness(wholesaleRow.purchase_date),
          confirmedAt: wholesaleRow.purchase_date,
          reason: null,
        })
      )
      continue
    }

    // Tier 3: Direct scrape (within 14 days) [PostgreSQL fallback]
    const scrapeRow = findBestRow(openclaw, 'openclaw_scrape', 14)
    if (scrapeRow && scrapeRow.price_per_unit_cents !== null) {
      const batchScrapeStatus = await getMarketSeasonStatus(scrapeRow.store_name, preferredState)
      if (!shouldExcludeForSeason(batchScrapeStatus)) {
        const batchScrapeMult = seasonalConfidenceMultiplier(batchScrapeStatus)
        result.set(
          id,
          withDecay({
            cents: scrapeRow.price_per_unit_cents,
            unit: scrapeRow.unit || 'each',
            source: 'direct_scrape',
            sourceTier: 'openclaw_scrape',
            resolutionTier: tierForReceiptSource(
              'openclaw_scrape',
              scrapeRow.store_name,
              preferredState
            ),
            store: sourceDisplayStore('direct_scrape', scrapeRow.store_name),
            confidence: Math.min(0.85 * batchScrapeMult, 1.0),
            freshness: computeFreshness(scrapeRow.purchase_date),
            confirmedAt: scrapeRow.purchase_date,
            reason:
              batchScrapeStatus === 'in_season'
                ? 'Farmers market in-season (freshness boost)'
                : null,
          })
        )
        continue
      }
    }

    // Tier 4: Flyer (within 14 days)
    const flyerRow = findBestRow(openclaw, 'openclaw_flyer', 14)
    if (flyerRow && flyerRow.price_per_unit_cents !== null) {
      const batchFlyerStatus = await getMarketSeasonStatus(flyerRow.store_name, preferredState)
      if (!shouldExcludeForSeason(batchFlyerStatus)) {
        const batchFlyerMult = seasonalConfidenceMultiplier(batchFlyerStatus)
        result.set(
          id,
          withDecay({
            cents: flyerRow.price_per_unit_cents,
            unit: flyerRow.unit || 'each',
            source: 'flyer',
            sourceTier: 'openclaw_flyer',
            resolutionTier: tierForReceiptSource(
              'openclaw_flyer',
              flyerRow.store_name,
              preferredState
            ),
            store: sourceDisplayStore('flyer', flyerRow.store_name),
            confidence: Math.min(0.7 * batchFlyerMult, 1.0),
            freshness: computeFreshness(flyerRow.purchase_date),
            confirmedAt: flyerRow.purchase_date,
            reason:
              batchFlyerStatus === 'in_season'
                ? 'Farmers market in-season (freshness boost)'
                : null,
          })
        )
        continue
      }
    }

    // Tier 5: Instacart (within 30 days)
    const instacartRow = findBestRow(openclaw, 'openclaw_instacart', 30)
    if (instacartRow && instacartRow.price_per_unit_cents !== null) {
      const batchIcStatus = await getMarketSeasonStatus(instacartRow.store_name, preferredState)
      if (!shouldExcludeForSeason(batchIcStatus)) {
        const batchIcMult = seasonalConfidenceMultiplier(batchIcStatus)
        result.set(
          id,
          withDecay({
            cents: instacartRow.price_per_unit_cents,
            unit: instacartRow.unit || 'each',
            source: 'instacart',
            sourceTier: 'openclaw_instacart',
            resolutionTier: tierForReceiptSource(
              'openclaw_instacart',
              instacartRow.store_name,
              preferredState
            ),
            store: sourceDisplayStore('instacart', instacartRow.store_name),
            confidence: Math.min(0.6 * batchIcMult, 1.0),
            freshness: computeFreshness(instacartRow.purchase_date),
            confirmedAt: instacartRow.purchase_date,
            reason:
              batchIcStatus === 'in_season' ? 'Farmers market in-season (freshness boost)' : null,
          })
        )
        continue
      }
    }

    // Tier 6: Regional average (cross-store)
    const regional = regionalAverages.get(id)
    if (regional) {
      const daysSinceRegional = regional.mostRecentDate ? daysAgo(regional.mostRecentDate) : 999
      if (daysSinceRegional <= 60) {
        result.set(
          id,
          withDecay({
            cents: regional.avgPricePerUnitCents,
            unit: regional.mostCommonUnit,
            source: 'regional_average',
            sourceTier: 'regional_average',
            resolutionTier: 'regional',
            store: `Regional Average (${regional.storeCount} stores)`,
            confidence: 0.5,
            freshness: computeFreshness(regional.mostRecentDate),
            confirmedAt: regional.mostRecentDate,
            reason: null,
          })
        )
        continue
      }
    }

    // Tier 6.25: Resolved national (pre-computed per-region price via alias bridge)
    const resolvedNational = resolvedNationalByIngredient.get(id)
    if (resolvedNational && resolvedNational.price_cents > 0) {
      const isLocal = resolvedNational.computation_method !== 'cost_index_estimate'
      result.set(
        id,
        withDecay({
          cents: resolvedNational.price_cents,
          unit: resolvedNational.price_unit?.replace('per_', '') || 'each',
          source: 'resolved_national',
          sourceTier: resolvedNational.computation_method,
          resolutionTier: isLocal ? 'regional' : 'market_national',
          store: `${resolvedNational.region_name} (${resolvedNational.source_count} sources)`,
          confidence: Math.min(Number(resolvedNational.confidence), 0.7),
          freshness: computeFreshness(resolvedNational.freshest),
          confirmedAt: resolvedNational.freshest,
          reason: null,
        })
      )
      continue
    }

    // Tier 7: Government (no age limit, RPP-adjusted)
    const govRow = findBestRow(openclaw, 'openclaw_government', null)
    if (govRow && govRow.price_per_unit_cents !== null) {
      result.set(
        id,
        withDecay({
          cents: applyRpp(govRow.price_per_unit_cents, preferredState),
          unit: govRow.unit || 'each',
          source: 'government',
          sourceTier: 'openclaw_government',
          resolutionTier: 'government',
          store: sourceDisplayStore('government', null),
          confidence: 0.4,
          freshness: computeFreshness(govRow.purchase_date),
          confirmedAt: govRow.purchase_date,
          reason: preferredState
            ? `USDA avg adjusted for ${preferredState} (RPP ${STATE_RPP[preferredState] || 100})`
            : null,
        })
      )
      continue
    }

    // Tier 8: Historical average from receipts (any age)
    const allReceiptPrices = receipts
      .filter((r) => r.price_per_unit_cents !== null)
      .map((r) => r.price_per_unit_cents!)
    if (allReceiptPrices.length > 0) {
      const avg = Math.round(allReceiptPrices.reduce((a, b) => a + b, 0) / allReceiptPrices.length)
      const latestDate = receipts[0]?.purchase_date || null
      result.set(
        id,
        withDecay({
          cents: avg,
          unit: receipts[0]?.unit || 'each',
          source: 'historical',
          sourceTier: null,
          resolutionTier: 'historical',
          store: sourceDisplayStore('historical', null),
          confidence: 0.3,
          freshness: computeFreshness(latestDate),
          confirmedAt: latestDate,
          reason: null,
        })
      )
      continue
    }

    // Tier 9: Category baseline (RPP-adjusted)
    const category = categoryById.get(id)
    if (category) {
      const baseline = categoryBaselines.get(category)
      if (baseline) {
        result.set(
          id,
          withDecay({
            cents: applyRpp(baseline.medianCentsPerUnit, preferredState),
            unit: baseline.mostCommonUnit,
            source: 'category_baseline',
            sourceTier: 'category_baseline',
            resolutionTier: 'category_baseline',
            store: `${baseline.category} category estimate`,
            confidence: 0.2,
            freshness: 'stale',
            confirmedAt: null,
            reason: preferredState
              ? `Median of ${baseline.ingredientCount} ${baseline.category} items, adjusted for ${preferredState}`
              : `Based on median of ${baseline.ingredientCount} ${baseline.category} ingredients`,
          })
        )
        continue
      }
    }

    // Tier 9.5: Pre-computed synthetic price from synthetic engine
    const slug = slugById.get(id)
    const synRow = slug ? syntheticBySlug.get(slug) : undefined
    if (synRow) {
      result.set(
        id,
        withDecay({
          cents: synRow.price_cents,
          unit: synRow.price_unit?.replace('per_', '') || 'each',
          source: 'synthetic',
          sourceTier: synRow.derivation_method,
          resolutionTier: 'synthetic',
          store: `Synthetic (${synRow.derivation_method}, ${synRow.region_slug})`,
          confidence: Math.min(Number(synRow.confidence), 0.15),
          freshness: computeFreshness(synRow.updated_at),
          confirmedAt: synRow.updated_at,
          reason: `Synthetic price via ${synRow.derivation_method}`,
        })
      )
      continue
    }

    // Tier 10: INLINE SYNTHETIC (PIE Law 9: NEVER return null)
    // Category floor + RPP. Every ingredient gets a price. Always.
    const catForFloor = categoryById.get(id) || null
    const { cents: synCents, reason: synReason } = generateInlineSynthetic(
      catForFloor,
      preferredState,
      nameById.get(id) || null,
      spendFactor
    )
    result.set(
      id,
      withDecay({
        cents: synCents,
        unit: 'each',
        source: 'synthetic',
        sourceTier: 'category_floor_inline',
        resolutionTier: 'synthetic',
        store: 'Synthetic estimate',
        confidence: 0.1,
        freshness: 'stale',
        confirmedAt: null,
        reason: synReason,
      })
    )
  }

  // Apply compound-learning corrections (regional bias + confidence calibration)
  // to all batch results before caching. Skips chef overrides/receipts internally.
  for (const [id, price] of result) {
    const corrected = await applyLearningCorrections(price, preferredState)
    if (corrected !== price) {
      result.set(id, corrected)
    }
  }

  // Pre-warm LRU cache with batch results (5min TTL) so subsequent single
  // lookups (e.g. ingredient detail pages) hit memory instead of DB
  for (const [id, price] of result) {
    const key = priceCacheKey(id, tenantId, preferredState || undefined)
    setCachedPrice(key, price, PRICE_CACHE_BATCH_TTL_MS)
  }

  return result
}
