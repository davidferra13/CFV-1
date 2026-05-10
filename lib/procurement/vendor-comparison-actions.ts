'use server'

/**
 * Vendor Price Comparison for Event Procurement
 *
 * Takes an event's ingredient list, queries the Pi Bridge for multi-vendor
 * prices per ingredient, and returns a structured comparison table:
 * rows = ingredients, columns = top vendors/stores.
 *
 * Data flow: event -> menu -> recipes -> ingredients -> Pi Bridge (1.1M prices)
 */

import { requireChef } from '@/lib/auth/get-user'
import { generateGroceryList } from '@/lib/grocery/generate-grocery-list'
import { normalizeIngredientName } from '@/lib/pricing/name-normalizer'
import { isProductRelevantToIngredient } from '@/lib/pricing/product-relevance'
import { lookupPrice, type PiBridgePrice } from '@/lib/pricing/pi-bridge'

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

/** Group Pi Bridge prices by store name, keeping only relevant/in-stock results */
function groupPricesByStore(
  prices: PiBridgePrice[],
  normalizedName: string,
  preferredState: string | null
): Map<string, PiBridgePrice> {
  const byStore = new Map<string, PiBridgePrice>()

  for (const p of prices) {
    if (!p.in_stock || !p.store) continue
    if (!isProductRelevantToIngredient(p.product_name || '', normalizedName)) continue
    // Prefer same-state prices when available
    if (preferredState && p.state && p.state !== preferredState.toUpperCase()) continue

    const storeName = p.store.trim()
    // Keep the freshest price per store
    const existing = byStore.get(storeName)
    if (!existing) {
      byStore.set(storeName, p)
    } else {
      const existingDate = existing.last_confirmed_at
        ? new Date(existing.last_confirmed_at).getTime()
        : 0
      const newDate = p.last_confirmed_at ? new Date(p.last_confirmed_at).getTime() : 0
      if (newDate > existingDate) {
        byStore.set(storeName, p)
      }
    }
  }

  return byStore
}

/** Get the best price in cents for a PiBridgePrice entry */
function extractCents(p: PiBridgePrice): number | null {
  if (p.price_per_standard_unit_cents && p.price_per_standard_unit_cents > 0) {
    return p.price_per_standard_unit_cents
  }
  if (p.price_cents && p.price_cents > 0) {
    return p.price_cents
  }
  return null
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
  const { db } = await import('@/lib/db')
  const { sql } = await import('drizzle-orm')
  const stateRows = (await db.execute(
    sql`SELECT home_state FROM chefs WHERE id = ${user.tenantId} LIMIT 1`
  )) as unknown as Array<{ home_state: string | null }>
  const preferredState = stateRows[0]?.home_state || null

  // 2. Query Pi Bridge for each ingredient (with multi-store prices)
  // Store accumulator: storeName -> { ingredientId -> price }
  const storeAccumulator = new Map<
    string,
    Map<string, { priceCents: number; confirmedAt: string | null }>
  >()

  const ingredientRows: VendorComparisonResult['ingredients'] = []

  // Process in parallel batches of 10 to avoid overwhelming Pi
  const BATCH_SIZE = 10
  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    const batch = allItems.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async (item) => {
        const normalized = normalizeIngredientName(item.ingredientName)
        const piResult = await lookupPrice(normalized, preferredState || undefined)
        return { item, piResult, normalized }
      })
    )

    for (const { item, piResult, normalized } of results) {
      if (!piResult || piResult.prices.length === 0) {
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

      // Group prices by store
      const byStore = groupPricesByStore(piResult.prices, normalized, preferredState)

      let cheapestVendor: string | null = null
      let cheapestCents: number | null = null

      for (const [storeName, price] of byStore) {
        const cents = extractCents(price)
        if (cents === null) continue

        // Track per-store prices
        if (!storeAccumulator.has(storeName)) {
          storeAccumulator.set(storeName, new Map())
        }
        storeAccumulator.get(storeName)!.set(item.ingredientId, {
          priceCents: cents,
          confirmedAt: price.last_confirmed_at,
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
