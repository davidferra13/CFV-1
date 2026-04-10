/**
 * Public ingredient queries - no authentication required.
 *
 * These read from the OpenClaw price catalog (scraped grocery prices).
 * This is not chef PII - it is the same public pricing data shown in the
 * catalog browser, just served without requiring a chef session.
 *
 * NOT a 'use server' file. Called from:
 *   - app/api/ingredients/[id]/route.ts (public API)
 *   - app/(public)/ingredient/[id]/page.tsx (shareable page)
 */

import { pgClient } from '@/lib/db'
import type { CatalogDetailResult, CatalogDetailPrice } from '@/lib/openclaw/catalog-types'

// ---------------------------------------------------------------------------
// Internal helpers (mirrors catalog-actions.ts normalisation helpers)
// ---------------------------------------------------------------------------

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return 0
}

function toIso(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function normalizeCategory(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : 'uncategorized'
}

function normalizeUnit(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : 'each'
}

function normalizeImage(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === 'none') return null
  return trimmed
}

// ---------------------------------------------------------------------------
// Ingredient lookup by canonical ID
// ---------------------------------------------------------------------------

export interface PublicIngredientSummary {
  id: string
  name: string
  category: string
  standardUnit: string
}

/**
 * Fetch full ingredient detail by canonical_ingredient ID.
 * Returns null if the ingredient does not exist.
 */
export async function getPublicIngredientDetail(
  ingredientId: string
): Promise<CatalogDetailResult | null> {
  const ingredientRows = await pgClient`
    SELECT
      ingredient_id,
      name,
      COALESCE(NULLIF(category, ''), 'uncategorized') AS category,
      COALESCE(NULLIF(standard_unit, ''), 'each') AS standard_unit
    FROM openclaw.canonical_ingredients
    WHERE ingredient_id = ${ingredientId}
    LIMIT 1
  `

  if ((ingredientRows as any[]).length === 0) return null

  const ingredient = (ingredientRows as any[])[0]

  // Two-step lookup to avoid the slow cross-join between products (13.9M rows)
  // and normalization_map. Each step uses indexed single-value lookups.
  //
  // Step 1: get a sample of raw_names for this ingredient (indexed, fast)
  // Step 2: for each raw_name, fetch ONE product ID via exact name match (index scan)
  // Step 3: batch-fetch store prices for those product IDs (product_id index, fast)
  //
  // This keeps the intermediate result bounded regardless of product table duplicates.
  const nmRows = await pgClient`
    SELECT LOWER(TRIM(raw_name)) AS rn
    FROM openclaw.normalization_map
    WHERE canonical_ingredient_id = ${ingredientId}
    ORDER BY confidence DESC NULLS LAST
    LIMIT 8
  `

  const rawNames = (nmRows as any[]).map((r: any) => r.rn as string)
  if (rawNames.length === 0) {
    // No normalization entries - ingredient has no price data
    return {
      ingredient: {
        id: ingredient.ingredient_id as string,
        name: ingredient.name as string,
        category: normalizeCategory(ingredient.category as string | null),
        standardUnit: normalizeUnit(ingredient.standard_unit as string | null),
      },
      prices: [],
      summary: {
        storeCount: 0,
        inStockCount: 0,
        outOfStockCount: 0,
        cheapestCents: null,
        cheapestStore: null,
        avgCents: null,
        hasSourceUrls: false,
      },
    }
  }

  // For each raw_name, get ONE product ID via single-value exact match (uses btree index)
  const productIdResults = await Promise.all(
    rawNames.map((rn) =>
      pgClient`
        SELECT id, COALESCE(NULLIF(size_unit, ''), 'each') AS size_unit, image_url, brand
        FROM openclaw.products
        WHERE LOWER(TRIM(name)) = ${rn}
          AND is_food = true
        LIMIT 1
      `.then((r) => (r as any[])[0] ?? null)
    )
  )

  const productSample = productIdResults.filter(Boolean) as Array<{
    id: string
    size_unit: string
    image_url: string | null
    brand: string | null
  }>

  if (productSample.length === 0) {
    return {
      ingredient: {
        id: ingredient.ingredient_id as string,
        name: ingredient.name as string,
        category: normalizeCategory(ingredient.category as string | null),
        standardUnit: normalizeUnit(ingredient.standard_unit as string | null),
      },
      prices: [],
      summary: {
        storeCount: 0,
        inStockCount: 0,
        outOfStockCount: 0,
        cheapestCents: null,
        cheapestStore: null,
        avgCents: null,
        hasSourceUrls: false,
      },
    }
  }

  const productIds = productSample.map((p) => p.id)
  const productMeta: Record<
    string,
    { size_unit: string; image_url: string | null; brand: string | null }
  > = {}
  for (const p of productSample) {
    productMeta[p.id] = { size_unit: p.size_unit, image_url: p.image_url, brand: p.brand }
  }

  // Batch-fetch store prices for these product IDs (product_id index is efficient for N <= 8)
  const rows = await pgClient`
    SELECT
      s.name AS store_name,
      s.city AS store_city,
      s.state AS store_state,
      sp.product_id,
      COALESCE(sp.sale_price_cents, sp.price_cents) AS price_cents,
      sp.price_type,
      sp.source,
      COALESCE(sp.in_stock, true) AS in_stock,
      sp.last_seen_at AS last_confirmed_at
    FROM openclaw.store_products sp
    JOIN openclaw.stores s ON s.id = sp.store_id AND s.is_active = true
    WHERE sp.product_id = ANY(${productIds}::uuid[])
      AND sp.price_cents > 0
    ORDER BY price_cents ASC NULLS LAST
  `

  // Dedup by store name: pick cheapest entry per store (rows already sorted by price ASC)
  const seenStores = new Set<string>()
  const prices: CatalogDetailPrice[] = []
  for (const row of rows as any[]) {
    const storeName = String(row.store_name)
    if (seenStores.has(storeName)) continue
    seenStores.add(storeName)
    const meta = productMeta[row.product_id] ?? { size_unit: 'each', image_url: null, brand: null }
    prices.push({
      store: storeName,
      storeCity: row.store_city ?? null,
      storeState: row.store_state ?? null,
      storeWebsite: null,
      priceCents: toNumber(row.price_cents),
      priceUnit: normalizeUnit(meta.size_unit),
      priceType: row.price_type ?? 'retail',
      pricingTier: row.price_type ?? 'retail',
      confidence: row.source?.includes('instacart') ? 'instacart_adjusted' : 'direct_scrape',
      inStock: Boolean(row.in_stock),
      sourceUrl: null,
      imageUrl: normalizeImage(meta.image_url),
      brand: meta.brand ?? null,
      aisleCat: null,
      lastConfirmedAt: toIso(row.last_confirmed_at) ?? new Date(0).toISOString(),
      lastChangedAt: toIso(row.last_confirmed_at) ?? new Date(0).toISOString(),
      packageSize: null,
    })
  }

  const inStockPrices = prices.filter((p) => p.inStock)
  const summary = {
    storeCount: prices.length,
    inStockCount: inStockPrices.length,
    outOfStockCount: prices.length - inStockPrices.length,
    cheapestCents: prices.length > 0 ? Math.min(...prices.map((p) => p.priceCents)) : null,
    cheapestStore:
      prices.length > 0
        ? prices.reduce((a, b) => (a.priceCents <= b.priceCents ? a : b)).store
        : null,
    avgCents:
      prices.length > 0
        ? Math.round(prices.reduce((s, p) => s + p.priceCents, 0) / prices.length)
        : null,
    hasSourceUrls: prices.some((p) => Boolean(p.sourceUrl || p.storeWebsite)),
  }

  return {
    ingredient: {
      id: ingredient.ingredient_id as string,
      name: ingredient.name as string,
      category: normalizeCategory(ingredient.category as string | null),
      standardUnit: normalizeUnit(ingredient.standard_unit as string | null),
    },
    prices,
    summary,
  }
}

// ---------------------------------------------------------------------------
// Fuzzy ingredient search (public - no auth)
// ---------------------------------------------------------------------------

export interface PublicIngredientSearchHit {
  id: string
  name: string
  category: string
  standardUnit: string
  hasPrice: boolean
  bestPriceCents: number | null
  bestPriceUnit: string | null
}

/**
 * Search for ingredients by name using full-text search + trigram fallback.
 * Returns the top matches sorted by relevance.
 */
export async function searchPublicIngredients(
  query: string,
  limit = 8
): Promise<PublicIngredientSearchHit[]> {
  const normalized = query.trim()
  if (!normalized) return []

  // FTS first (no correlated subqueries - keep it fast on 96K rows)
  const ftsRows = await pgClient`
    SELECT
      ci.ingredient_id AS id,
      ci.name,
      COALESCE(NULLIF(ci.category, ''), 'uncategorized') AS category,
      COALESCE(NULLIF(ci.standard_unit, ''), 'each') AS standard_unit,
      ts_rank(to_tsvector('english', ci.name), plainto_tsquery('english', ${normalized})) AS rank
    FROM openclaw.canonical_ingredients ci
    WHERE to_tsvector('english', ci.name) @@ plainto_tsquery('english', ${normalized})
    ORDER BY rank DESC
    LIMIT ${limit}
  `

  if ((ftsRows as any[]).length > 0) {
    return (ftsRows as any[]).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      category: normalizeCategory(row.category as string | null),
      standardUnit: normalizeUnit(row.standard_unit as string | null),
      hasPrice: false,
      bestPriceCents: null,
      bestPriceUnit: null,
    }))
  }

  // Trigram fallback for typos / partial names
  const trigramRows = await pgClient`
    SELECT
      ci.ingredient_id AS id,
      ci.name,
      COALESCE(NULLIF(ci.category, ''), 'uncategorized') AS category,
      COALESCE(NULLIF(ci.standard_unit, ''), 'each') AS standard_unit,
      extensions.similarity(ci.name::text, ${normalized}::text) AS sim
    FROM openclaw.canonical_ingredients ci
    WHERE extensions.similarity(ci.name::text, ${normalized}::text) > 0.25
    ORDER BY sim DESC
    LIMIT ${limit}
  `

  return (trigramRows as any[]).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    category: normalizeCategory(row.category as string | null),
    standardUnit: normalizeUnit(row.standard_unit as string | null),
    hasPrice: false,
    bestPriceCents: null,
    bestPriceUnit: null,
  }))
}

// ---------------------------------------------------------------------------
// Alternatives: same category, has price data, not the same ingredient
// ---------------------------------------------------------------------------

export interface PublicAlternative {
  id: string
  name: string
  category: string
  bestPriceCents: number | null
  bestPriceUnit: string | null
}

/**
 * Find alternative ingredients in the same category.
 * Used when the primary ingredient is hard to source.
 *
 * Uses a fast path (normalization_map join only, no product/store_products scan)
 * to avoid a 40+ second query. Alternatives serve as navigation links; exact
 * price data is loaded when the user visits the linked ingredient page.
 */
export async function getPublicAlternatives(
  category: string,
  excludeId: string,
  limit = 4
): Promise<PublicAlternative[]> {
  const rows = await pgClient`
    SELECT DISTINCT ON (ci.ingredient_id)
      ci.ingredient_id AS id,
      ci.name,
      COALESCE(NULLIF(ci.standard_unit, ''), 'each') AS standard_unit
    FROM openclaw.canonical_ingredients ci
    JOIN openclaw.normalization_map nm ON nm.canonical_ingredient_id = ci.ingredient_id
    WHERE LOWER(COALESCE(NULLIF(ci.category, ''), 'uncategorized')) = LOWER(${category})
      AND ci.ingredient_id != ${excludeId}
    LIMIT ${limit}
  `

  return (rows as any[]).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    category,
    bestPriceCents: null,
    bestPriceUnit: normalizeUnit(row.standard_unit as string | null),
  }))
}
