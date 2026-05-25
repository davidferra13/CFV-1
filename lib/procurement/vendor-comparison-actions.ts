'use server'

/**
 * Vendor Price Comparison for Event Procurement
 *
 * Takes an event's ingredient list, queries PostgreSQL for multi-vendor
 * prices per ingredient, and returns a structured comparison table:
 * rows = ingredients, columns = top vendors/stores.
 *
 * Data flow: event -> menu -> recipes -> ingredients -> PostgreSQL price history
 */

import { requireChef } from '@/lib/auth/get-user'
import { generateGroceryList } from '@/lib/grocery/generate-grocery-list'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// ── Types ────────────────────────────────────────────────────────────────────

export interface VendorIngredientPrice {
  ingredientId: string
  ingredientName: string
  quantity: number
  unit: string
  /** Price in cents per unit at this vendor, or null if not available */
  priceCents: number | null
  /** Total cost in cents (priceCents * quantity), or null */
  totalCents: number | null
  /** When this price was last confirmed */
  confirmedAt: string | null
}

export interface VendorColumn {
  /** Store/vendor name (display) */
  name: string
  /** Total cost in cents across all ingredients with data at this vendor */
  totalCents: number
  /** Number of ingredients this vendor has prices for */
  coverageCount: number
  /** Prices keyed by ingredientId */
  prices: Record<string, VendorIngredientPrice>
}

export interface VendorComparisonResult {
  eventId: string
  /** All ingredient rows */
  ingredients: Array<{
    ingredientId: string
    ingredientName: string
    quantity: number
    unit: string
    /** The cheapest vendor name for this ingredient */
    cheapestVendor: string | null
    /** Cheapest price in cents for this ingredient */
    cheapestCents: number | null
  }>
  /** Top vendors, sorted by total cost ascending (cheapest first) */
  vendors: VendorColumn[]
  /** The cheapest vendor overall (lowest total) */
  cheapestOverallVendor: string | null
  /** Potential savings: most expensive vendor total minus cheapest vendor total */
  maxSavingsCents: number
  /** Timestamp */
  generatedAt: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface StorePriceRow {
  ingredient_id: string
  store_name: string
  price_per_unit_cents: number
  purchase_date: string
}

/** Query PostgreSQL for store-level prices for all ingredients */
async function getMultiStorePrices(
  ingredientIds: string[],
  tenantId: string,
  _preferredState: string | null
): Promise<StorePriceRow[]> {
  if (ingredientIds.length === 0) return []

  const rows = (await db.execute(sql`
    SELECT
      ingredient_id,
      store_name,
      price_per_unit_cents,
      purchase_date::text AS purchase_date
    FROM ingredient_price_history
    WHERE ingredient_id = ANY(${ingredientIds})
      AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
      AND store_name IS NOT NULL
      AND price_per_unit_cents > 0
      AND purchase_date > NOW() - INTERVAL '60 days'
    ORDER BY ingredient_id, store_name, purchase_date DESC
  `)) as unknown as StorePriceRow[]

  return rows
}

// ── Main Action ──────────────────────────────────────────────────────────────

export async function getVendorComparison(eventId: string): Promise<VendorComparisonResult | null> {
  const user = await requireChef()

  // 1. Get the event's grocery list (ingredient IDs, names, quantities)
  const groceryList = await generateGroceryList(eventId).catch(() => null)
  if (!groceryList || groceryList.totalItems === 0) return null

  // Flatten all items
  const allItems = groceryList.categories.flatMap((cat) => cat.items)
  if (allItems.length === 0) return null

  // Determine chef's state for regional filtering
  const stateRows = (await db.execute(
    sql`SELECT home_state FROM chefs WHERE id = ${user.tenantId} LIMIT 1`
  )) as unknown as Array<{ home_state: string | null }>
  const preferredState = stateRows[0]?.home_state || null

  // 2. Query PostgreSQL for multi-store prices
  const ingredientIds = allItems.map((item) => item.ingredientId).filter(Boolean)
  const storePrices = await getMultiStorePrices(ingredientIds, user.tenantId!, preferredState)

  // Group by ingredient -> store (keep freshest per store)
  const byIngredientStore = new Map<
    string,
    Map<string, { priceCents: number; confirmedAt: string | null }>
  >()
  for (const row of storePrices) {
    if (!byIngredientStore.has(row.ingredient_id)) {
      byIngredientStore.set(row.ingredient_id, new Map())
    }
    const storeMap = byIngredientStore.get(row.ingredient_id)!
    // Only keep first (freshest due to ORDER BY)
    if (!storeMap.has(row.store_name)) {
      storeMap.set(row.store_name, {
        priceCents: row.price_per_unit_cents,
        confirmedAt: row.purchase_date,
      })
    }
  }

  // Store accumulator: storeName -> { ingredientId -> price }
  const storeAccumulator = new Map<
    string,
    Map<string, { priceCents: number; confirmedAt: string | null }>
  >()

  const ingredientRows: VendorComparisonResult['ingredients'] = []

  for (const item of allItems) {
    const storeMap = byIngredientStore.get(item.ingredientId)

    if (!storeMap || storeMap.size === 0) {
      ingredientRows.push({
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        quantity: item.totalQuantity,
        unit: item.unit,
        cheapestVendor: null,
        cheapestCents: null,
      })
      continue
    }

    let cheapestVendor: string | null = null
    let cheapestCents: number | null = null

    for (const [storeName, priceData] of storeMap) {
      const cents = priceData.priceCents
      if (!cents || cents <= 0) continue

      // Track per-store prices
      if (!storeAccumulator.has(storeName)) {
        storeAccumulator.set(storeName, new Map())
      }
      storeAccumulator.get(storeName)!.set(item.ingredientId, {
        priceCents: cents,
        confirmedAt: priceData.confirmedAt,
      })

      if (cheapestCents === null || cents < cheapestCents) {
        cheapestCents = cents
        cheapestVendor = storeName
      }
    }

    ingredientRows.push({
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      quantity: item.totalQuantity,
      unit: item.unit,
      cheapestVendor,
      cheapestCents,
    })
  }

  // 3. Rank stores by coverage, then pick top 5
  const storeRanking = Array.from(storeAccumulator.entries())
    .map(([name, priceMap]) => ({
      name,
      coverageCount: priceMap.size,
      priceMap,
    }))
    .sort((a, b) => b.coverageCount - a.coverageCount)
    .slice(0, 5)

  if (storeRanking.length === 0) {
    return {
      eventId,
      ingredients: ingredientRows,
      vendors: [],
      cheapestOverallVendor: null,
      maxSavingsCents: 0,
      generatedAt: new Date().toISOString(),
    }
  }

  // 4. Build vendor columns
  const vendors: VendorColumn[] = storeRanking.map(({ name, coverageCount, priceMap }) => {
    let totalCents = 0
    const prices: Record<string, VendorIngredientPrice> = {}

    for (const row of ingredientRows) {
      const priceData = priceMap.get(row.ingredientId)
      if (priceData) {
        const itemTotal = Math.round(priceData.priceCents * row.quantity)
        totalCents += itemTotal
        prices[row.ingredientId] = {
          ingredientId: row.ingredientId,
          ingredientName: row.ingredientName,
          quantity: row.quantity,
          unit: row.unit,
          priceCents: priceData.priceCents,
          totalCents: itemTotal,
          confirmedAt: priceData.confirmedAt,
        }
      } else {
        prices[row.ingredientId] = {
          ingredientId: row.ingredientId,
          ingredientName: row.ingredientName,
          quantity: row.quantity,
          unit: row.unit,
          priceCents: null,
          totalCents: null,
          confirmedAt: null,
        }
      }
    }

    return { name, totalCents, coverageCount, prices }
  })

  // Sort vendors by total cost (cheapest first)
  vendors.sort((a, b) => {
    // Vendors with more coverage should be compared fairly;
    // if coverage is very different, rank by coverage first
    if (a.coverageCount > 0 && b.coverageCount > 0) {
      return a.totalCents - b.totalCents
    }
    return b.coverageCount - a.coverageCount
  })

  const cheapestOverallVendor = vendors[0]?.name || null
  const maxTotal = Math.max(...vendors.map((v) => v.totalCents))
  const minTotal = Math.min(...vendors.filter((v) => v.coverageCount > 0).map((v) => v.totalCents))
  const maxSavingsCents = maxTotal - minTotal

  return {
    eventId,
    ingredients: ingredientRows,
    vendors,
    cheapestOverallVendor,
    maxSavingsCents,
    generatedAt: new Date().toISOString(),
  }
}
