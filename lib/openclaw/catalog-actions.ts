'use server'

/**
 * OpenClaw Catalog Actions
 * Server actions for browsing the mirrored ingredient catalog stored in the
 * local PostgreSQL `openclaw` schema.
 *
 * ChefFlow request-time reads must stay on the local mirror. The Raspberry Pi
 * remains the upstream collector, but the website reads the PC-resident copy.
 */

import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { db, pgClient } from '@/lib/db'
import { ingredients } from '@/lib/db/schema/schema'
import { and, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCatalogDetailFromContract } from '@/lib/openclaw/catalog-detail-contract'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type CatalogSort = 'name' | 'price' | 'stores' | 'updated'

type CatalogQueryParams = {
  search?: string
  category?: string
  store?: string
  city?: string
  state?: string
  pricedOnly?: boolean
  inStockOnly?: boolean
  tier?: string
  sort?: string
  limit?: number
  offset?: number
}

type CatalogAggregateRow = {
  id: string
  name: string
  category: string | null
  standard_unit: string | null
  image_url: string | null
  brand: string | null
  price_count: number | string
  in_stock_count: number | string
  out_of_stock_count: number | string
  has_source_url: boolean | null
  last_updated: string | Date | null
  best_price_cents: number | string | null
  best_price_store: string | null
  best_price_unit: string | null
}

// --- Types ---

export type CatalogItem = {
  id: string
  name: string
  category: string
  bestPriceCents: number | null
  bestPriceStore: string | null
  bestPriceUnit: string | null
  priceCount: number
  lastUpdated: string | null
  trendPct: number | null
}

export type CatalogItemDetail = {
  store: string
  priceCents: number
  unit: string
  tier: string
  confidence: string
  lastConfirmedAt: string
}

export type CatalogStats = {
  total: number
  priced: number
  categories: { name: string; count: number }[]
}

export type CatalogSearchResult = {
  items: CatalogItem[]
  total: number
  categories: { name: string; count: number }[]
}

export type CatalogStore = {
  id: string
  name: string
  tier: string
  status: string
  logoUrl: string | null
  storeColor: string | null
  region: string | null
  city: string | null
  state: string | null
}

export type CatalogItemV2 = {
  id: string
  name: string
  category: string
  standardUnit: string
  bestPriceCents: number | null
  bestPriceStore: string | null
  bestPriceUnit: string | null
  imageUrl: string | null
  brand: string | null
  priceCount: number
  inStockCount: number
  outOfStockCount: number
  hasSourceUrl: boolean
  lastUpdated: string | null
}

import type { CatalogDetailPrice, CatalogDetailResult } from '@/lib/openclaw/catalog-types'
export type { CatalogDetailPrice, CatalogDetailResult } from '@/lib/openclaw/catalog-types'

export type CategoryCoverage = {
  category: string
  total: number
  priced: number
  coveragePct: number
}

export type ShoppingOptResult = {
  itemCount: number
  found: number
  notFound: number
  optimal: {
    totalCents: number
    totalDisplay: string
    missing: number
    items: { name: string; priceCents: number; store: string }[]
    savings: number
  }
  singleStoreRanking: {
    store: string
    totalCents: number
    totalDisplay: string
    available: number
    missing: number
  }[]
}

// --- Helpers ---

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

function normalizeStoreLocationPart(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : null
}

function buildStoreCoverageLabel(city: string | null | undefined, state: string | null | undefined) {
  const normalizedCity = normalizeStoreLocationPart(city)
  const normalizedState = normalizeStoreLocationPart(state)

  if (normalizedCity && normalizedState) return `${normalizedCity}, ${normalizedState}`
  return normalizedCity ?? normalizedState ?? null
}

function resolveCatalogSort(sort?: string): CatalogSort {
  switch (sort) {
    case 'price':
    case 'stores':
    case 'updated':
      return sort
    default:
      return 'name'
  }
}

function orderBySql(sort?: string): string {
  switch (resolveCatalogSort(sort)) {
    case 'price':
      return 'best_price_cents ASC NULLS LAST, name ASC, id ASC'
    case 'stores':
      return 'price_count DESC, name ASC, id ASC'
    case 'updated':
      return 'last_updated DESC NULLS LAST, name ASC, id ASC'
    case 'name':
    default:
      return 'name ASC, id ASC'
  }
}

function buildCatalogAggregateContext(params: CatalogQueryParams) {
  const values: unknown[] = []
  const bind = (value: unknown) => {
    values.push(value)
    return `$${values.length}`
  }

  const where: string[] = ['1=1']
  const storeJoinConditions: string[] = ['s.id = sp.store_id', 's.is_active = true']
  const priceJoinConditions: string[] = ['sp.product_id = p.id', 'sp.price_cents > 0']

  const normalizedSearch = params.search?.trim()
  if (normalizedSearch) {
    const searchPatternRef = bind(`%${normalizedSearch.toLowerCase()}%`)
    where.push(
      `(
        LOWER(ci.name) LIKE ${searchPatternRef}
        OR LOWER(COALESCE(nm.raw_name, '')) LIKE ${searchPatternRef}
        OR LOWER(COALESCE(p.name, '')) LIKE ${searchPatternRef}
      )`
    )
  }

  const normalizedCategory = params.category?.trim()
  if (normalizedCategory) {
    where.push(
      `LOWER(COALESCE(NULLIF(ci.category, ''), 'uncategorized')) = ${bind(
        normalizedCategory.toLowerCase()
      )}`
    )
  }

  const normalizedStore = params.store?.trim()
  if (normalizedStore) {
    if (UUID_PATTERN.test(normalizedStore)) {
      storeJoinConditions.push(`s.id = ${bind(normalizedStore)}`)
    } else {
      storeJoinConditions.push(`LOWER(s.name) = ${bind(normalizedStore.toLowerCase())}`)
    }
  }

  const normalizedState = params.state?.trim()
  if (normalizedState) {
    storeJoinConditions.push(`LOWER(s.state) = ${bind(normalizedState.toLowerCase())}`)
  }

  const normalizedCity = params.city?.trim()
  if (normalizedCity) {
    storeJoinConditions.push(`LOWER(s.city) ILIKE ${bind(`%${normalizedCity.toLowerCase()}%`)}`)
  }

  const normalizedTier = params.tier?.trim()
  if (normalizedTier) {
    priceJoinConditions.push(`sp.price_type = ${bind(normalizedTier)}`)
  }

  const aggregateSql = `
    SELECT
      ci.ingredient_id AS id,
      ci.name,
      COALESCE(NULLIF(ci.category, ''), 'uncategorized') AS category,
      COALESCE(NULLIF(ci.standard_unit, ''), 'each') AS standard_unit,
      COALESCE(
        MAX(NULLIF(p.image_url, '')),
        MAX(NULLIF(ci.off_image_url, 'none')),
        MAX(NULLIF(ci.off_image_url, ''))
      ) AS image_url,
      CASE
        WHEN COUNT(DISTINCT NULLIF(p.brand, '')) = 1 THEN MAX(NULLIF(p.brand, ''))
        ELSE NULL
      END AS brand,
      COUNT(DISTINCT s.id) FILTER (WHERE sp.id IS NOT NULL) AS price_count,
      COUNT(DISTINCT s.id) FILTER (
        WHERE sp.id IS NOT NULL AND COALESCE(sp.in_stock, true)
      ) AS in_stock_count,
      COUNT(DISTINCT s.id) FILTER (
        WHERE sp.id IS NOT NULL AND NOT COALESCE(sp.in_stock, true)
      ) AS out_of_stock_count,
      BOOL_OR(COALESCE(c.website_url, c.store_locator_url) IS NOT NULL) AS has_source_url,
      MAX(sp.last_seen_at) AS last_updated,
      MIN(COALESCE(sp.sale_price_cents, sp.price_cents)) FILTER (
        WHERE sp.id IS NOT NULL
      ) AS best_price_cents,
      (
        ARRAY_AGG(
          s.name
          ORDER BY COALESCE(sp.sale_price_cents, sp.price_cents) ASC NULLS LAST,
                   sp.last_seen_at DESC NULLS LAST
        ) FILTER (WHERE sp.id IS NOT NULL)
      )[1] AS best_price_store,
      COALESCE(NULLIF(ci.standard_unit, ''), 'each') AS best_price_unit
    FROM openclaw.canonical_ingredients ci
    LEFT JOIN openclaw.normalization_map nm
      ON nm.canonical_ingredient_id = ci.ingredient_id
    LEFT JOIN openclaw.products p
      ON LOWER(TRIM(p.name)) = LOWER(TRIM(nm.raw_name))
     AND p.is_food = true
    LEFT JOIN openclaw.store_products sp
      ON ${priceJoinConditions.join(' AND ')}
    LEFT JOIN openclaw.stores s
      ON ${storeJoinConditions.join(' AND ')}
    LEFT JOIN openclaw.chains c
      ON c.id = s.chain_id
    WHERE ${where.join(' AND ')}
    GROUP BY
      ci.ingredient_id,
      ci.name,
      ci.category,
      ci.standard_unit,
      ci.off_image_url
  `

  const outerFilters: string[] = []
  if (params.pricedOnly) outerFilters.push('price_count > 0')
  if (params.inStockOnly) outerFilters.push('in_stock_count > 0')

  return {
    aggregateSql,
    values,
    outerWhereSql: outerFilters.length > 0 ? `WHERE ${outerFilters.join(' AND ')}` : '',
  }
}

async function queryCatalogRows(params: CatalogQueryParams): Promise<{
  rows: CatalogAggregateRow[]
  total: number
  hasMore: boolean
  nextCursor?: string
}> {
  const context = buildCatalogAggregateContext(params)
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 10000)
  const offset = Math.max(params.offset ?? 0, 0)

  const dataValues = [...context.values]
  const bindData = (value: unknown) => {
    dataValues.push(value)
    return `$${dataValues.length}`
  }

  const dataSql = `
    WITH catalog AS (
      ${context.aggregateSql}
    )
    SELECT *
    FROM catalog
    ${context.outerWhereSql}
    ORDER BY ${orderBySql(params.sort)}
    LIMIT ${bindData(limit)}
    OFFSET ${bindData(offset)}
  `

  const countSql = `
    WITH catalog AS (
      ${context.aggregateSql}
    )
    SELECT COUNT(*)::int AS cnt
    FROM catalog
    ${context.outerWhereSql}
  `

  const [rows, countRows] = await Promise.all([
    pgClient.unsafe(dataSql, dataValues as any[]),
    pgClient.unsafe(countSql, context.values as any[]),
  ])

  const total = toNumber((countRows as any[])[0]?.cnt)

  return {
    rows: rows as unknown as CatalogAggregateRow[],
    total,
    hasMore: offset + (rows as any[]).length < total,
    nextCursor: offset + (rows as any[]).length < total ? String(offset + limit) : undefined,
  }
}

function mapCatalogItem(row: CatalogAggregateRow): CatalogItem {
  return {
    id: String(row.id),
    name: row.name ?? '',
    category: normalizeCategory(row.category),
    bestPriceCents: row.best_price_cents != null ? toNumber(row.best_price_cents) : null,
    bestPriceStore: row.best_price_store ?? null,
    bestPriceUnit: normalizeUnit(row.best_price_unit),
    priceCount: toNumber(row.price_count),
    lastUpdated: toIso(row.last_updated),
    trendPct: null,
  }
}

function mapCatalogItemV2(row: CatalogAggregateRow): CatalogItemV2 {
  return {
    id: String(row.id),
    name: row.name ?? '',
    category: normalizeCategory(row.category),
    standardUnit: normalizeUnit(row.standard_unit),
    bestPriceCents: row.best_price_cents != null ? toNumber(row.best_price_cents) : null,
    bestPriceStore: row.best_price_store ?? null,
    bestPriceUnit: normalizeUnit(row.best_price_unit),
    imageUrl: normalizeImage(row.image_url),
    brand: row.brand ?? null,
    priceCount: toNumber(row.price_count),
    inStockCount: toNumber(row.in_stock_count),
    outOfStockCount: toNumber(row.out_of_stock_count),
    hasSourceUrl: Boolean(row.has_source_url),
    lastUpdated: toIso(row.last_updated),
  }
}

async function getCatalogDetailInternal(ingredientId: string): Promise<CatalogDetailResult | null> {
  return getCatalogDetailFromContract({ ingredientId, visibility: 'internal' })
}

async function getCategoryCoverageInternal(): Promise<CategoryCoverage[]> {
  const rows = await pgClient`
    WITH priced AS (
      SELECT DISTINCT ci.ingredient_id
      FROM openclaw.canonical_ingredients ci
      JOIN openclaw.normalization_map nm
        ON nm.canonical_ingredient_id = ci.ingredient_id
      JOIN openclaw.products p
        ON LOWER(TRIM(p.name)) = LOWER(TRIM(nm.raw_name))
       AND p.is_food = true
      JOIN openclaw.store_products sp
        ON sp.product_id = p.id
       AND sp.price_cents > 0
      JOIN openclaw.stores s
        ON s.id = sp.store_id
       AND s.is_active = true
    )
    SELECT
      COALESCE(NULLIF(ci.category, ''), 'uncategorized') AS category,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE ci.ingredient_id IN (SELECT ingredient_id FROM priced))::int AS priced
    FROM openclaw.canonical_ingredients ci
    GROUP BY 1
    ORDER BY total DESC, category ASC
  `

  return (rows as any[]).map((row) => {
    const total = toNumber(row.total)
    const priced = toNumber(row.priced)
    return {
      category: normalizeCategory(row.category as string | null),
      total,
      priced,
      coveragePct: total > 0 ? Math.round((priced / total) * 100) : 0,
    }
  })
}

async function getCatalogStoresInternal(): Promise<CatalogStore[]> {
  const rows = await pgClient`
    SELECT
      s.id,
      s.name,
      s.city,
      s.state,
      s.store_type,
      c.logo_url,
      CASE
        WHEN s.last_cataloged_at IS NULL THEN 'pending'
        WHEN s.last_cataloged_at < now() - interval '14 days' THEN 'stale'
        ELSE 'active'
      END AS status
    FROM openclaw.stores s
    JOIN openclaw.chains c
      ON c.id = s.chain_id
    WHERE s.is_active = true
    ORDER BY c.name ASC, s.name ASC
  `

  return (rows as any[]).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    tier: (row.store_type as string | null) ?? 'retail',
    status: row.status as string,
    logoUrl: row.logo_url ?? null,
    storeColor: null,
    region: buildStoreCoverageLabel(row.city as string | null, row.state as string | null),
    city: normalizeStoreLocationPart(row.city as string | null),
    state: normalizeStoreLocationPart(row.state as string | null),
  }))
}

function pickBestSearchMatch(searchTerm: string, items: CatalogItemV2[]): CatalogItemV2 | null {
  if (items.length === 0) return null
  const normalizedSearch = searchTerm.trim().toLowerCase()
  return (
    items.find((item) => item.name.trim().toLowerCase() === normalizedSearch) ??
    items.find((item) => item.name.trim().toLowerCase().startsWith(normalizedSearch)) ??
    items[0]
  )
}

// --- Actions ---

export async function searchCatalog(params: {
  search?: string
  category?: string
  store?: string
  pricedOnly?: boolean
  sort?: 'name' | 'price' | 'stores' | 'updated'
  page?: number
  limit?: number
}): Promise<CatalogSearchResult> {
  await requireChef()

  const page = Math.max(params.page ?? 1, 1)
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 500)

  const result = await queryCatalogRows({
    search: params.search,
    category: params.category,
    store: params.store,
    pricedOnly: params.pricedOnly,
    sort: params.sort,
    limit,
    offset: (page - 1) * limit,
  })

  return {
    items: result.rows.map(mapCatalogItem),
    total: result.total,
    categories: [],
  }
}

export async function getCatalogStores(): Promise<CatalogStore[]> {
  await requireChef()
  return getCatalogStoresInternal()
}

export async function getCatalogStats(): Promise<CatalogStats> {
  await requireChef()

  const [totals, categories] = await Promise.all([
    // Use materialized view for the expensive priced-count query (was 22s, now <1ms)
    pgClient`
      SELECT total_ingredients AS total, priced_ingredients AS priced
      FROM openclaw.catalog_stats_mv
    `.catch(
      () =>
        // Fallback: fast approximate if MV doesn't exist
        pgClient`
        SELECT
          (SELECT COUNT(*)::int FROM openclaw.canonical_ingredients) AS total,
          0 AS priced
      `
    ),
    pgClient`
      SELECT
        COALESCE(NULLIF(category, ''), 'uncategorized') AS name,
        COUNT(*)::int AS count
      FROM openclaw.canonical_ingredients
      GROUP BY 1
      ORDER BY count DESC, name ASC
    `,
  ])

  return {
    total: toNumber((totals as any[])[0]?.total),
    priced: toNumber((totals as any[])[0]?.priced),
    categories: (categories as any[]).map((row) => ({
      name: normalizeCategory(row.name as string | null),
      count: toNumber(row.count),
    })),
  }
}

export async function getCatalogItemPrices(ingredientId: string): Promise<CatalogItemDetail[]> {
  await requireChef()

  const detail = await getCatalogDetailInternal(ingredientId)
  if (!detail) return []

  return detail.prices.map((price) => ({
    store: price.store,
    priceCents: price.priceCents,
    unit: price.priceUnit,
    tier: price.pricingTier,
    confidence: price.confidence,
    lastConfirmedAt: price.lastConfirmedAt,
  }))
}

/**
 * Search system_ingredients as a fallback when the OpenClaw catalog returns
 * zero results for a text query. Returns CatalogItemV2-shaped rows using
 * pricing from openclaw.system_ingredient_prices.
 *
 * Only invoked on empty search results - never slows down the primary path.
 */
async function searchSystemIngredientsFallback(
  search: string,
  limit: number
): Promise<CatalogItemV2[]> {
  const q = search.trim().toLowerCase()
  if (!q || q.length < 2) return []

  // FTS first, then trigram, dedup by id
  const rows = await pgClient`
    WITH fts AS (
      SELECT
        si.id::text                                          AS id,
        si.name,
        si.category::text                                   AS category,
        COALESCE(si.standard_unit, 'each')                  AS standard_unit,
        sip.median_price_cents                              AS best_price_cents,
        CASE WHEN sip.store_count IS NOT NULL
             THEN sip.store_count || ' stores'
             ELSE NULL
        END                                                 AS best_price_store,
        sip.price_unit                                      AS best_price_unit,
        NULL::text                                          AS image_url,
        NULL::text                                          AS brand,
        COALESCE(sip.store_count, 0)                        AS price_count,
        COALESCE(sip.store_count, 0)                        AS in_stock_count,
        0                                                   AS out_of_stock_count,
        false                                               AS has_source_url,
        sip.last_refreshed_at                               AS last_updated,
        1                                                   AS rank_source
      FROM system_ingredients si
      LEFT JOIN openclaw.system_ingredient_prices sip
        ON sip.system_ingredient_id = si.id
      WHERE si.is_active = true
        AND to_tsvector('english', si.name) @@ plainto_tsquery('english', ${q})
    ),
    trigram AS (
      SELECT
        si.id::text                                          AS id,
        si.name,
        si.category::text                                   AS category,
        COALESCE(si.standard_unit, 'each')                  AS standard_unit,
        sip.median_price_cents                              AS best_price_cents,
        CASE WHEN sip.store_count IS NOT NULL
             THEN sip.store_count || ' stores'
             ELSE NULL
        END                                                 AS best_price_store,
        sip.price_unit                                      AS best_price_unit,
        NULL::text                                          AS image_url,
        NULL::text                                          AS brand,
        COALESCE(sip.store_count, 0)                        AS price_count,
        COALESCE(sip.store_count, 0)                        AS in_stock_count,
        0                                                   AS out_of_stock_count,
        false                                               AS has_source_url,
        sip.last_refreshed_at                               AS last_updated,
        2                                                   AS rank_source
      FROM system_ingredients si
      LEFT JOIN openclaw.system_ingredient_prices sip
        ON sip.system_ingredient_id = si.id
      WHERE si.is_active = true
        AND extensions.similarity(lower(si.name), ${q}) > 0.25
    ),
    combined AS (
      SELECT * FROM fts
      UNION
      SELECT * FROM trigram
    )
    SELECT DISTINCT ON (id)
      id, name, category, standard_unit, best_price_cents,
      best_price_store, best_price_unit, image_url, brand,
      price_count, in_stock_count, out_of_stock_count, has_source_url,
      last_updated, rank_source
    FROM combined
    ORDER BY id, rank_source ASC
    LIMIT ${limit}
  `

  return (rows as any[]).map((row) => ({
    id: row.id,
    name: row.name ?? '',
    category: normalizeCategory(row.category),
    standardUnit: normalizeUnit(row.standard_unit),
    bestPriceCents: row.best_price_cents != null ? toNumber(row.best_price_cents) : null,
    bestPriceStore: row.best_price_store ?? null,
    bestPriceUnit: normalizeUnit(row.best_price_unit),
    imageUrl: null,
    brand: null,
    priceCount: toNumber(row.price_count),
    inStockCount: toNumber(row.in_stock_count),
    outOfStockCount: 0,
    hasSourceUrl: false,
    lastUpdated: toIso(row.last_updated),
  }))
}

export async function searchCatalogV2(params: {
  search?: string
  category?: string
  store?: string
  city?: string
  state?: string
  pricedOnly?: boolean
  inStockOnly?: boolean
  tier?: string
  sort?: string
  limit?: number
  after?: string
}): Promise<{
  items: CatalogItemV2[]
  total: number
  hasMore: boolean
  nextCursor?: string
  source?: 'openclaw' | 'system'
}> {
  await requireChef()

  const offset = params.after ? Math.max(parseInt(params.after, 10) || 0, 0) : 0
  const limit = params.limit ?? 50
  const result = await queryCatalogRows({
    search: params.search,
    category: params.category,
    store: params.store,
    city: params.city,
    state: params.state,
    pricedOnly: params.pricedOnly,
    inStockOnly: params.inStockOnly,
    tier: params.tier,
    sort: params.sort,
    limit,
    offset,
  })

  // Primary path: OpenClaw catalog has results
  if (result.total > 0) {
    return {
      items: result.rows.map(mapCatalogItemV2),
      total: result.total,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
      source: 'openclaw',
    }
  }

  // Fallback: no OpenClaw results for this search term - try system_ingredients.
  // Only applies when there is a non-trivial search query and no category/store filters
  // (those filters are meaningless against system_ingredients).
  const search = params.search?.trim()
  if (search && search.length >= 2 && !params.category && !params.store) {
    try {
      const fallbackItems = await searchSystemIngredientsFallback(search, limit)
      if (fallbackItems.length > 0) {
        return {
          items: fallbackItems,
          total: fallbackItems.length,
          hasMore: false,
          source: 'system',
        }
      }
    } catch (err) {
      console.error('[searchCatalogV2] System ingredients fallback failed:', err)
    }
  }

  return {
    items: [],
    total: 0,
    hasMore: false,
    source: 'openclaw',
  }
}

export async function getCatalogDetail(ingredientId: string): Promise<CatalogDetailResult | null> {
  await requireChef()
  return getCatalogDetailInternal(ingredientId)
}

export async function getCatalogCategories(): Promise<string[]> {
  await requireChef()

  const rows = await pgClient`
    SELECT DISTINCT COALESCE(NULLIF(category, ''), 'uncategorized') AS category
    FROM openclaw.canonical_ingredients
    ORDER BY category ASC
  `

  return (rows as any[])
    .map((row) => normalizeCategory(row.category as string | null))
    .filter((category, index, all) => all.indexOf(category) === index)
}

export async function addCatalogIngredientToLibrary(input: {
  name: string
  category: string
  defaultUnit: string
  priceCents?: number
  priceStore?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  try {
    const existing = await db
      .select({ id: ingredients.id })
      .from(ingredients)
      .where(
        and(
          eq(ingredients.tenantId, tenantId),
          sql`lower(${ingredients.name}) = lower(${input.name})`
        )
      )
      .limit(1)

    if (existing.length > 0) {
      return { success: false, error: 'Already in your library' }
    }

    const [inserted] = await db
      .insert(ingredients)
      .values({
        tenantId,
        name: input.name,
        category: input.category as any,
        defaultUnit: input.defaultUnit,
        lastPriceCents: input.priceCents ?? null,
        lastPriceStore: input.priceStore ?? null,
        lastPriceDate: input.priceCents
          ? ((_d) =>
              `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`)(
              new Date()
            )
          : null,
      })
      .returning({ id: ingredients.id })

    revalidatePath('/culinary/ingredients')

    return { success: true, id: inserted.id }
  } catch (err) {
    console.error('[catalog-v2] Add to library error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Failed to add ingredient' }
  }
}

export async function searchCatalogForExport(params: {
  search?: string
  category?: string
  store?: string
  pricedOnly?: boolean
  sort?: 'name' | 'price' | 'stores' | 'updated'
}): Promise<CatalogItem[]> {
  await requireChef()

  const result = await queryCatalogRows({
    search: params.search,
    category: params.category,
    store: params.store,
    pricedOnly: params.pricedOnly,
    sort: params.sort,
    limit: 10000,
    offset: 0,
  })

  return result.rows.map(mapCatalogItem)
}

export async function getCategoryCoverage(): Promise<CategoryCoverage[]> {
  await requireChef()
  return getCategoryCoverageInternal()
}

export async function getShoppingOptimizationAdmin(
  items: string[]
): Promise<ShoppingOptResult | null> {
  await requireAdmin()

  const trimmedItems = items
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 200)
  if (trimmedItems.length === 0) return null

  const optimalItems: { name: string; priceCents: number; store: string }[] = []
  let found = 0
  let notFound = 0
  let processed = 0

  const singleStoreMap = new Map<
    string,
    { totalCents: number; available: number; missing: number }
  >()

  for (const itemName of trimmedItems) {
    processed += 1

    const searchResult = await queryCatalogRows({
      search: itemName,
      pricedOnly: true,
      sort: 'price',
      limit: 5,
      offset: 0,
    })
    const match = pickBestSearchMatch(itemName, searchResult.rows.map(mapCatalogItemV2))

    if (!match || match.bestPriceCents == null) {
      notFound += 1
      for (const entry of singleStoreMap.values()) {
        entry.missing += 1
      }
      continue
    }

    found += 1
    optimalItems.push({
      name: itemName,
      priceCents: match.bestPriceCents,
      store: match.bestPriceStore ?? 'Unknown',
    })

    const detail = await getCatalogDetailInternal(match.id)
    const prices = detail?.prices ?? []
    const presentStores = new Set(prices.map((price) => price.store))

    for (const [store, entry] of singleStoreMap.entries()) {
      if (!presentStores.has(store)) {
        entry.missing += 1
      }
    }

    for (const price of prices) {
      let entry = singleStoreMap.get(price.store)
      if (!entry) {
        entry = { totalCents: 0, available: 0, missing: processed - 1 }
        singleStoreMap.set(price.store, entry)
      }

      if (price.inStock) {
        entry.totalCents += price.priceCents
        entry.available += 1
      } else {
        entry.missing += 1
      }
    }
  }

  const optimalTotalCents = optimalItems.reduce((sum, item) => sum + item.priceCents, 0)
  const singleStoreRanking = [...singleStoreMap.entries()]
    .map(([store, value]) => ({
      store,
      totalCents: value.totalCents,
      totalDisplay: `$${(value.totalCents / 100).toFixed(2)}`,
      available: value.available,
      missing: value.missing,
    }))
    .sort((a, b) => {
      if (a.missing !== b.missing) return a.missing - b.missing
      return a.totalCents - b.totalCents
    })

  const bestSingleStore = singleStoreRanking[0]?.totalCents ?? optimalTotalCents

  return {
    itemCount: trimmedItems.length,
    found,
    notFound,
    optimal: {
      totalCents: optimalTotalCents,
      totalDisplay: `$${(optimalTotalCents / 100).toFixed(2)}`,
      missing: notFound,
      items: optimalItems,
      savings: Math.max(0, bestSingleStore - optimalTotalCents),
    },
    singleStoreRanking,
  }
}

// ---------------------------------------------------------------------------
// System ingredient fallback search
// Used by the catalog browser when market data returns zero results.
// Searches system_ingredients by alias (exact), FTS, and trigram in order.
// ---------------------------------------------------------------------------

export type SystemIngredientMatch = {
  id: string
  name: string
  category: string
  subcategory: string
  aliases: string[]
  slug: string | null
  matchedVia: 'alias' | 'fts' | 'trigram'
}

export async function searchSystemIngredients(query: string): Promise<SystemIngredientMatch[]> {
  await requireChef()

  const q = query.trim().toLowerCase()
  if (!q || q.length < 2) return []

  // Strategy 1: exact alias match (GIN index, fast)
  const aliasRows = await pgClient<SystemIngredientMatch[]>`
    SELECT
      id::text,
      name,
      category,
      COALESCE(subcategory, '') AS subcategory,
      COALESCE(aliases, '{}') AS aliases,
      slug,
      'alias'::text AS "matchedVia"
    FROM system_ingredients
    WHERE is_active = true
      AND ${q} = ANY(aliases)
    LIMIT 8
  `

  if (aliasRows.length > 0) return aliasRows

  // Strategy 2: full-text search on name
  const ftsQuery = q
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(' & ')
  if (ftsQuery) {
    const ftsRows = await pgClient<SystemIngredientMatch[]>`
      SELECT
        id::text,
        name,
        category,
        COALESCE(subcategory, '') AS subcategory,
        COALESCE(aliases, '{}') AS aliases,
        slug,
        'fts'::text AS "matchedVia"
      FROM system_ingredients
      WHERE is_active = true
        AND to_tsvector('english', name) @@ to_tsquery('english', ${ftsQuery})
      ORDER BY ts_rank(to_tsvector('english', name), to_tsquery('english', ${ftsQuery})) DESC
      LIMIT 8
    `
    if (ftsRows.length > 0) return ftsRows
  }

  // Strategy 3: trigram similarity (catches misspellings and partial matches)
  const trigramRows = await pgClient<SystemIngredientMatch[]>`
    SELECT
      id::text,
      name,
      category,
      COALESCE(subcategory, '') AS subcategory,
      COALESCE(aliases, '{}') AS aliases,
      slug,
      'trigram'::text AS "matchedVia"
    FROM system_ingredients
    WHERE is_active = true
      AND extensions.similarity(lower(name), ${q}) > 0.25
    ORDER BY extensions.similarity(lower(name), ${q}) DESC
    LIMIT 8
  `

  return trigramRows
}

// ---------------------------------------------------------------------------
// Add a system ingredient to the chef's personal ingredient library
// ---------------------------------------------------------------------------

export async function addSystemIngredientToLibrary(
  systemIngredientId: string,
  overrides?: { priceCents?: number; unit?: string; vendor?: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()

  // Fetch the system ingredient
  const rows = await pgClient<{ name: string; category: string; standard_unit: string }[]>`
    SELECT name, category, standard_unit
    FROM system_ingredients
    WHERE id = ${systemIngredientId}::uuid AND is_active = true
    LIMIT 1
  `
  if (rows.length === 0) return { success: false, error: 'System ingredient not found' }

  const si = rows[0]
  const unit = overrides?.unit ?? si.standard_unit ?? 'g'

  try {
    // Check if this chef already has this ingredient linked
    const existing = await pgClient<{ id: string }[]>`
      SELECT i.id FROM ingredients i
      WHERE i.tenant_id = ${user.tenantId!}::uuid
        AND i.system_ingredient_id = ${systemIngredientId}::uuid
      LIMIT 1
    `
    if (existing.length > 0) {
      return { success: true, id: existing[0].id }
    }

    // Insert into chef's ingredient library via raw SQL (system_ingredient_id not in generated schema)
    const inserted = await pgClient<{ id: string }[]>`
      INSERT INTO ingredients (
        tenant_id, name, category, default_unit, price_unit,
        system_ingredient_id, average_price_cents, last_price_cents,
        last_price_date, preferred_vendor
      ) VALUES (
        ${user.tenantId!}::uuid,
        ${si.name},
        ${si.category}::ingredient_category,
        ${unit},
        ${unit},
        ${systemIngredientId}::uuid,
        ${overrides?.priceCents ?? null},
        ${overrides?.priceCents ?? null},
        ${overrides?.priceCents ? ((_d) => `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`)(new Date()) : null},
        ${overrides?.vendor ?? null}
      )
      RETURNING id::text
    `

    revalidatePath('/culinary/ingredients')
    revalidatePath('/culinary/price-catalog')

    return { success: true, id: inserted[0]?.id }
  } catch (err) {
    console.error(
      '[catalog] addSystemIngredientToLibrary error:',
      err instanceof Error ? err.message : err
    )
    return { success: false, error: 'Failed to add ingredient to library' }
  }
}

// ---------------------------------------------------------------------------
// Ingredient knowledge lookup (for catalog expanded detail panel)
// ---------------------------------------------------------------------------

export type CatalogIngredientKnowledge = {
  wikiSummary: string | null
  flavorProfile: string | null
  culinaryUses: string | null
  typicalPairings: string[]
  dietaryFlags: string[]
  originCountries: string[]
  taxonName: string | null
  imageUrl: string | null
  wikipediaUrl: string | null
}

export async function getIngredientKnowledgeForCatalog(
  name: string
): Promise<CatalogIngredientKnowledge | null> {
  if (!name?.trim()) return null

  try {
    const rows = await pgClient<
      {
        wiki_summary: string | null
        flavor_profile: string | null
        culinary_uses: string | null
        typical_pairings: string[]
        dietary_flags: string[]
        origin_countries: string[]
        taxon_name: string | null
        image_url: string | null
        wikipedia_url: string | null
      }[]
    >`
      SELECT
        k.wiki_summary, k.flavor_profile, k.culinary_uses,
        k.typical_pairings, k.dietary_flags, k.origin_countries,
        k.taxon_name, k.image_url, k.wikipedia_url,
        extensions.similarity(si.name, ${name}) AS sim
      FROM system_ingredients si
      JOIN ingredient_knowledge k ON k.system_ingredient_id = si.id
      WHERE si.is_active = true
        AND k.needs_review = false
        AND k.wiki_summary IS NOT NULL
        AND extensions.similarity(si.name, ${name}) > 0.30
      ORDER BY sim DESC
      LIMIT 1
    `

    const row = rows[0]
    if (!row) return null

    return {
      wikiSummary: row.wiki_summary ?? null,
      flavorProfile: row.flavor_profile ?? null,
      culinaryUses: row.culinary_uses ?? null,
      typicalPairings: row.typical_pairings ?? [],
      dietaryFlags: row.dietary_flags ?? [],
      originCountries: row.origin_countries ?? [],
      taxonName: row.taxon_name ?? null,
      imageUrl: row.image_url ?? null,
      wikipediaUrl: row.wikipedia_url ?? null,
    }
  } catch {
    return null
  }
}
