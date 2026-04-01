'use server'

/**
 * OpenClaw Store Catalog Actions
 * Server actions for browsing the full store inventory catalog
 * stored in the local PostgreSQL `openclaw` schema.
 *
 * Different from catalog-actions.ts which queries the Pi API directly.
 * These actions read from the local PostgreSQL database, populated by
 * the pull service (scripts/openclaw-pull/pull.mjs).
 */

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'

// ── Types ──────────────────────────────────────────────────────────────────

export type ChainInfo = {
  id: string
  slug: string
  name: string
  storeCount: number
}

export type StoreWithDistance = {
  id: string
  chainId: string
  chainName: string
  chainSlug: string
  name: string
  address: string | null
  city: string
  state: string
  zip: string
  lat: number | null
  lng: number | null
  phone: string | null
  lastCatalogedAt: string | null
  distanceMiles: number | null
  productCount: number
}

export type StoreProduct = {
  id: string
  productId: string
  productName: string
  brand: string | null
  size: string | null
  priceCents: number
  salePriceCents: number | null
  saleEndsAt: string | null
  inStock: boolean
  aisle: string | null
  source: string
  lastSeenAt: string
  isOrganic: boolean
  isStoreBrand: boolean
  categoryName: string | null
  department: string | null
}

export type StoreCatalogStats = {
  chains: number
  stores: number
  products: number
  foodProducts: number
  prices: number
  ingredients: number
  normMappings: number
  usdaBaselines: number
  freshPrices: number
  categories: number
  lastSync: string | null
  chainsWithData: { name: string; prices: number }[]
}

// ── Server Actions ─────────────────────────────────────────────────────────

export async function getStoreCatalogStats(): Promise<StoreCatalogStats> {
  await requireChef()

  const [
    chainsResult,
    storesResult,
    productsResult,
    foodResult,
    pricesResult,
    syncResult,
    ingredientsResult,
    normResult,
    usdaResult,
    freshResult,
    catsResult,
    chainDataResult,
  ] = await Promise.all([
    pgClient`SELECT count(*)::int AS cnt FROM openclaw.chains WHERE is_active = true`,
    pgClient`SELECT count(*)::int AS cnt FROM openclaw.stores WHERE is_active = true`,
    pgClient`SELECT count(*)::int AS cnt FROM openclaw.products`,
    pgClient`SELECT count(*)::int AS cnt FROM openclaw.products WHERE is_food = true`,
    pgClient`SELECT count(*)::int AS cnt FROM openclaw.store_products`,
    pgClient`SELECT started_at FROM openclaw.sync_runs ORDER BY started_at DESC LIMIT 1`,
    pgClient`SELECT count(*)::int AS cnt FROM openclaw.canonical_ingredients`,
    pgClient`SELECT count(*)::int AS cnt FROM openclaw.normalization_map`,
    pgClient`SELECT count(*)::int AS cnt FROM openclaw.usda_price_baselines`,
    pgClient`SELECT count(*)::int AS cnt FROM openclaw.store_products WHERE last_seen_at > now() - interval '7 days'`,
    pgClient`SELECT count(*)::int AS cnt FROM openclaw.product_categories WHERE is_food = true`,
    pgClient`
      SELECT c.name, count(sp.id)::int AS prices
      FROM openclaw.chains c
      JOIN openclaw.stores s ON s.chain_id = c.id
      JOIN openclaw.store_products sp ON sp.store_id = s.id
      GROUP BY c.name
      ORDER BY prices DESC
    `,
  ])

  return {
    chains: chainsResult[0]?.cnt ?? 0,
    stores: storesResult[0]?.cnt ?? 0,
    products: productsResult[0]?.cnt ?? 0,
    foodProducts: foodResult[0]?.cnt ?? 0,
    prices: pricesResult[0]?.cnt ?? 0,
    ingredients: ingredientsResult[0]?.cnt ?? 0,
    normMappings: normResult[0]?.cnt ?? 0,
    usdaBaselines: usdaResult[0]?.cnt ?? 0,
    freshPrices: freshResult[0]?.cnt ?? 0,
    categories: catsResult[0]?.cnt ?? 0,
    lastSync: syncResult[0]?.started_at
      ? syncResult[0].started_at instanceof Date
        ? syncResult[0].started_at.toISOString()
        : String(syncResult[0].started_at)
      : null,
    chainsWithData: (chainDataResult as any[]).map((r: any) => ({
      name: r.name,
      prices: r.prices,
    })),
  }
}

export async function getChains(): Promise<ChainInfo[]> {
  await requireChef()

  const rows = await pgClient`
    SELECT c.id, c.slug, c.name,
      (SELECT count(*)::int FROM openclaw.stores s WHERE s.chain_id = c.id AND s.is_active = true) AS store_count
    FROM openclaw.chains c
    WHERE c.is_active = true
    ORDER BY c.name
  `

  return rows.map((r: any) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    storeCount: r.store_count ?? 0,
  }))
}

export async function getNearbyStores(
  lat: number,
  lng: number,
  radiusMiles: number = 25
): Promise<StoreWithDistance[]> {
  await requireChef()

  const rows = await pgClient`
    SELECT s.id, s.chain_id, c.name AS chain_name, c.slug AS chain_slug,
      s.name, s.address, s.city, s.state, s.zip, s.lat, s.lng,
      s.phone, s.last_cataloged_at,
      (3959 * acos(
        LEAST(1.0, cos(radians(${lat})) * cos(radians(s.lat)) *
        cos(radians(s.lng) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(s.lat)))
      )) AS distance_miles,
      (SELECT count(*)::int FROM openclaw.store_products sp WHERE sp.store_id = s.id) AS product_count
    FROM openclaw.stores s
    JOIN openclaw.chains c ON c.id = s.chain_id
    WHERE s.is_active = true
      AND s.lat IS NOT NULL
      AND s.lng IS NOT NULL
      AND (3959 * acos(
        LEAST(1.0, cos(radians(${lat})) * cos(radians(s.lat)) *
        cos(radians(s.lng) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(s.lat)))
      )) < ${radiusMiles}
    ORDER BY distance_miles
    LIMIT 50
  `

  return rows.map((r: any) => ({
    id: r.id,
    chainId: r.chain_id,
    chainName: r.chain_name,
    chainSlug: r.chain_slug,
    name: r.name,
    address: r.address,
    city: r.city,
    state: r.state,
    zip: r.zip,
    lat: r.lat ? Number(r.lat) : null,
    lng: r.lng ? Number(r.lng) : null,
    phone: r.phone,
    lastCatalogedAt: r.last_cataloged_at?.toISOString() ?? null,
    distanceMiles: r.distance_miles != null ? Math.round(Number(r.distance_miles) * 10) / 10 : null,
    productCount: r.product_count ?? 0,
  }))
}

export async function getStoreInventory(input: {
  storeId: string
  department?: string
  search?: string
  foodOnly?: boolean
  page?: number
  limit?: number
}): Promise<{ products: StoreProduct[]; total: number; departments: string[] }> {
  await requireChef()

  const page = input.page ?? 1
  const limit = Math.min(input.limit ?? 50, 200)
  const offset = (page - 1) * limit
  const foodOnly = input.foodOnly ?? true

  // Get departments for this store
  const deptRows = await pgClient`
    SELECT DISTINCT pc.department
    FROM openclaw.store_products sp
    JOIN openclaw.products p ON p.id = sp.product_id
    LEFT JOIN openclaw.product_categories pc ON pc.id = p.category_id
    WHERE sp.store_id = ${input.storeId}
      AND pc.department IS NOT NULL
    ORDER BY pc.department
  `
  const departments = deptRows.map((r: any) => r.department as string)

  // Build product query
  const searchPattern = input.search ? `%${input.search}%` : null

  const rows = await pgClient`
    SELECT sp.id, sp.product_id, p.name AS product_name, p.brand, p.size,
      sp.price_cents, sp.sale_price_cents, sp.sale_ends_at,
      sp.in_stock, sp.aisle, sp.source, sp.last_seen_at,
      p.is_organic, p.is_store_brand,
      pc.name AS category_name, pc.department
    FROM openclaw.store_products sp
    JOIN openclaw.products p ON p.id = sp.product_id
    LEFT JOIN openclaw.product_categories pc ON pc.id = p.category_id
    WHERE sp.store_id = ${input.storeId}
      ${input.department ? pgClient`AND pc.department = ${input.department}` : pgClient``}
      ${searchPattern ? pgClient`AND p.name ILIKE ${searchPattern}` : pgClient``}
      ${foodOnly ? pgClient`AND (pc.is_food IS NULL OR pc.is_food = true)` : pgClient``}
    ORDER BY p.name
    LIMIT ${limit} OFFSET ${offset}
  `

  // Get total count
  const countRows = await pgClient`
    SELECT count(*)::int AS cnt
    FROM openclaw.store_products sp
    JOIN openclaw.products p ON p.id = sp.product_id
    LEFT JOIN openclaw.product_categories pc ON pc.id = p.category_id
    WHERE sp.store_id = ${input.storeId}
      ${input.department ? pgClient`AND pc.department = ${input.department}` : pgClient``}
      ${searchPattern ? pgClient`AND p.name ILIKE ${searchPattern}` : pgClient``}
      ${foodOnly ? pgClient`AND (pc.is_food IS NULL OR pc.is_food = true)` : pgClient``}
  `

  return {
    products: rows.map((r: any) => ({
      id: r.id,
      productId: r.product_id,
      productName: r.product_name,
      brand: r.brand,
      size: r.size,
      priceCents: r.price_cents,
      salePriceCents: r.sale_price_cents,
      saleEndsAt: r.sale_ends_at?.toISOString() ?? null,
      inStock: r.in_stock ?? true,
      aisle: r.aisle,
      source: r.source,
      lastSeenAt: r.last_seen_at?.toISOString() ?? new Date().toISOString(),
      isOrganic: r.is_organic ?? false,
      isStoreBrand: r.is_store_brand ?? false,
      categoryName: r.category_name,
      department: r.department,
    })),
    total: countRows[0]?.cnt ?? 0,
    departments,
  }
}

export async function searchStoreProducts(
  query: string,
  limit: number = 25
): Promise<StoreProduct[]> {
  await requireChef()

  if (!query || query.trim().length < 2) return []

  const rows = await pgClient`
    SELECT sp.id, sp.product_id, p.name AS product_name, p.brand, p.size,
      sp.price_cents, sp.sale_price_cents, sp.sale_ends_at,
      sp.in_stock, sp.aisle, sp.source, sp.last_seen_at,
      p.is_organic, p.is_store_brand,
      pc.name AS category_name, pc.department
    FROM openclaw.products p
    JOIN openclaw.store_products sp ON sp.product_id = p.id
    LEFT JOIN openclaw.product_categories pc ON pc.id = p.category_id
    WHERE to_tsvector('english', p.name) @@ plainto_tsquery('english', ${query})
    ORDER BY sp.price_cents ASC
    LIMIT ${limit}
  `

  return rows.map((r: any) => ({
    id: r.id,
    productId: r.product_id,
    productName: r.product_name,
    brand: r.brand,
    size: r.size,
    priceCents: r.price_cents,
    salePriceCents: r.sale_price_cents,
    saleEndsAt: r.sale_ends_at?.toISOString() ?? null,
    inStock: r.in_stock ?? true,
    aisle: r.aisle,
    source: r.source,
    lastSeenAt: r.last_seen_at?.toISOString() ?? new Date().toISOString(),
    isOrganic: r.is_organic ?? false,
    isStoreBrand: r.is_store_brand ?? false,
    categoryName: r.category_name,
    department: r.department,
  }))
}
