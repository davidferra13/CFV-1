/**
 * Price Comparison Engine
 *
 * Given an ingredient + ZIP code, returns prices at every nearby store,
 * ranked by price. Shows the chef exactly where to buy for the best deal.
 *
 * NOT a 'use server' file. Called by server actions or API routes.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export interface StorePrice {
  store_name: string
  chain_name: string
  chain_slug: string
  source_type: string
  price_cents: number
  sale_price_cents: number | null
  is_sale: boolean
  unit: string
  product_name: string
  image_url: string | null
  distance_miles: number | null
  last_seen_at: string
  reliability_weight: number
}

export interface PriceComparisonResult {
  ingredient: string
  zip_code: string | null
  stores: StorePrice[]
  cheapest: StorePrice | null
  most_expensive: StorePrice | null
  median_cents: number | null
  savings_vs_median_cents: number | null
  data_points: number
}

export async function comparePrices(
  ingredientText: string,
  zipCode?: string,
  radiusMiles = 50
): Promise<PriceComparisonResult> {
  const empty: PriceComparisonResult = {
    ingredient: ingredientText,
    zip_code: zipCode || null,
    stores: [],
    cheapest: null,
    most_expensive: null,
    median_cents: null,
    savings_vs_median_cents: null,
    data_points: 0,
  }

  // Get coordinates from zip
  let lat: number | null = null
  let lng: number | null = null

  if (zipCode) {
    const coords = (await db.execute(sql`
      SELECT AVG(lat) as lat, AVG(lng) as lng
      FROM openclaw.stores
      WHERE zip = ${zipCode} AND lat IS NOT NULL
    `)) as unknown as Array<{ lat: number | null; lng: number | null }>

    if (coords[0]?.lat) {
      lat = Number(coords[0].lat)
      lng = Number(coords[0].lng)
    } else {
      // Fallback to zip_centroids
      const centroid = (await db.execute(sql`
        SELECT lat, lng FROM openclaw.zip_centroids WHERE zip = ${zipCode} LIMIT 1
      `)) as unknown as Array<{ lat: number; lng: number }>
      if (centroid[0]) {
        lat = Number(centroid[0].lat)
        lng = Number(centroid[0].lng)
      }
    }
  }

  // Search for products matching the ingredient
  const haversine =
    lat && lng
      ? sql`
    (3959 * acos(LEAST(1, GREATEST(-1,
      cos(radians(${lat})) * cos(radians(s.lat)) *
      cos(radians(s.lng) - radians(${lng})) +
      sin(radians(${lat})) * sin(radians(s.lat))
    ))))
  `
      : sql`NULL`

  const distanceFilter =
    lat && lng
      ? sql`AND s.lat IS NOT NULL AND s.lng IS NOT NULL
          AND (3959 * acos(LEAST(1, GREATEST(-1,
            cos(radians(${lat})) * cos(radians(s.lat)) *
            cos(radians(s.lng) - radians(${lng})) +
            sin(radians(${lat})) * sin(radians(s.lat))
          )))) < ${radiusMiles}`
      : sql``

  const rows = (await db.execute(sql`
    SELECT
      s.name AS store_name,
      c.name AS chain_name,
      c.slug AS chain_slug,
      c.source_type,
      c.reliability_weight,
      sp.price_cents,
      sp.sale_price_cents,
      COALESCE(sp.is_sale, false) AS is_sale,
      p.name AS product_name,
      p.image_url,
      p.size_unit AS unit,
      sp.last_seen_at,
      ${haversine} AS distance_miles
    FROM openclaw.products p
    JOIN openclaw.store_products sp ON sp.product_id = p.id
    JOIN openclaw.stores s ON s.id = sp.store_id
    JOIN openclaw.chains c ON c.id = s.chain_id
    WHERE to_tsvector('english', p.name) @@ plainto_tsquery('english', ${ingredientText})
      AND sp.price_cents > 0
      AND sp.price_cents < 50000
      AND p.is_food = true
      ${distanceFilter}
    ORDER BY sp.price_cents ASC
    LIMIT 100
  `)) as unknown as Array<StorePrice & { distance_miles: number | null }>

  if (rows.length === 0) return empty

  // Deduplicate: one best price per chain
  const bestByChain = new Map<string, StorePrice>()
  for (const row of rows) {
    const key = row.chain_slug
    if (!bestByChain.has(key) || row.price_cents < bestByChain.get(key)!.price_cents) {
      bestByChain.set(key, {
        store_name: row.store_name,
        chain_name: row.chain_name,
        chain_slug: row.chain_slug,
        source_type: row.source_type,
        price_cents: row.price_cents,
        sale_price_cents: row.sale_price_cents,
        is_sale: row.is_sale,
        unit: row.unit || 'each',
        product_name: row.product_name,
        image_url: row.image_url,
        distance_miles: row.distance_miles ? Number(row.distance_miles) : null,
        last_seen_at: String(row.last_seen_at),
        reliability_weight: Number(row.reliability_weight),
      })
    }
  }

  const stores = [...bestByChain.values()].sort((a, b) => a.price_cents - b.price_cents)

  // Compute median
  const prices = stores.map((s) => s.price_cents).sort((a, b) => a - b)
  const mid = Math.floor(prices.length / 2)
  const median =
    prices.length % 2 === 0 ? Math.round((prices[mid - 1] + prices[mid]) / 2) : prices[mid]

  const cheapest = stores[0] || null
  const mostExpensive = stores[stores.length - 1] || null

  return {
    ingredient: ingredientText,
    zip_code: zipCode || null,
    stores,
    cheapest,
    most_expensive: mostExpensive,
    median_cents: median,
    savings_vs_median_cents: cheapest ? median - cheapest.price_cents : null,
    data_points: stores.length,
  }
}
