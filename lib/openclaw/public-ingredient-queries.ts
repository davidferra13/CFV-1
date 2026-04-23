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
import type { CatalogDetailResult } from '@/lib/openclaw/catalog-types'
import {
  getCatalogDetailFromContract,
  type CatalogIngredientRecord,
} from '@/lib/openclaw/catalog-detail-contract'
import { evaluateCanonicalIngredientPublicPublishability } from '@/lib/openclaw/public-ingredient-publish'

async function withPgTrgmSimilarityThreshold<T>(
  threshold: number,
  runner: (client: typeof pgClient) => Promise<T>
): Promise<T> {
  const transactionalClient = pgClient as typeof pgClient & {
    begin?: unknown
  }
  const begin = transactionalClient.begin as unknown as
    | ((callback: (tx: typeof pgClient) => Promise<T>) => Promise<T>)
    | undefined

  if (typeof begin !== 'function') {
    return runner(pgClient)
  }

  return begin(async (tx) => {
    const transactionClient = tx as typeof pgClient
    await transactionClient`SET LOCAL pg_trgm.similarity_threshold = ${threshold}`
    return runner(transactionClient)
  })
}

// ---------------------------------------------------------------------------
// Internal helpers (mirrors catalog-actions.ts normalisation helpers)
// ---------------------------------------------------------------------------

function normalizeCategory(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : 'uncategorized'
}

function normalizeUnit(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : 'each'
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
      COALESCE(NULLIF(standard_unit, ''), 'each') AS standard_unit,
      EXISTS (
        SELECT 1
        FROM openclaw.normalization_map nm
        JOIN openclaw.products p
          ON LOWER(TRIM(p.name)) = LOWER(TRIM(nm.raw_name))
         AND p.is_food = true
        WHERE nm.canonical_ingredient_id = ci.ingredient_id
      ) AS has_food_product_match
    FROM openclaw.canonical_ingredients ci
    WHERE ci.ingredient_id = ${ingredientId}
    LIMIT 1
  `

  if ((ingredientRows as any[]).length === 0) return null

  const ingredient = (ingredientRows as any[])[0]
  const publishability = evaluateCanonicalIngredientPublicPublishability({
    id: ingredient.ingredient_id as string,
    name: ingredient.name as string,
    category: (ingredient.category as string | null) ?? null,
    hasFoodProductMatch: Boolean(ingredient.has_food_product_match),
  })

  if (!publishability.allowed) return null

  const ingredientRecord: CatalogIngredientRecord = {
    id: ingredient.ingredient_id as string,
    name: ingredient.name as string,
    category: normalizeCategory(ingredient.category as string | null),
    standardUnit: normalizeUnit(ingredient.standard_unit as string | null),
  }

  return getCatalogDetailFromContract({
    ingredientId,
    visibility: 'public',
    ingredient: ingredientRecord,
  })
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
  const searchLimit = Math.min(Math.max(limit, 1) * 4, 40)

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
    LIMIT ${searchLimit}
  `

  if ((ftsRows as any[]).length > 0) {
    return (ftsRows as any[])
      .map((row) => ({
        id: String(row.id),
        name: String(row.name),
        category: normalizeCategory(row.category as string | null),
        standardUnit: normalizeUnit(row.standard_unit as string | null),
        hasPrice: false,
        bestPriceCents: null,
        bestPriceUnit: null,
      }))
      .filter(
        (row) =>
          evaluateCanonicalIngredientPublicPublishability({
            id: row.id,
            name: row.name,
            category: row.category,
            hasFoodProductMatch: false,
          }).allowed
      )
      .slice(0, limit)
  }

  // Trigram fallback for typos / partial names
  const trigramRows = await withPgTrgmSimilarityThreshold(
    0.25,
    (client) =>
      client`
      SELECT
        ci.ingredient_id AS id,
        ci.name,
        COALESCE(NULLIF(ci.category, ''), 'uncategorized') AS category,
        COALESCE(NULLIF(ci.standard_unit, ''), 'each') AS standard_unit,
        extensions.similarity(ci.name::text, ${normalized}::text) AS sim
      FROM openclaw.canonical_ingredients ci
      WHERE ci.name OPERATOR(extensions.%) ${normalized}
      ORDER BY sim DESC
      LIMIT ${searchLimit}
    `
  )

  return (trigramRows as any[])
    .map((row) => ({
      id: String(row.id),
      name: String(row.name),
      category: normalizeCategory(row.category as string | null),
      standardUnit: normalizeUnit(row.standard_unit as string | null),
      hasPrice: false,
      bestPriceCents: null,
      bestPriceUnit: null,
    }))
    .filter(
      (row) =>
        evaluateCanonicalIngredientPublicPublishability({
          id: row.id,
          name: row.name,
          category: row.category,
          hasFoodProductMatch: false,
        }).allowed
    )
    .slice(0, limit)
}

export interface PublicIngredientSpotlight {
  id: string
  name: string
  category: string
  ingredientHref: string
  storeCount: number
  inStockCount: number
  cheapestCents: number | null
  cheapestStore: string | null
  cheapestUnit: string | null
  avgCents: number | null
  lastConfirmedAt: string | null
}

/**
 * Resolve a short list of ingredient names into public market spotlights.
 * This reuses the public search + detail layer instead of introducing a second
 * homepage-only ingredient access path.
 */
export async function getPublicIngredientSpotlightsByNames(
  names: string[]
): Promise<PublicIngredientSpotlight[]> {
  const uniqueNames = Array.from(
    new Set(names.map((name) => name.trim()).filter((name) => name.length > 0))
  )
  if (uniqueNames.length === 0) return []

  const hits = await Promise.all(uniqueNames.map((name) => getBestIngredientHit(name)))

  const spotlights = await Promise.all(
    hits.map(async (hit, index) => {
      if (!hit) return null

      const detail = await getPublicIngredientDetail(hit.id)
      if (!detail || detail.summary.storeCount === 0 || detail.prices.length === 0) {
        return null
      }

      const cheapest = detail.prices.reduce((best, price) =>
        best == null || price.priceCents < best.priceCents ? price : best
      )
      const lastConfirmedAt = detail.prices.reduce<string | null>((latest, price) => {
        if (!price.lastConfirmedAt) return latest
        if (!latest) return price.lastConfirmedAt
        return price.lastConfirmedAt > latest ? price.lastConfirmedAt : latest
      }, null)
      const spotlight: PublicIngredientSpotlight = {
        id: detail.ingredient.id,
        name: detail.ingredient.name,
        category: detail.ingredient.category,
        ingredientHref: `/ingredient/${encodeURIComponent(detail.ingredient.id)}`,
        storeCount: detail.summary.storeCount,
        inStockCount: detail.summary.inStockCount,
        cheapestCents: detail.summary.cheapestCents,
        cheapestStore: detail.summary.cheapestStore,
        cheapestUnit: cheapest.priceUnit ?? null,
        avgCents: detail.summary.avgCents,
        lastConfirmedAt,
      }

      return {
        index,
        spotlight,
      }
    })
  )

  const resolvedSpotlights: Array<{ index: number; spotlight: PublicIngredientSpotlight }> = []
  for (const entry of spotlights) {
    if (entry) resolvedSpotlights.push(entry)
  }

  return resolvedSpotlights.sort((a, b) => a.index - b.index).map((entry) => entry.spotlight)
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
  const searchLimit = Math.min(Math.max(limit, 1) * 4, 24)
  const rows = await pgClient`
    SELECT DISTINCT ON (ci.ingredient_id)
      ci.ingredient_id AS id,
      ci.name,
      COALESCE(NULLIF(ci.standard_unit, ''), 'each') AS standard_unit
    FROM openclaw.canonical_ingredients ci
    JOIN openclaw.normalization_map nm ON nm.canonical_ingredient_id = ci.ingredient_id
    WHERE LOWER(COALESCE(NULLIF(ci.category, ''), 'uncategorized')) = LOWER(${category})
      AND ci.ingredient_id != ${excludeId}
    LIMIT ${searchLimit}
  `

  return (rows as any[])
    .map((row) => ({
      id: String(row.id),
      name: String(row.name),
      category,
      bestPriceCents: null,
      bestPriceUnit: normalizeUnit(row.standard_unit as string | null),
    }))
    .filter(
      (row) =>
        evaluateCanonicalIngredientPublicPublishability({
          id: row.id,
          name: row.name,
          category: row.category,
          hasFoodProductMatch: true,
        }).allowed
    )
    .slice(0, limit)
}

function normalizeIngredientName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreIngredientHit(query: string, hit: PublicIngredientSearchHit): number {
  const normalizedQuery = normalizeIngredientName(query)
  const normalizedName = normalizeIngredientName(hit.name)

  if (!normalizedQuery || !normalizedName) return 0
  if (normalizedName === normalizedQuery) return 100
  if (normalizedName.startsWith(`${normalizedQuery} `)) return 90
  if (normalizedName.includes(normalizedQuery)) return 75
  if (normalizedQuery.includes(normalizedName)) return 60
  return 0
}

async function getBestIngredientHit(query: string): Promise<PublicIngredientSearchHit | null> {
  const hits = await searchPublicIngredients(query, 5)
  if (hits.length === 0) return null

  const scored = hits
    .map((hit) => ({ hit, score: scoreIngredientHit(query, hit) }))
    .sort((a, b) => b.score - a.score)

  return scored[0]?.score > 0 ? scored[0].hit : hits[0]
}
