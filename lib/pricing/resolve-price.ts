/**
 * Unified Price Resolution Chain
 * Single function that resolves the best price for any ingredient
 * using a 10-tier fallback chain. ALL data comes from local PostgreSQL.
 *
 * This is NOT a 'use server' file. It's internal logic called by
 * server actions and server components.
 *
 * Resolution order (by trust):
 *   1. RECEIPT            - Chef's own purchase (manual, grocery_entry, po_receipt, vendor_invoice)
 *   2. API QUOTE          - Live API price from Kroger/Spoonacular/MealMe
 *   3. DIRECT SCRAPE      - Real store website price (openclaw_scrape)
 *   4. FLYER              - Weekly circular (openclaw_flyer)
 *   5. INSTACART          - Markup-adjusted proxy (openclaw_instacart)
 *   6. REGIONAL AVERAGE   - Cross-store average from all OpenClaw sources (2+ stores)
 *  6.5 MARKET AGGREGATE   - System-level market price via ingredient alias bridge
 *   7. GOVERNMENT         - BLS/USDA NE regional average (openclaw_government)
 *   8. HISTORICAL         - Chef's own average from past purchases
 *   9. CATEGORY BASELINE  - Category-level median (e.g., average spice price per oz)
 *  10. NONE               - No price data available
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { getRegionalAverage, getRegionalAveragesBatch } from './cross-store-average'
import { getCategoryBaseline, getCategoryBaselinesBatch } from './category-baseline'

// --- Types ---

export type PriceSource =
  | 'receipt'
  | 'api_quote'
  | 'wholesale'
  | 'direct_scrape'
  | 'flyer'
  | 'instacart'
  | 'regional_average'
  | 'market_aggregate'
  | 'government'
  | 'historical'
  | 'category_baseline'
  | 'none'

export type PriceFreshness = 'current' | 'recent' | 'stale' | 'none'

/**
 * Honest resolution tier for every price. This is what `<PriceSourceBadge>`
 * renders to users: it names where the number actually came from so the UI
 * cannot silently claim locality or authority the data does not have.
 *
 *   chef_receipt     - chef's own logged purchase or live API quote (trust: high)
 *   wholesale        - wholesale distributor pricing (trust: high)
 *   zip_local        - scraped from a store known to serve this chef/state (trust: high)
 *   regional         - cross-store median from regional_price_averages (trust: medium)
 *   market_state     - market aggregate that covers the requested state (trust: medium)
 *   market_national  - market aggregate, no state match or no state requested (trust: low)
 *   government       - USDA/BLS regional baseline (trust: low)
 *   historical       - chef's long-tail average across receipts (trust: low)
 *   category_baseline- category-level median estimate (trust: very low)
 *   none             - no data available (trust: none)
 */
export type ResolutionTier =
  | 'chef_receipt'
  | 'wholesale'
  | 'zip_local'
  | 'regional'
  | 'market_state'
  | 'market_national'
  | 'government'
  | 'historical'
  | 'category_baseline'
  | 'none'

export interface ResolvedPrice {
  cents: number | null
  unit: string
  source: PriceSource
  sourceTier: string | null
  /**
   * Honest geographic/authority tier for this price. Added 2026-04-10 to
   * stop the pricing engine from silently reporting national medians as if
   * they were local. Always set by resolvePrice / resolvePricesBatch.
   */
  resolutionTier: ResolutionTier
  store: string | null
  confidence: number
  /** Confidence adjusted for age. Decays over time. Use this for ranking. */
  effectiveConfidence: number
  freshness: PriceFreshness
  confirmedAt: string | null
  reason: string | null
}

interface PriceRow {
  price_per_unit_cents: number | null
  unit: string | null
  store_name: string | null
  purchase_date: string
  source: string
}

interface BatchRow extends PriceRow {
  ingredient_id: string
}

interface QuoteRow {
  ingredient_id: string
  best_cents: number | null
  source_label: string | null
  created_at: string
}

interface AvgRow {
  avg_cents: number | null
  unit: string | null
  latest_date: string | null
}

// --- Freshness ---

function computeFreshness(dateStr: string | null): PriceFreshness {
  if (!dateStr) return 'none'
  const date = new Date(dateStr)
  const now = new Date()
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff <= 3) return 'current'
  if (daysDiff <= 14) return 'recent'
  if (daysDiff <= 90) return 'stale'
  return 'none'
}

// --- Confidence Decay ---

/**
 * Step decay: confidence drops in tiers based on price age.
 * A 3-day-old receipt (base 1.0) stays at 1.0.
 * A 45-day-old Instacart price (base 0.6) drops to 0.3.
 * A 6-month-old government baseline (base 0.4) drops to 0.06.
 */
function decayConfidence(baseConfidence: number, dateStr: string | null): number {
  if (!dateStr) return baseConfidence * 0.15
  const ageDays = Math.floor(
    (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (ageDays <= 3) return baseConfidence
  if (ageDays <= 14) return baseConfidence * 0.9
  if (ageDays <= 30) return baseConfidence * 0.75
  if (ageDays <= 60) return baseConfidence * 0.5
  if (ageDays <= 90) return baseConfidence * 0.3
  return baseConfidence * 0.15
}

/** Add effectiveConfidence to a resolved price */
function withDecay(price: Omit<ResolvedPrice, 'effectiveConfidence'>): ResolvedPrice {
  return {
    ...price,
    effectiveConfidence:
      Math.round(decayConfidence(price.confidence, price.confirmedAt) * 100) / 100,
  }
}

/**
 * Pick the honest tier for a receipt-sourced price. A logged receipt from a
 * store the chef actually shopped at is `chef_receipt` regardless of where
 * we were asked for a price. If the receipt store name contains the preferred
 * state, it is additionally a `zip_local` signal for that state.
 */
function tierForReceiptSource(
  source: string,
  storeName: string | null,
  preferredState: string | null
): ResolutionTier {
  if (
    source === 'manual' ||
    source === 'grocery_entry' ||
    source === 'po_receipt' ||
    source === 'vendor_invoice'
  ) {
    return 'chef_receipt'
  }
  if (source === 'openclaw_wholesale') return 'wholesale'
  // Scrape/flyer/instacart: treat as zip_local only when we can see the state.
  if (
    preferredState &&
    storeName &&
    storeName.toLowerCase().includes(preferredState.toLowerCase())
  ) {
    return 'zip_local'
  }
  // Otherwise it is a scraped price with no geographic guarantee — fall back
  // to regional rather than claiming locality we cannot prove.
  return 'regional'
}

// --- Source display names ---

function sourceDisplayStore(source: PriceSource, storeName: string | null): string {
  switch (source) {
    case 'receipt':
      return storeName || 'Your receipt'
    case 'api_quote':
      return storeName || 'API quote'
    case 'wholesale':
      return storeName || 'Wholesale distributor'
    case 'direct_scrape':
      return storeName || 'Store website'
    case 'flyer':
      return storeName || 'Weekly circular'
    case 'instacart':
      return storeName ? `${storeName} (Instacart)` : 'Instacart'
    case 'regional_average':
      return storeName || 'Regional Average'
    case 'market_aggregate':
      return storeName || 'Market Average'
    case 'government':
      return 'USDA NE avg'
    case 'historical':
      return 'Your avg'
    case 'category_baseline':
      return storeName || 'Category estimate'
    case 'none':
      return ''
  }
}

// --- Single ingredient resolution ---

export async function resolvePrice(
  ingredientId: string,
  tenantId: string,
  options?: { preferredStore?: string; state?: string }
): Promise<ResolvedPrice> {
  const preferredStore = options?.preferredStore || null
  const preferredState = options?.state || null
  const noPrice: ResolvedPrice = {
    cents: null,
    unit: 'each',
    source: 'none',
    sourceTier: null,
    resolutionTier: 'none',
    store: null,
    confidence: 0,
    effectiveConfidence: 0,
    freshness: 'none',
    confirmedAt: null,
    reason: 'No price data. Log a receipt to set the price.',
  }

  // Tier 1: RECEIPT (manual, grocery_entry, po_receipt, vendor_invoice) within 90 days
  const receipt = (await db.execute(sql`
    SELECT price_per_unit_cents, unit, store_name, purchase_date, source
    FROM ingredient_price_history
    WHERE ingredient_id = ${ingredientId}
      AND tenant_id = ${tenantId}
      AND source IN ('manual', 'grocery_entry', 'po_receipt', 'vendor_invoice')
      AND purchase_date > CURRENT_DATE - INTERVAL '90 days'
    ORDER BY purchase_date DESC
    LIMIT 1
  `)) as unknown as PriceRow[]

  if (receipt.length > 0) {
    const row = receipt[0]
    if (row.price_per_unit_cents !== null) {
      return withDecay({
        cents: row.price_per_unit_cents,
        unit: row.unit || 'each',
        source: 'receipt',
        sourceTier: row.source,
        resolutionTier: 'chef_receipt',
        store: sourceDisplayStore('receipt', row.store_name),
        confidence: 1.0,
        freshness: computeFreshness(row.purchase_date),
        confirmedAt: row.purchase_date,
        reason: null,
      })
    }
  }

  // Tier 2: API QUOTE (Kroger/Spoonacular/MealMe) within 30 days
  // Picks the best (lowest non-null) price from the most recent quote for this tenant
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
    WHERE qi.ingredient_id = ${ingredientId}
      AND q.tenant_id = ${tenantId}
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

  // Tier 2.5: WHOLESALE (openclaw_wholesale) within 30 days
  const wholesale = (await db.execute(sql`
    SELECT price_per_unit_cents, unit, store_name, purchase_date
    FROM ingredient_price_history
    WHERE ingredient_id = ${ingredientId}
      AND tenant_id = ${tenantId}
      AND source = 'openclaw_wholesale'
      AND purchase_date > CURRENT_DATE - INTERVAL '30 days'
    ORDER BY purchase_date DESC
    LIMIT 1
  `)) as unknown as PriceRow[]

  if (wholesale.length > 0) {
    const row = wholesale[0]
    if (row.price_per_unit_cents !== null) {
      return withDecay({
        cents: row.price_per_unit_cents,
        unit: row.unit || 'each',
        source: 'wholesale',
        sourceTier: 'openclaw_wholesale',
        resolutionTier: 'wholesale',
        store: sourceDisplayStore('wholesale', row.store_name),
        confidence: 0.8,
        freshness: computeFreshness(row.purchase_date),
        confirmedAt: row.purchase_date,
        reason: null,
      })
    }
  }

  // Tier 3: DIRECT SCRAPE (openclaw_scrape) within 14 days
  // When preferredStore or state is set, prefer rows from that store/region
  const scrape = (await db.execute(sql`
    SELECT price_per_unit_cents, unit, store_name, purchase_date
    FROM ingredient_price_history
    WHERE ingredient_id = ${ingredientId}
      AND tenant_id = ${tenantId}
      AND source = 'openclaw_scrape'
      AND purchase_date > CURRENT_DATE - INTERVAL '14 days'
    ORDER BY
      CASE WHEN ${preferredStore} IS NOT NULL AND LOWER(store_name) = LOWER(${preferredStore}) THEN 0 ELSE 1 END,
      CASE WHEN ${preferredState} IS NOT NULL AND store_name ILIKE '%' || ${preferredState || ''} || '%' THEN 0 ELSE 1 END,
      purchase_date DESC
    LIMIT 1
  `)) as unknown as PriceRow[]

  if (scrape.length > 0) {
    const row = scrape[0]
    if (row.price_per_unit_cents !== null) {
      return withDecay({
        cents: row.price_per_unit_cents,
        unit: row.unit || 'each',
        source: 'direct_scrape',
        sourceTier: 'openclaw_scrape',
        resolutionTier: tierForReceiptSource('openclaw_scrape', row.store_name, preferredState),
        store: sourceDisplayStore('direct_scrape', row.store_name),
        confidence: 0.85,
        freshness: computeFreshness(row.purchase_date),
        confirmedAt: row.purchase_date,
        reason: null,
      })
    }
  }

  // Tier 4: FLYER (openclaw_flyer) within 14 days
  const flyer = (await db.execute(sql`
    SELECT price_per_unit_cents, unit, store_name, purchase_date
    FROM ingredient_price_history
    WHERE ingredient_id = ${ingredientId}
      AND tenant_id = ${tenantId}
      AND source = 'openclaw_flyer'
      AND purchase_date > CURRENT_DATE - INTERVAL '14 days'
    ORDER BY
      CASE WHEN ${preferredStore} IS NOT NULL AND LOWER(store_name) = LOWER(${preferredStore}) THEN 0 ELSE 1 END,
      CASE WHEN ${preferredState} IS NOT NULL AND store_name ILIKE '%' || ${preferredState || ''} || '%' THEN 0 ELSE 1 END,
      purchase_date DESC
    LIMIT 1
  `)) as unknown as PriceRow[]

  if (flyer.length > 0) {
    const row = flyer[0]
    if (row.price_per_unit_cents !== null) {
      return withDecay({
        cents: row.price_per_unit_cents,
        unit: row.unit || 'each',
        source: 'flyer',
        sourceTier: 'openclaw_flyer',
        resolutionTier: tierForReceiptSource('openclaw_flyer', row.store_name, preferredState),
        store: sourceDisplayStore('flyer', row.store_name),
        confidence: 0.7,
        freshness: computeFreshness(row.purchase_date),
        confirmedAt: row.purchase_date,
        reason: null,
      })
    }
  }

  // Tier 5: INSTACART (openclaw_instacart) within 30 days
  const instacart = (await db.execute(sql`
    SELECT price_per_unit_cents, unit, store_name, purchase_date
    FROM ingredient_price_history
    WHERE ingredient_id = ${ingredientId}
      AND tenant_id = ${tenantId}
      AND source = 'openclaw_instacart'
      AND purchase_date > CURRENT_DATE - INTERVAL '30 days'
    ORDER BY
      CASE WHEN ${preferredStore} IS NOT NULL AND LOWER(store_name) = LOWER(${preferredStore}) THEN 0 ELSE 1 END,
      CASE WHEN ${preferredState} IS NOT NULL AND store_name ILIKE '%' || ${preferredState || ''} || '%' THEN 0 ELSE 1 END,
      purchase_date DESC
    LIMIT 1
  `)) as unknown as PriceRow[]

  if (instacart.length > 0) {
    const row = instacart[0]
    if (row.price_per_unit_cents !== null) {
      return withDecay({
        cents: row.price_per_unit_cents,
        unit: row.unit || 'each',
        source: 'instacart',
        sourceTier: 'openclaw_instacart',
        resolutionTier: tierForReceiptSource('openclaw_instacart', row.store_name, preferredState),
        store: sourceDisplayStore('instacart', row.store_name),
        confidence: 0.6,
        freshness: computeFreshness(row.purchase_date),
        confirmedAt: row.purchase_date,
        reason: null,
      })
    }
  }

  // Tier 6: REGIONAL_AVERAGE (cross-store average from materialized view)
  const regionalAvg = await getRegionalAverage(ingredientId)
  if (regionalAvg) {
    // Check freshness: only use if most recent data is within 60 days
    const daysSinceRecent = regionalAvg.mostRecentDate
      ? Math.floor(
          (new Date().getTime() - new Date(regionalAvg.mostRecentDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 999
    if (daysSinceRecent <= 60) {
      return withDecay({
        cents: regionalAvg.avgPricePerUnitCents,
        unit: regionalAvg.mostCommonUnit,
        source: 'regional_average',
        sourceTier: 'regional_average',
        resolutionTier: 'regional',
        store: `Regional Average (${regionalAvg.storeCount} stores)`,
        confidence: 0.5,
        freshness: computeFreshness(regionalAvg.mostRecentDate),
        confirmedAt: regionalAvg.mostRecentDate,
        reason: null,
      })
    }
  }

  // Tier 6.5: MARKET AGGREGATE (system-level price via ingredient alias)
  // If this ingredient is aliased to a system_ingredient, check the pre-computed
  // market price from openclaw.system_ingredient_prices (aggregated from FTS-matched products).
  // When state is provided, boost confidence for SIP entries that include that state.
  const marketAgg = (await db.execute(sql`
    SELECT sip.avg_price_cents, sip.median_price_cents, sip.price_unit,
           sip.store_count, sip.state_count, sip.confidence,
           sip.newest_price_at::text AS newest_date,
           sip.states as covered_states
    FROM ingredient_aliases ia
    JOIN openclaw.system_ingredient_prices sip ON sip.system_ingredient_id = ia.system_ingredient_id
    WHERE ia.ingredient_id = ${ingredientId}
      AND ia.tenant_id = ${tenantId}
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
      const coversRequestedState = preferredState && statesArr.includes(preferredState)
      const baseConf = Math.min(parseFloat(String(row.confidence)) || 0.55, 0.65)
      const adjustedConf = coversRequestedState ? Math.min(baseConf + 0.1, 0.75) : baseConf

      return withDecay({
        cents: priceCents,
        unit: row.price_unit || 'each',
        source: 'market_aggregate',
        sourceTier: 'system_ingredient_market',
        resolutionTier: coversRequestedState ? 'market_state' : 'market_national',
        store: `Market Average (${row.store_count} stores, ${row.state_count} state${row.state_count !== 1 ? 's' : ''})`,
        confidence: adjustedConf,
        freshness: computeFreshness(row.newest_date),
        confirmedAt: row.newest_date,
        reason: null,
      })
    }
  }

  // Tier 7: GOVERNMENT (openclaw_government) - no age limit
  const gov = (await db.execute(sql`
    SELECT price_per_unit_cents, unit, purchase_date
    FROM ingredient_price_history
    WHERE ingredient_id = ${ingredientId}
      AND tenant_id = ${tenantId}
      AND source = 'openclaw_government'
    ORDER BY purchase_date DESC
    LIMIT 1
  `)) as unknown as PriceRow[]

  if (gov.length > 0) {
    const row = gov[0]
    if (row.price_per_unit_cents !== null) {
      return withDecay({
        cents: row.price_per_unit_cents,
        unit: row.unit || 'each',
        source: 'government',
        sourceTier: 'openclaw_government',
        resolutionTier: 'government',
        store: sourceDisplayStore('government', null),
        confidence: 0.4,
        freshness: computeFreshness(row.purchase_date),
        confirmedAt: row.purchase_date,
        reason: null,
      })
    }
  }

  // Tier 7: HISTORICAL - chef's own average from past purchases (any age)
  const historical = (await db.execute(sql`
    SELECT
      ROUND(AVG(price_per_unit_cents))::int as avg_cents,
      (ARRAY_AGG(unit ORDER BY purchase_date DESC))[1] as unit,
      MAX(purchase_date) as latest_date
    FROM ingredient_price_history
    WHERE ingredient_id = ${ingredientId}
      AND tenant_id = ${tenantId}
      AND source IN ('manual', 'grocery_entry', 'po_receipt', 'vendor_invoice')
      AND price_per_unit_cents IS NOT NULL
  `)) as unknown as AvgRow[]

  if (historical.length > 0) {
    const row = historical[0]
    if (row.avg_cents !== null) {
      return withDecay({
        cents: row.avg_cents,
        unit: row.unit || 'each',
        source: 'historical',
        sourceTier: null,
        resolutionTier: 'historical',
        store: sourceDisplayStore('historical', null),
        confidence: 0.3,
        freshness: computeFreshness(row.latest_date),
        confirmedAt: row.latest_date,
        reason: null,
      })
    }
  }

  // Tier 9: CATEGORY_BASELINE (category-level median from materialized view)
  // Need the ingredient's category for this lookup
  const ingredientCat = (await db.execute(sql`
    SELECT category FROM ingredients WHERE id = ${ingredientId} LIMIT 1
  `)) as unknown as Array<{ category: string | null }>

  if (ingredientCat.length > 0 && ingredientCat[0].category) {
    const baseline = await getCategoryBaseline(ingredientCat[0].category)
    if (baseline) {
      return withDecay({
        cents: baseline.medianCentsPerUnit,
        unit: baseline.mostCommonUnit,
        source: 'category_baseline',
        sourceTier: 'category_baseline',
        resolutionTier: 'category_baseline',
        store: `${baseline.category} category estimate`,
        confidence: 0.2,
        freshness: 'stale' as PriceFreshness,
        confirmedAt: null,
        reason: `Based on median of ${baseline.ingredientCount} ${baseline.category} ingredients`,
      })
    }
  }

  // Tier 10: NONE
  return noPrice
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
  const preferredState = options?.state || null
  const result = new Map<string, ResolvedPrice>()

  if (ingredientIds.length === 0) return result

  // Query 1: All receipt history rows for these ingredients
  const receiptRows = (await db.execute(sql`
    SELECT ingredient_id, price_per_unit_cents, unit, store_name, purchase_date, source
    FROM ingredient_price_history
    WHERE ingredient_id = ANY(${ingredientIds})
      AND tenant_id = ${tenantId}
      AND source IN ('manual', 'grocery_entry', 'po_receipt', 'vendor_invoice')
    ORDER BY ingredient_id, purchase_date DESC
  `)) as unknown as BatchRow[]

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
      AND tenant_id = ${tenantId}
      AND source IN ('openclaw_scrape', 'openclaw_flyer', 'openclaw_instacart', 'openclaw_government', 'openclaw_wholesale')
    ORDER BY ingredient_id, source, purchase_date DESC
  `)) as unknown as BatchRow[]

  // Group by ingredient
  const receiptByIngredient = new Map<string, BatchRow[]>()
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

  const openclawByIngredient = new Map<string, BatchRow[]>()
  for (const row of openclawRows) {
    if (!openclawByIngredient.has(row.ingredient_id))
      openclawByIngredient.set(row.ingredient_id, [])
    openclawByIngredient.get(row.ingredient_id)!.push(row)
  }

  // Query 4: Regional averages for all ingredients (batch)
  const regionalAverages = await getRegionalAveragesBatch(ingredientIds)

  // Query 5: Get categories for all ingredients (needed for category baseline fallback)
  const categoryRows = (await db.execute(sql`
    SELECT id, category FROM ingredients WHERE id = ANY(${ingredientIds})
  `)) as unknown as Array<{ id: string; category: string | null }>
  const categoryById = new Map<string, string | null>()
  for (const row of categoryRows) {
    categoryById.set(row.id, row.category)
  }

  // Query 6: Category baselines for all unique categories
  const uniqueCategories = [...new Set([...categoryById.values()].filter(Boolean))] as string[]
  const categoryBaselines = await getCategoryBaselinesBatch(uniqueCategories)

  // Resolve each ingredient
  const now = new Date()
  const daysAgo = (d: string) =>
    Math.floor((now.getTime() - new Date(d).getTime()) / (1000 * 60 * 60 * 24))

  for (const id of ingredientIds) {
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

    // Helper: find best row for a source, preferring the chef's store
    const findBestRow = (rows: BatchRow[], source: string, maxDays: number | null) => {
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

    // Tier 3: Direct scrape (within 14 days)
    const scrapeRow = findBestRow(openclaw, 'openclaw_scrape', 14)
    if (scrapeRow && scrapeRow.price_per_unit_cents !== null) {
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
          confidence: 0.85,
          freshness: computeFreshness(scrapeRow.purchase_date),
          confirmedAt: scrapeRow.purchase_date,
          reason: null,
        })
      )
      continue
    }

    // Tier 4: Flyer (within 14 days)
    const flyerRow = findBestRow(openclaw, 'openclaw_flyer', 14)
    if (flyerRow && flyerRow.price_per_unit_cents !== null) {
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
          confidence: 0.7,
          freshness: computeFreshness(flyerRow.purchase_date),
          confirmedAt: flyerRow.purchase_date,
          reason: null,
        })
      )
      continue
    }

    // Tier 5: Instacart (within 30 days)
    const instacartRow = findBestRow(openclaw, 'openclaw_instacart', 30)
    if (instacartRow && instacartRow.price_per_unit_cents !== null) {
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
          confidence: 0.6,
          freshness: computeFreshness(instacartRow.purchase_date),
          confirmedAt: instacartRow.purchase_date,
          reason: null,
        })
      )
      continue
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

    // Tier 7: Government (no age limit)
    const govRow = findBestRow(openclaw, 'openclaw_government', null)
    if (govRow && govRow.price_per_unit_cents !== null) {
      result.set(
        id,
        withDecay({
          cents: govRow.price_per_unit_cents,
          unit: govRow.unit || 'each',
          source: 'government',
          sourceTier: 'openclaw_government',
          resolutionTier: 'government',
          store: sourceDisplayStore('government', null),
          confidence: 0.4,
          freshness: computeFreshness(govRow.purchase_date),
          confirmedAt: govRow.purchase_date,
          reason: null,
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

    // Tier 9: Category baseline
    const category = categoryById.get(id)
    if (category) {
      const baseline = categoryBaselines.get(category)
      if (baseline) {
        result.set(
          id,
          withDecay({
            cents: baseline.medianCentsPerUnit,
            unit: baseline.mostCommonUnit,
            source: 'category_baseline',
            sourceTier: 'category_baseline',
            resolutionTier: 'category_baseline',
            store: `${baseline.category} category estimate`,
            confidence: 0.2,
            freshness: 'stale',
            confirmedAt: null,
            reason: `Based on median of ${baseline.ingredientCount} ${baseline.category} ingredients`,
          })
        )
        continue
      }
    }

    // Tier 10: None
    result.set(id, {
      cents: null,
      unit: 'each',
      source: 'none',
      sourceTier: null,
      resolutionTier: 'none',
      store: null,
      confidence: 0,
      effectiveConfidence: 0,
      freshness: 'none',
      confirmedAt: null,
      reason: 'No price data. Log a receipt to set the price.',
    })
  }

  return result
}
