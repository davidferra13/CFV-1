/**
 * Unified Price Resolution Chain
 * Single function that resolves the best price for any ingredient
 * using an 8-tier fallback chain. ALL data comes from local PostgreSQL.
 *
 * This is NOT a 'use server' file. It's internal logic called by
 * server actions and server components.
 *
 * Resolution order (by trust):
 *   1. RECEIPT      - Chef's own purchase (manual, grocery_entry, po_receipt, vendor_invoice)
 *   2. API QUOTE    - Live API price from Kroger/Spoonacular/MealMe (grocery_price_quote_items)
 *   3. DIRECT SCRAPE - Real store website price (openclaw_scrape)
 *   4. FLYER        - Weekly circular (openclaw_flyer)
 *   5. INSTACART    - Markup-adjusted proxy (openclaw_instacart)
 *   6. GOVERNMENT   - BLS/USDA NE regional average (openclaw_government)
 *   7. HISTORICAL   - Chef's own average from past purchases
 *   8. NONE         - No price data available
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// --- Types ---

export type PriceSource =
  | 'receipt'
  | 'api_quote'
  | 'direct_scrape'
  | 'flyer'
  | 'instacart'
  | 'government'
  | 'historical'
  | 'none'

export type PriceFreshness = 'current' | 'recent' | 'stale' | 'none'

export interface ResolvedPrice {
  cents: number | null
  unit: string
  source: PriceSource
  sourceTier: string | null
  store: string | null
  confidence: number
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

// --- Source display names ---

function sourceDisplayStore(source: PriceSource, storeName: string | null): string {
  switch (source) {
    case 'receipt':
      return storeName || 'Your receipt'
    case 'api_quote':
      return storeName || 'API quote'
    case 'direct_scrape':
      return storeName || 'Store website'
    case 'flyer':
      return storeName || 'Weekly circular'
    case 'instacart':
      return storeName ? `${storeName} (Instacart)` : 'Instacart'
    case 'government':
      return 'USDA NE avg'
    case 'historical':
      return 'Your avg'
    case 'none':
      return ''
  }
}

// --- Single ingredient resolution ---

export async function resolvePrice(
  ingredientId: string,
  tenantId: string,
  _options?: { preferredStore?: string }
): Promise<ResolvedPrice> {
  const noPrice: ResolvedPrice = {
    cents: null,
    unit: 'each',
    source: 'none',
    sourceTier: null,
    store: null,
    confidence: 0,
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
      return {
        cents: row.price_per_unit_cents,
        unit: row.unit || 'each',
        source: 'receipt',
        sourceTier: row.source,
        store: sourceDisplayStore('receipt', row.store_name),
        confidence: 1.0,
        freshness: computeFreshness(row.purchase_date),
        confirmedAt: row.purchase_date,
        reason: null,
      }
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
      return {
        cents: row.best_cents,
        unit: 'each',
        source: 'api_quote',
        sourceTier: row.source_label || 'api',
        store: sourceDisplayStore('api_quote', row.source_label),
        confidence: 0.75,
        freshness: computeFreshness(row.created_at),
        confirmedAt: row.created_at,
        reason: null,
      }
    }
  }

  // Tier 3: DIRECT SCRAPE (openclaw_scrape) within 14 days
  const scrape = (await db.execute(sql`
    SELECT price_per_unit_cents, unit, store_name, purchase_date
    FROM ingredient_price_history
    WHERE ingredient_id = ${ingredientId}
      AND tenant_id = ${tenantId}
      AND source = 'openclaw_scrape'
      AND purchase_date > CURRENT_DATE - INTERVAL '14 days'
    ORDER BY purchase_date DESC
    LIMIT 1
  `)) as unknown as PriceRow[]

  if (scrape.length > 0) {
    const row = scrape[0]
    if (row.price_per_unit_cents !== null) {
      return {
        cents: row.price_per_unit_cents,
        unit: row.unit || 'each',
        source: 'direct_scrape',
        sourceTier: 'openclaw_scrape',
        store: sourceDisplayStore('direct_scrape', row.store_name),
        confidence: 0.85,
        freshness: computeFreshness(row.purchase_date),
        confirmedAt: row.purchase_date,
        reason: null,
      }
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
    ORDER BY purchase_date DESC
    LIMIT 1
  `)) as unknown as PriceRow[]

  if (flyer.length > 0) {
    const row = flyer[0]
    if (row.price_per_unit_cents !== null) {
      return {
        cents: row.price_per_unit_cents,
        unit: row.unit || 'each',
        source: 'flyer',
        sourceTier: 'openclaw_flyer',
        store: sourceDisplayStore('flyer', row.store_name),
        confidence: 0.7,
        freshness: computeFreshness(row.purchase_date),
        confirmedAt: row.purchase_date,
        reason: null,
      }
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
    ORDER BY purchase_date DESC
    LIMIT 1
  `)) as unknown as PriceRow[]

  if (instacart.length > 0) {
    const row = instacart[0]
    if (row.price_per_unit_cents !== null) {
      return {
        cents: row.price_per_unit_cents,
        unit: row.unit || 'each',
        source: 'instacart',
        sourceTier: 'openclaw_instacart',
        store: sourceDisplayStore('instacart', row.store_name),
        confidence: 0.6,
        freshness: computeFreshness(row.purchase_date),
        confirmedAt: row.purchase_date,
        reason: null,
      }
    }
  }

  // Tier 6: GOVERNMENT (openclaw_government) - no age limit
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
      return {
        cents: row.price_per_unit_cents,
        unit: row.unit || 'each',
        source: 'government',
        sourceTier: 'openclaw_government',
        store: sourceDisplayStore('government', null),
        confidence: 0.4,
        freshness: computeFreshness(row.purchase_date),
        confirmedAt: row.purchase_date,
        reason: null,
      }
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
      return {
        cents: row.avg_cents,
        unit: row.unit || 'each',
        source: 'historical',
        sourceTier: null,
        store: sourceDisplayStore('historical', null),
        confidence: 0.3,
        freshness: computeFreshness(row.latest_date),
        confirmedAt: row.latest_date,
        reason: null,
      }
    }
  }

  // Tier 8: NONE
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
  tenantId: string
): Promise<Map<string, ResolvedPrice>> {
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
      AND source IN ('openclaw_scrape', 'openclaw_flyer', 'openclaw_instacart', 'openclaw_government')
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
      result.set(id, {
        cents: recentReceipt.price_per_unit_cents,
        unit: recentReceipt.unit || 'each',
        source: 'receipt',
        sourceTier: recentReceipt.source,
        store: sourceDisplayStore('receipt', recentReceipt.store_name),
        confidence: 1.0,
        freshness: computeFreshness(recentReceipt.purchase_date),
        confirmedAt: recentReceipt.purchase_date,
        reason: null,
      })
      continue
    }

    // Tier 2: API quote (within 30 days, already filtered by query)
    if (quote && quote.best_cents !== null && quote.best_cents > 0) {
      result.set(id, {
        cents: quote.best_cents,
        unit: 'each',
        source: 'api_quote',
        sourceTier: quote.source_label || 'api',
        store: sourceDisplayStore('api_quote', quote.source_label),
        confidence: 0.75,
        freshness: computeFreshness(quote.created_at),
        confirmedAt: quote.created_at,
        reason: null,
      })
      continue
    }

    // Tier 3: Direct scrape (within 14 days)
    const scrapeRow = openclaw.find(
      (r) =>
        r.source === 'openclaw_scrape' &&
        r.price_per_unit_cents !== null &&
        daysAgo(r.purchase_date) <= 14
    )
    if (scrapeRow && scrapeRow.price_per_unit_cents !== null) {
      result.set(id, {
        cents: scrapeRow.price_per_unit_cents,
        unit: scrapeRow.unit || 'each',
        source: 'direct_scrape',
        sourceTier: 'openclaw_scrape',
        store: sourceDisplayStore('direct_scrape', scrapeRow.store_name),
        confidence: 0.85,
        freshness: computeFreshness(scrapeRow.purchase_date),
        confirmedAt: scrapeRow.purchase_date,
        reason: null,
      })
      continue
    }

    // Tier 4: Flyer (within 14 days)
    const flyerRow = openclaw.find(
      (r) =>
        r.source === 'openclaw_flyer' &&
        r.price_per_unit_cents !== null &&
        daysAgo(r.purchase_date) <= 14
    )
    if (flyerRow && flyerRow.price_per_unit_cents !== null) {
      result.set(id, {
        cents: flyerRow.price_per_unit_cents,
        unit: flyerRow.unit || 'each',
        source: 'flyer',
        sourceTier: 'openclaw_flyer',
        store: sourceDisplayStore('flyer', flyerRow.store_name),
        confidence: 0.7,
        freshness: computeFreshness(flyerRow.purchase_date),
        confirmedAt: flyerRow.purchase_date,
        reason: null,
      })
      continue
    }

    // Tier 5: Instacart (within 30 days)
    const instacartRow = openclaw.find(
      (r) =>
        r.source === 'openclaw_instacart' &&
        r.price_per_unit_cents !== null &&
        daysAgo(r.purchase_date) <= 30
    )
    if (instacartRow && instacartRow.price_per_unit_cents !== null) {
      result.set(id, {
        cents: instacartRow.price_per_unit_cents,
        unit: instacartRow.unit || 'each',
        source: 'instacart',
        sourceTier: 'openclaw_instacart',
        store: sourceDisplayStore('instacart', instacartRow.store_name),
        confidence: 0.6,
        freshness: computeFreshness(instacartRow.purchase_date),
        confirmedAt: instacartRow.purchase_date,
        reason: null,
      })
      continue
    }

    // Tier 6: Government (no age limit)
    const govRow = openclaw.find(
      (r) => r.source === 'openclaw_government' && r.price_per_unit_cents !== null
    )
    if (govRow && govRow.price_per_unit_cents !== null) {
      result.set(id, {
        cents: govRow.price_per_unit_cents,
        unit: govRow.unit || 'each',
        source: 'government',
        sourceTier: 'openclaw_government',
        store: sourceDisplayStore('government', null),
        confidence: 0.4,
        freshness: computeFreshness(govRow.purchase_date),
        confirmedAt: govRow.purchase_date,
        reason: null,
      })
      continue
    }

    // Tier 7: Historical average from receipts (any age)
    const allReceiptPrices = receipts
      .filter((r) => r.price_per_unit_cents !== null)
      .map((r) => r.price_per_unit_cents!)
    if (allReceiptPrices.length > 0) {
      const avg = Math.round(allReceiptPrices.reduce((a, b) => a + b, 0) / allReceiptPrices.length)
      const latestDate = receipts[0]?.purchase_date || null
      result.set(id, {
        cents: avg,
        unit: receipts[0]?.unit || 'each',
        source: 'historical',
        sourceTier: null,
        store: sourceDisplayStore('historical', null),
        confidence: 0.3,
        freshness: computeFreshness(latestDate),
        confirmedAt: latestDate,
        reason: null,
      })
      continue
    }

    // Tier 8: None
    result.set(id, {
      cents: null,
      unit: 'each',
      source: 'none',
      sourceTier: null,
      store: null,
      confidence: 0,
      freshness: 'none',
      confirmedAt: null,
      reason: 'No price data. Log a receipt to set the price.',
    })
  }

  return result
}
