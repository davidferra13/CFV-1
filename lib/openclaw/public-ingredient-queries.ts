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

  const rows = await pgClient`
    WITH matched AS (
      SELECT
        s.id AS store_id,
        s.name AS store_name,
        s.city AS store_city,
        s.state AS store_state,
        COALESCE(c.website_url, c.store_locator_url) AS store_website,
        COALESCE(sp.sale_price_cents, sp.price_cents) AS price_cents,
        COALESCE(NULLIF(ci.standard_unit, ''), NULLIF(p.size_unit, ''), 'each') AS price_unit,
        sp.price_type,
        sp.source,
        COALESCE(sp.in_stock, true) AS in_stock,
        COALESCE(
          NULLIF(p.image_url, ''),
          NULLIF(ci.off_image_url, 'none'),
          ci.off_image_url
        ) AS image_url,
        p.brand,
        COALESCE(pc.department, pc.name) AS aisle_cat,
        sp.last_seen_at AS last_confirmed_at,
        sp.last_seen_at AS last_changed_at,
        p.size AS package_size,
        ROW_NUMBER() OVER (
          PARTITION BY s.id
          ORDER BY COALESCE(sp.sale_price_cents, sp.price_cents) ASC NULLS LAST,
                   sp.last_seen_at DESC NULLS LAST
        ) AS store_rank
      FROM openclaw.canonical_ingredients ci
      LEFT JOIN openclaw.normalization_map nm
        ON nm.canonical_ingredient_id = ci.ingredient_id
      LEFT JOIN openclaw.products p
        ON LOWER(TRIM(p.name)) = LOWER(TRIM(nm.raw_name))
       AND p.is_food = true
      LEFT JOIN openclaw.store_products sp
        ON sp.product_id = p.id
       AND sp.price_cents > 0
      LEFT JOIN openclaw.stores s
        ON s.id = sp.store_id
       AND s.is_active = true
      LEFT JOIN openclaw.chains c
        ON c.id = s.chain_id
      LEFT JOIN openclaw.product_categories pc
        ON pc.id = p.category_id
      WHERE ci.ingredient_id = ${ingredientId}
    )
    SELECT
      store_name,
      store_city,
      store_state,
      store_website,
      price_cents,
      price_unit,
      price_type,
      source,
      in_stock,
      image_url,
      brand,
      aisle_cat,
      last_confirmed_at,
      last_changed_at,
      package_size
    FROM matched
    WHERE store_rank = 1
      AND store_id IS NOT NULL
    ORDER BY price_cents ASC NULLS LAST, store_name ASC
  `

  const prices: CatalogDetailPrice[] = (rows as any[]).map((row) => ({
    store: String(row.store_name),
    storeCity: row.store_city ?? null,
    storeState: row.store_state ?? null,
    storeWebsite: row.store_website ?? null,
    priceCents: toNumber(row.price_cents),
    priceUnit: normalizeUnit(row.price_unit),
    priceType: row.price_type ?? 'retail',
    pricingTier: row.price_type ?? 'retail',
    confidence: row.source?.includes('instacart') ? 'instacart_adjusted' : 'direct_scrape',
    inStock: Boolean(row.in_stock),
    sourceUrl: null,
    imageUrl: normalizeImage(row.image_url),
    brand: row.brand ?? null,
    aisleCat: row.aisle_cat ?? null,
    lastConfirmedAt: toIso(row.last_confirmed_at) ?? new Date(0).toISOString(),
    lastChangedAt: toIso(row.last_changed_at) ?? new Date(0).toISOString(),
    packageSize: row.package_size ?? null,
  }))

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
