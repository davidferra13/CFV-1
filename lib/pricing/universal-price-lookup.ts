/**
 * Universal Price Lookup
 *
 * Accepts ANY ingredient text + optional ZIP code and returns a structured,
 * location-aware price estimate with full metadata.
 *
 * This is the "any chef, any ingredient, any ZIP" entry point.
 * It combines:
 *   1. Fuzzy ingredient matching (FTS + trigram on products, system_ingredients, ingredients)
 *   2. ZIP-aware store proximity (Haversine on openclaw.stores lat/lng)
 *   3. Unit normalization (product size_value/size_unit -> per-unit price)
 *   4. Median-based aggregation with outlier filtering
 *   5. Structured response with confidence, range, data_points, last_updated
 *
 * NOT a 'use server' file. Called by server actions or API routes.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PriceLookupQuery {
  /** Any ingredient text (e.g., "chicken breast", "evoo", "fresh cilantro") */
  ingredient: string
  /** Optional US ZIP code for location-based pricing */
  zipCode?: string
  /** Max search radius in miles (default: 50) */
  radiusMiles?: number
}

export interface PriceLookupResult {
  /** Whether the ingredient was matched to any known product/ingredient */
  matched: boolean
  /** Normalized ingredient name used for matching */
  ingredient_name: string
  /** Matched ingredient ID (from ingredients or system_ingredients table), if any */
  ingredient_id: string | null
  /** How the match was made */
  match_method: 'exact' | 'fulltext' | 'trigram' | 'product_search' | 'none'
  /** Confidence of the ingredient match itself (0-1) */
  match_confidence: number

  /** Best price estimate in cents */
  price_cents: number | null
  /** Price per normalized unit in cents */
  price_per_unit_cents: number | null
  /** Normalized unit (lb, oz, each, etc.) */
  unit: string

  /** Price range from available data points */
  range: { min_cents: number; max_cents: number } | null
  /** Overall confidence score (0-1), combining match confidence and data quality */
  confidence_score: number
  /** Number of data points used to compute the price */
  data_points: number
  /** Most recent price observation date */
  last_updated: string | null

  /** Location context */
  location: {
    zip_requested: string | null
    stores_in_area: number
    nearest_store_miles: number | null
    /** 'local' = stores at ZIP, 'regional' = within radius, 'national' = all data */
    scope: 'local' | 'regional' | 'national'
    /** Human-readable explanation of coverage quality */
    coverage_note: string
  }

  /** Sources that contributed to this price */
  sources: string[]
}

// ---------------------------------------------------------------------------
// Internals: Haversine distance
// ---------------------------------------------------------------------------

/** Haversine distance between two lat/lng points, in miles */
function haversineSQL(lat: number, lng: number): ReturnType<typeof sql> {
  return sql`(
    3959 * acos(
      LEAST(1, GREATEST(-1,
        cos(radians(${lat})) * cos(radians(s.lat)) *
        cos(radians(s.lng) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(s.lat))
      ))
    )
  )`
}

// ---------------------------------------------------------------------------
// Step 1: Resolve ZIP to coordinates (using our store data)
// ---------------------------------------------------------------------------

interface ZipCoords {
  lat: number
  lng: number
  region: string | null
  source: 'exact_zip' | 'zip_centroid'
}

async function resolveZipCoords(zipCode: string): Promise<ZipCoords | null> {
  // First: exact ZIP match from our stores (gives us store coordinates)
  const exactRows = (await db.execute(sql`
    SELECT AVG(lat) as lat, AVG(lng) as lng, COUNT(*) as cnt
    FROM openclaw.stores
    WHERE zip = ${zipCode} AND lat IS NOT NULL AND lng IS NOT NULL
  `)) as unknown as Array<{ lat: number | null; lng: number | null; cnt: string }>

  if (exactRows.length > 0 && Number(exactRows[0].cnt) > 0 && exactRows[0].lat) {
    return {
      lat: Number(exactRows[0].lat),
      lng: Number(exactRows[0].lng),
      region: null, // will be resolved if needed
      source: 'exact_zip',
    }
  }

  // Second: ZIP centroid table (42K US ZIPs with coordinates + census region)
  const centroidRows = (await db.execute(sql`
    SELECT lat, lng, region FROM openclaw.zip_centroids WHERE zip = ${zipCode} LIMIT 1
  `)) as unknown as Array<{ lat: number; lng: number; region: string }>

  if (centroidRows.length > 0) {
    return {
      lat: Number(centroidRows[0].lat),
      lng: Number(centroidRows[0].lng),
      region: centroidRows[0].region,
      source: 'zip_centroid',
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Step 2: Find nearby stores
// ---------------------------------------------------------------------------

interface NearbyStore {
  store_id: string
  name: string
  distance_miles: number
  zip: string
  chain_slug: string
}

async function findNearbyStores(
  lat: number,
  lng: number,
  radiusMiles: number,
  limit = 50
): Promise<NearbyStore[]> {
  // Use a subquery to filter by distance (can't use HAVING without GROUP BY,
  // and can't reference aliases in WHERE)
  const rows = (await db.execute(sql`
    SELECT store_id, name, zip, chain_slug, distance_miles
    FROM (
      SELECT
        s.id as store_id,
        s.name,
        s.zip,
        c.slug as chain_slug,
        ${haversineSQL(lat, lng)} as distance_miles
      FROM openclaw.stores s
      LEFT JOIN openclaw.chains c ON c.id = s.chain_id
      WHERE s.lat IS NOT NULL AND s.lng IS NOT NULL
    ) sub
    WHERE distance_miles <= ${radiusMiles}
    ORDER BY distance_miles ASC
    LIMIT ${limit}
  `)) as unknown as NearbyStore[]

  return rows
}

// ---------------------------------------------------------------------------
// Step 3: Match ingredient text
// ---------------------------------------------------------------------------

interface IngredientMatch {
  id: string
  name: string
  source_table: 'ingredients' | 'system_ingredients'
  category: string | null
  method: 'exact' | 'fulltext' | 'trigram'
  confidence: number
}

async function matchIngredient(text: string): Promise<IngredientMatch | null> {
  const normalized = text.trim().toLowerCase()

  // 1. Exact match in chef ingredients
  const exact = (await db.execute(sql`
    SELECT id, name, category FROM ingredients
    WHERE LOWER(name) = ${normalized}
    LIMIT 1
  `)) as unknown as Array<{ id: string; name: string; category: string | null }>

  if (exact.length > 0) {
    return {
      id: exact[0].id,
      name: exact[0].name,
      source_table: 'ingredients',
      category: exact[0].category,
      method: 'exact',
      confidence: 1.0,
    }
  }

  // 2. Full-text search on ingredients
  const ftsIngredient = (await db.execute(sql`
    SELECT id, name, category,
      ts_rank(to_tsvector('english', name), plainto_tsquery('english', ${text})) as rank
    FROM ingredients
    WHERE to_tsvector('english', name) @@ plainto_tsquery('english', ${text})
    ORDER BY rank DESC
    LIMIT 1
  `)) as unknown as Array<{ id: string; name: string; category: string | null; rank: number }>

  if (ftsIngredient.length > 0 && ftsIngredient[0].rank > 0.05) {
    return {
      id: ftsIngredient[0].id,
      name: ftsIngredient[0].name,
      source_table: 'ingredients',
      category: ftsIngredient[0].category,
      method: 'fulltext',
      confidence: Math.min(0.95, 0.7 + ftsIngredient[0].rank),
    }
  }

  // 3. Exact match in system_ingredients
  const sysExact = (await db.execute(sql`
    SELECT id, name, category FROM system_ingredients
    WHERE LOWER(name) = ${normalized}
    LIMIT 1
  `)) as unknown as Array<{ id: string; name: string; category: string | null }>

  if (sysExact.length > 0) {
    return {
      id: sysExact[0].id,
      name: sysExact[0].name,
      source_table: 'system_ingredients',
      category: sysExact[0].category,
      method: 'exact',
      confidence: 0.95,
    }
  }

  // 4. Full-text search on system_ingredients
  const ftsSys = (await db.execute(sql`
    SELECT id, name, category,
      ts_rank(to_tsvector('english', name), plainto_tsquery('english', ${text})) as rank
    FROM system_ingredients
    WHERE to_tsvector('english', name) @@ plainto_tsquery('english', ${text})
    ORDER BY rank DESC
    LIMIT 1
  `)) as unknown as Array<{ id: string; name: string; category: string | null; rank: number }>

  if (ftsSys.length > 0 && ftsSys[0].rank > 0.05) {
    return {
      id: ftsSys[0].id,
      name: ftsSys[0].name,
      source_table: 'system_ingredients',
      category: ftsSys[0].category,
      method: 'fulltext',
      confidence: Math.min(0.9, 0.65 + ftsSys[0].rank),
    }
  }

  // 5. Trigram similarity on system_ingredients (catches typos, partial names)
  const trigram = (await db.execute(sql`
    SELECT id, name, category,
      similarity(name::text, ${text}::text) as sim
    FROM system_ingredients
    WHERE similarity(name::text, ${text}::text) > 0.25
    ORDER BY sim DESC
    LIMIT 1
  `)) as unknown as Array<{ id: string; name: string; category: string | null; sim: number }>

  if (trigram.length > 0) {
    return {
      id: trigram[0].id,
      name: trigram[0].name,
      source_table: 'system_ingredients',
      category: trigram[0].category,
      method: 'trigram',
      confidence: Math.min(0.85, trigram[0].sim),
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Step 4: Search openclaw.products directly (fallback when no ingredient match)
// ---------------------------------------------------------------------------

interface ProductPriceRow {
  product_id: string
  product_name: string
  store_id: string
  store_name: string
  price_cents: number
  sale_price_cents: number | null
  size: string | null
  size_value: number | null
  size_unit: string | null
  last_seen_at: string
  distance_miles: number | null
}

// Non-food keyword patterns for products that slip through category filters
// (e.g., pet treats in "Other" category, household items miscategorized).
// Used as a secondary filter alongside the is_food column.
const NON_FOOD_PRODUCT_PATTERNS = [
  'dog treat',
  'cat treat',
  'dog food',
  'cat food',
  'pet food',
  'cat litter',
  'flea collar',
  'tick collar',
  'paper towel',
  'toilet paper',
  'trash bag',
  'garbage bag',
  'laundry detergent',
  'fabric softener',
  'dishwasher detergent',
  'toothpaste',
  'toothbrush',
  'shampoo',
  'body wash',
  'deodorant',
  'diaper',
  'baby wipe',
  'bandage',
].map((kw) => kw.toLowerCase())

/** Secondary keyword filter for non-food products that slipped through category-level is_food */
function filterFoodProducts(rows: ProductPriceRow[]): ProductPriceRow[] {
  return rows.filter((r) => {
    const nameLower = r.product_name.toLowerCase()
    return !NON_FOOD_PRODUCT_PATTERNS.some((pattern) => nameLower.includes(pattern))
  })
}

async function searchProductPrices(
  text: string,
  storeIds: string[] | null,
  limit = 100
): Promise<ProductPriceRow[]> {
  // Rank products by relevance. We heavily boost products where the search term
  // appears at the start of the name (the product IS the ingredient) vs. products
  // where it's incidental (e.g., "cilantro lime taco tender" matching "cilantro").
  // The CASE expression adds 10.0 to ts_rank for primary matches.
  if (storeIds && storeIds.length > 0) {
    // Location-filtered search
    const rows = (await db.execute(sql`
      SELECT
        p.id as product_id, p.name as product_name,
        sp.store_id, s.name as store_name,
        sp.price_cents,
        sp.sale_price_cents,
        p.size, p.size_value, p.size_unit,
        sp.last_seen_at,
        NULL::float as distance_miles
      FROM openclaw.products p
      JOIN openclaw.store_products sp ON sp.product_id = p.id
      JOIN openclaw.stores s ON s.id = sp.store_id
      WHERE to_tsvector('english', p.name) @@ plainto_tsquery('english', ${text})
        AND sp.store_id = ANY(${storeIds})
        AND sp.price_cents > 0
        AND sp.price_cents < 50000
        AND p.is_food = true
      ORDER BY
        (ts_rank(to_tsvector('english', p.name), plainto_tsquery('english', ${text}))
         + CASE WHEN LOWER(p.name) LIKE ${text.toLowerCase() + '%'} THEN 10.0
                WHEN LOWER(p.name) LIKE '% ' || ${text.toLowerCase()} || ' %' THEN 5.0
                WHEN LOWER(p.name) LIKE '% ' || ${text.toLowerCase()} THEN 5.0
                ELSE 0.0 END
        ) DESC,
        sp.price_cents ASC
      LIMIT ${limit}
    `)) as unknown as ProductPriceRow[]
    return filterFoodProducts(rows)
  }

  // National search (no location filter)
  const rows = (await db.execute(sql`
    SELECT
      p.id as product_id, p.name as product_name,
      sp.store_id, s.name as store_name,
      sp.price_cents,
      sp.sale_price_cents,
      p.size, p.size_value, p.size_unit,
      sp.last_seen_at,
      NULL::float as distance_miles
    FROM openclaw.products p
    JOIN openclaw.store_products sp ON sp.product_id = p.id
    JOIN openclaw.stores s ON s.id = sp.store_id
    WHERE to_tsvector('english', p.name) @@ plainto_tsquery('english', ${text})
      AND sp.price_cents > 0
      AND sp.price_cents < 50000
      AND p.is_food = true
    ORDER BY
      (ts_rank(to_tsvector('english', p.name), plainto_tsquery('english', ${text}))
       + CASE WHEN LOWER(p.name) LIKE ${text.toLowerCase() + '%'} THEN 10.0
              WHEN LOWER(p.name) LIKE '% ' || ${text.toLowerCase()} || ' %' THEN 5.0
              WHEN LOWER(p.name) LIKE '% ' || ${text.toLowerCase()} THEN 5.0
              ELSE 0.0 END
      ) DESC,
      sp.last_seen_at DESC
    LIMIT ${limit}
  `)) as unknown as ProductPriceRow[]
  return filterFoodProducts(rows)
}

// ---------------------------------------------------------------------------
// Step 5: Unit normalization
// ---------------------------------------------------------------------------

/** Standard weight units in grams for conversion */
const UNIT_TO_GRAMS: Record<string, number> = {
  oz: 28.3495,
  lb: 453.592,
  kg: 1000,
  g: 1,
  fl_oz: 29.5735, // approximate for water-density items
  'fl oz': 29.5735,
  pt: 473.176,
  pint: 473.176,
  qt: 946.353,
  quart: 946.353,
  gal: 3785.41,
  gallon: 3785.41,
  liter: 1000,
  l: 1000,
  ml: 1,
}

interface NormalizedPrice {
  price_per_unit_cents: number
  unit: string
}

/**
 * Normalize a product price to per-unit (per lb, per oz, per each).
 * Uses product size_value and size_unit when available.
 * Falls back to parsing the `size` text field (e.g., "per lb", "16 oz").
 */
function normalizeProductPrice(
  priceCents: number,
  sizeValue: number | null,
  sizeUnit: string | null,
  sizeText: string | null = null
): NormalizedPrice {
  // First: check the size text for "per lb" / "per oz" patterns
  // These products are already priced per-unit but lack structured size data
  if (sizeText && (!sizeValue || !sizeUnit)) {
    const perMatch = sizeText.match(/^per\s+(lb|pound|oz|kg|gallon|gal|quart|qt|pint|pt|liter)$/i)
    if (perMatch) {
      // Normalize aliases to canonical unit names
      const raw = perMatch[1].toLowerCase()
      const unit =
        raw === 'pound'
          ? 'lb'
          : raw === 'gal'
            ? 'gallon'
            : raw === 'qt'
              ? 'quart'
              : raw === 'pt'
                ? 'pint'
                : raw
      return { price_per_unit_cents: priceCents, unit }
    }
  }

  // If no structured size data, try parsing size text
  if ((!sizeValue || !sizeUnit) && sizeText) {
    const parsed = sizeText.match(
      /^([\d.]+)\s*(oz|lb|fl\s*oz|kg|g|gallon|gal|quart|qt|pint|pt|liter|l|ml|ct|each|bunch|container|squash|pepper|item)$/i
    )
    if (parsed) {
      const val = parseFloat(parsed[1])
      let unit = parsed[2].toLowerCase().trim()
      // Normalize aliases
      if (unit === 'gal') unit = 'gallon'
      if (unit === 'qt') unit = 'quart'
      if (unit === 'pt') unit = 'pint'
      // Treat container/squash/pepper/item as "each"
      if (['container', 'squash', 'pepper', 'item'].includes(unit)) unit = 'each'
      if (val > 0) {
        return normalizeProductPrice(priceCents, val, unit, null)
      }
    }
    // Handle "X pint container" pattern
    const compoundMatch = sizeText.match(/^([\d.]+)\s*(pint|quart|gallon)\s+container$/i)
    if (compoundMatch) {
      const val = parseFloat(compoundMatch[1])
      const unit = compoundMatch[2].toLowerCase()
      if (val > 0) {
        return normalizeProductPrice(priceCents, val, unit, null)
      }
    }
  }

  // If no size data at all, return as "each"
  if (!sizeValue || !sizeUnit || sizeValue <= 0) {
    return { price_per_unit_cents: priceCents, unit: 'each' }
  }

  const unitLower = sizeUnit.toLowerCase().trim()

  // "each" with size_value = 1 is just the item price
  if (unitLower === 'each' && sizeValue === 1) {
    return { price_per_unit_cents: priceCents, unit: 'each' }
  }

  // Convert to per-lb if we have a weight unit
  const grams = UNIT_TO_GRAMS[unitLower]
  if (grams) {
    const totalGrams = sizeValue * grams
    const pricePerGram = priceCents / totalGrams
    const pricePerLb = Math.round(pricePerGram * 453.592)
    return { price_per_unit_cents: pricePerLb, unit: 'lb' }
  }

  // "ct" (count) - per-item price
  if (unitLower === 'ct' && sizeValue > 1) {
    return { price_per_unit_cents: Math.round(priceCents / sizeValue), unit: 'each' }
  }

  // For "each" with quantity > 1 (e.g., "6 each" = 6-pack)
  if (unitLower === 'each' && sizeValue > 1) {
    return { price_per_unit_cents: Math.round(priceCents / sizeValue), unit: 'each' }
  }

  // "bunch" for produce - return as "bunch"
  if (unitLower === 'bunch') {
    return { price_per_unit_cents: priceCents, unit: 'bunch' }
  }

  // Unknown unit, return as-is
  return { price_per_unit_cents: priceCents, unit: unitLower }
}

// ---------------------------------------------------------------------------
// Step 6: Aggregate prices (median + outlier filtering)
// ---------------------------------------------------------------------------

interface AggregatedPrice {
  median_cents: number
  min_cents: number
  max_cents: number
  data_points: number
  unit: string
  sources: string[]
  last_updated: string | null
}

function aggregatePrices(
  prices: Array<{ cents: number; unit: string; store: string; date: string }>
): AggregatedPrice | null {
  if (prices.length === 0) return null

  // Group by unit, pick the most common unit
  const unitCounts = new Map<string, number>()
  for (const p of prices) {
    unitCounts.set(p.unit, (unitCounts.get(p.unit) || 0) + 1)
  }
  const primaryUnit = Array.from(unitCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]

  // Filter to primary unit only
  const filtered = prices.filter((p) => p.unit === primaryUnit)
  if (filtered.length === 0) return null

  // Sort by price
  const sorted = filtered.map((p) => p.cents).sort((a, b) => a - b)

  // IQR-based outlier filtering
  const q1 = sorted[Math.floor(sorted.length * 0.25)]
  const q3 = sorted[Math.floor(sorted.length * 0.75)]
  const iqr = q3 - q1
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr

  const inliers = sorted.filter((p) => sorted.length <= 2 || (p >= lowerBound && p <= upperBound))
  const finalPrices = inliers.length >= 2 ? inliers : sorted // Fall back to all if too few inliers

  // Median
  const mid = Math.floor(finalPrices.length / 2)
  const median =
    finalPrices.length % 2 === 0
      ? Math.round((finalPrices[mid - 1] + finalPrices[mid]) / 2)
      : finalPrices[mid]

  // Unique sources
  const sources = Array.from(new Set(filtered.map((p) => p.store)))

  // Most recent date
  const dates = filtered
    .map((p) => p.date)
    .filter(Boolean)
    .sort()
    .reverse()

  return {
    median_cents: median,
    min_cents: finalPrices[0],
    max_cents: finalPrices[finalPrices.length - 1],
    data_points: finalPrices.length,
    unit: primaryUnit,
    sources,
    last_updated: dates[0] || null,
  }
}

// ---------------------------------------------------------------------------
// Step 7: Check ingredient_price_history (existing pipeline data)
// ---------------------------------------------------------------------------

interface HistoryPrice {
  cents: number
  unit: string
  store: string
  date: string
  source: string
}

async function getHistoryPrices(
  ingredientId: string,
  storeNames?: string[]
): Promise<HistoryPrice[]> {
  let rows: Array<{
    price_per_unit_cents: number
    unit: string
    store_name: string
    purchase_date: string
    source: string
  }>

  if (storeNames && storeNames.length > 0) {
    rows = (await db.execute(sql`
      SELECT price_per_unit_cents, unit, store_name, purchase_date, source
      FROM ingredient_price_history
      WHERE ingredient_id = ${ingredientId}
        AND price_per_unit_cents > 0
        AND price_per_unit_cents < 50000
        AND purchase_date > CURRENT_DATE - INTERVAL '60 days'
      ORDER BY purchase_date DESC
      LIMIT 200
    `)) as unknown as typeof rows
  } else {
    rows = (await db.execute(sql`
      SELECT price_per_unit_cents, unit, store_name, purchase_date, source
      FROM ingredient_price_history
      WHERE ingredient_id = ${ingredientId}
        AND price_per_unit_cents > 0
        AND price_per_unit_cents < 50000
        AND purchase_date > CURRENT_DATE - INTERVAL '60 days'
      ORDER BY purchase_date DESC
      LIMIT 200
    `)) as unknown as typeof rows
  }

  return rows
    .filter((r) => r.price_per_unit_cents != null)
    .map((r) => ({
      cents: Number(r.price_per_unit_cents),
      unit: r.unit || 'each',
      store: r.store_name || 'unknown',
      date: r.purchase_date,
      source: r.source,
    }))
}

// ---------------------------------------------------------------------------
// Step 6b: USDA regional baseline lookup
// ---------------------------------------------------------------------------

interface UsdaBaseline {
  item_name: string
  price_cents: number
  unit: string
  region: string
  category: string | null
  observation_date: string
}

/**
 * Look up USDA price baseline for an ingredient + region.
 * Uses FTS first, then trigram similarity as fallback.
 */
async function lookupUsdaBaseline(
  ingredientText: string,
  region: string | null
): Promise<UsdaBaseline | null> {
  const targetRegion = region || 'us_average'

  // Try FTS match first
  const ftsRows = (await db.execute(sql`
    SELECT item_name, price_cents, unit, region, category, observation_date::text as observation_date,
      ts_rank(to_tsvector('english', item_name), plainto_tsquery('english', ${ingredientText})) as rank
    FROM openclaw.usda_price_baselines
    WHERE to_tsvector('english', item_name) @@ plainto_tsquery('english', ${ingredientText})
      AND region = ${targetRegion}
    ORDER BY rank DESC
    LIMIT 1
  `)) as unknown as Array<UsdaBaseline & { rank: number }>

  if (ftsRows.length > 0 && ftsRows[0].rank > 0.01) {
    return ftsRows[0]
  }

  // Try trigram similarity
  const trigramRows = (await db.execute(sql`
    SELECT item_name, price_cents, unit, region, category, observation_date::text as observation_date,
      similarity(item_name, ${ingredientText}) as sim
    FROM openclaw.usda_price_baselines
    WHERE region = ${targetRegion}
      AND similarity(item_name, ${ingredientText}) > 0.2
    ORDER BY sim DESC
    LIMIT 1
  `)) as unknown as Array<UsdaBaseline & { sim: number }>

  if (trigramRows.length > 0) {
    return trigramRows[0]
  }

  // Last resort: try us_average if we were looking for a specific region
  if (targetRegion !== 'us_average') {
    return lookupUsdaBaseline(ingredientText, null)
  }

  return null
}

/**
 * Resolve the census region for a ZIP code.
 * Uses zip_centroids table.
 */
async function getZipRegion(zipCode: string): Promise<string | null> {
  const rows = (await db.execute(sql`
    SELECT region FROM openclaw.zip_centroids WHERE zip = ${zipCode} LIMIT 1
  `)) as unknown as Array<{ region: string }>
  return rows.length > 0 ? rows[0].region : null
}

// ---------------------------------------------------------------------------
// Coverage note generation
// ---------------------------------------------------------------------------

function buildCoverageNote(
  scope: 'local' | 'regional' | 'national',
  storesInArea: number,
  nearestMiles: number | null,
  zipRequested: string | null
): string {
  if (scope === 'local' && storesInArea > 0) {
    return `${storesInArea} store${storesInArea > 1 ? 's' : ''} within 10 miles of ${zipRequested}`
  }
  if (scope === 'regional' && storesInArea > 0) {
    const dist = nearestMiles ? Math.round(nearestMiles) : '?'
    return `${storesInArea} store${storesInArea > 1 ? 's' : ''} within radius (nearest: ${dist} mi from ${zipRequested})`
  }
  // National scope
  if (zipRequested) {
    return `No stores near ${zipRequested}. Price based on all available store data (NE United States).`
  }
  return 'No ZIP provided. Price based on all available store data (NE United States).'
}

/**
 * Confidence multiplier by scope. National is heavily penalized because
 * "national" currently means "7 stores in MA/NH" - not actual national coverage.
 */
function scopeConfidenceMultiplier(scope: 'local' | 'regional' | 'national'): number {
  if (scope === 'local') return 1.0
  if (scope === 'regional') return 0.8
  return 0.35 // national = we have no data near you, price is a rough estimate
}

// ---------------------------------------------------------------------------
// Main: lookupPrice
// ---------------------------------------------------------------------------

export async function lookupPrice(query: PriceLookupQuery): Promise<PriceLookupResult> {
  const { ingredient, zipCode, radiusMiles = 50 } = query

  const noResult: PriceLookupResult = {
    matched: false,
    ingredient_name: ingredient,
    ingredient_id: null,
    match_method: 'none',
    match_confidence: 0,
    price_cents: null,
    price_per_unit_cents: null,
    unit: 'each',
    range: null,
    confidence_score: 0,
    data_points: 0,
    last_updated: null,
    location: {
      zip_requested: zipCode || null,
      stores_in_area: 0,
      nearest_store_miles: null,
      scope: 'national',
      coverage_note: buildCoverageNote('national', 0, null, zipCode || null),
    },
    sources: [],
  }

  // --- Resolve location ---
  let zipCoords: ZipCoords | null = null
  let nearbyStores: NearbyStore[] = []
  let locationScope: 'local' | 'regional' | 'national' = 'national'

  if (zipCode) {
    zipCoords = await resolveZipCoords(zipCode)
    if (zipCoords) {
      nearbyStores = await findNearbyStores(zipCoords.lat, zipCoords.lng, radiusMiles)
      if (nearbyStores.length > 0) {
        const closestMiles = nearbyStores[0].distance_miles
        locationScope = closestMiles <= 10 ? 'local' : 'regional'
      }
    }
  }

  const storeIds = nearbyStores.length > 0 ? nearbyStores.map((s) => s.store_id) : null

  // --- Match ingredient ---
  const match = await matchIngredient(ingredient)

  // --- Strategy A: We have an ingredient match with price history ---
  if (match) {
    const historyPrices = await getHistoryPrices(match.id)

    if (historyPrices.length > 0) {
      const agg = aggregatePrices(
        historyPrices.map((p) => ({
          cents: p.cents,
          unit: p.unit,
          store: p.store,
          date: p.date,
        }))
      )

      if (agg) {
        const locationMultiplier = scopeConfidenceMultiplier(locationScope)
        const overallConfidence =
          Math.round(
            match.confidence * locationMultiplier * (Math.min(agg.data_points, 20) / 20) * 100
          ) / 100

        return {
          matched: true,
          ingredient_name: match.name,
          ingredient_id: match.id,
          match_method: match.method,
          match_confidence: match.confidence,
          price_cents: agg.median_cents,
          price_per_unit_cents: agg.median_cents,
          unit: agg.unit,
          range: { min_cents: agg.min_cents, max_cents: agg.max_cents },
          confidence_score: overallConfidence,
          data_points: agg.data_points,
          last_updated: agg.last_updated,
          location: {
            zip_requested: zipCode || null,
            stores_in_area: nearbyStores.length,
            nearest_store_miles: nearbyStores[0]?.distance_miles ?? null,
            scope: locationScope,
            coverage_note: buildCoverageNote(
              locationScope,
              nearbyStores.length,
              nearbyStores[0]?.distance_miles ?? null,
              zipCode || null
            ),
          },
          sources: agg.sources,
        }
      }
    }
  }

  // --- Strategy B: Direct product search in openclaw catalog ---
  const productPrices = await searchProductPrices(ingredient, storeIds)

  if (productPrices.length > 0) {
    // Normalize each product price using size data
    const normalized = productPrices.map((pp) => {
      const norm = normalizeProductPrice(
        pp.sale_price_cents || pp.price_cents,
        pp.size_value ? Number(pp.size_value) : null,
        pp.size_unit,
        pp.size || null
      )
      return {
        cents: norm.price_per_unit_cents,
        unit: norm.unit,
        store: pp.store_name || 'unknown',
        date: pp.last_seen_at || new Date().toISOString(),
      }
    })

    const agg = aggregatePrices(normalized)

    if (agg) {
      const locationMultiplier = scopeConfidenceMultiplier(locationScope)
      const matchConf = match ? match.confidence : 0.6 // product_search default
      const overallConfidence =
        Math.round(matchConf * locationMultiplier * (Math.min(agg.data_points, 20) / 20) * 100) /
        100

      return {
        matched: true,
        ingredient_name: match?.name || ingredient,
        ingredient_id: match?.id || null,
        match_method: match?.method || 'product_search',
        match_confidence: matchConf,
        price_cents: agg.median_cents,
        price_per_unit_cents: agg.median_cents,
        unit: agg.unit,
        range: { min_cents: agg.min_cents, max_cents: agg.max_cents },
        confidence_score: overallConfidence,
        data_points: agg.data_points,
        last_updated: agg.last_updated,
        location: {
          zip_requested: zipCode || null,
          stores_in_area: nearbyStores.length,
          nearest_store_miles: nearbyStores[0]?.distance_miles ?? null,
          scope: locationScope,
          coverage_note: buildCoverageNote(
            locationScope,
            nearbyStores.length,
            nearbyStores[0]?.distance_miles ?? null,
            zipCode || null
          ),
        },
        sources: agg.sources,
      }
    }
  }

  // --- Strategy C: Fall back to national product search (if location filtered returned nothing) ---
  if (storeIds && storeIds.length > 0) {
    const nationalPrices = await searchProductPrices(ingredient, null)

    if (nationalPrices.length > 0) {
      const normalized = nationalPrices.map((pp) => {
        const norm = normalizeProductPrice(
          pp.sale_price_cents || pp.price_cents,
          pp.size_value ? Number(pp.size_value) : null,
          pp.size_unit
        )
        return {
          cents: norm.price_per_unit_cents,
          unit: norm.unit,
          store: pp.store_name || 'unknown',
          date: pp.last_seen_at || new Date().toISOString(),
        }
      })

      const agg = aggregatePrices(normalized)

      if (agg) {
        const matchConf = match ? match.confidence : 0.5
        const overallConfidence =
          Math.round(
            matchConf *
              scopeConfidenceMultiplier('national') *
              (Math.min(agg.data_points, 20) / 20) *
              100
          ) / 100

        return {
          matched: true,
          ingredient_name: match?.name || ingredient,
          ingredient_id: match?.id || null,
          match_method: match?.method || 'product_search',
          match_confidence: matchConf,
          price_cents: agg.median_cents,
          price_per_unit_cents: agg.median_cents,
          unit: agg.unit,
          range: { min_cents: agg.min_cents, max_cents: agg.max_cents },
          confidence_score: overallConfidence,
          data_points: agg.data_points,
          last_updated: agg.last_updated,
          location: {
            zip_requested: zipCode || null,
            stores_in_area: 0,
            nearest_store_miles: null,
            scope: 'national',
            coverage_note: buildCoverageNote('national', 0, null, zipCode || null),
          },
          sources: agg.sources,
        }
      }
    }
  }

  // --- Strategy D: USDA regional baseline (BLS average prices) ---
  // This is the safety net: even with zero scraped data near this ZIP,
  // we can return a regionally-adjusted USDA average price.
  const region = zipCode ? zipCoords?.region || (await getZipRegion(zipCode)) : null
  const usda = await lookupUsdaBaseline(ingredient, region)

  if (usda) {
    const regionLabel = usda.region === 'us_average' ? 'US average' : usda.region
    const matchConf = match ? Math.min(match.confidence, 0.8) : 0.5
    // USDA baselines are inherently lower confidence: they're averages, not live prices
    const overallConfidence = Math.round(matchConf * 0.4 * 100) / 100

    return {
      matched: true,
      ingredient_name: match?.name || ingredient,
      ingredient_id: match?.id || null,
      match_method: match?.method || 'product_search',
      match_confidence: matchConf,
      price_cents: usda.price_cents,
      price_per_unit_cents: usda.price_cents,
      unit: usda.unit,
      range: null, // single data point
      confidence_score: overallConfidence,
      data_points: 1,
      last_updated: usda.observation_date,
      location: {
        zip_requested: zipCode || null,
        stores_in_area: 0,
        nearest_store_miles: null,
        scope: 'national',
        coverage_note: `USDA ${regionLabel} baseline (BLS avg). No live store prices available near ${zipCode || 'unknown location'}.`,
      },
      sources: [`USDA BLS (${regionLabel})`],
    }
  }

  // --- No data at all ---
  return noResult
}

// ---------------------------------------------------------------------------
// Batch lookup: multiple ingredients at once
// ---------------------------------------------------------------------------

export async function lookupPricesBatch(queries: PriceLookupQuery[]): Promise<PriceLookupResult[]> {
  // Run sequentially to avoid connection pool exhaustion
  const results: PriceLookupResult[] = []
  for (const q of queries) {
    results.push(await lookupPrice(q))
  }
  return results
}
