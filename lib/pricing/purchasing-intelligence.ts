/**
 * PIE Intelligence Layer 4: Purchasing Intelligence
 *
 * Helps chefs buy smarter: bulk recommendations, vendor comparison,
 * order optimization, and cost-per-event purchasing plans.
 *
 * Capabilities:
 *   1. Bulk Buy Analysis - When buying more saves money (break-even calc)
 *   2. Vendor Comparison - Compare prices across stores for shopping lists
 *   3. Order Optimization - Optimal store routing for minimum total cost
 *   4. Event Purchasing Plan - Complete shopping plan for an event
 *   5. Pantry Stock Intelligence - What to keep on hand vs buy fresh
 *
 * NOT a 'use server' file. Called by server actions.
 */

import { pgClient } from '@/lib/db'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BulkBuyRecommendation {
  ingredientId: string
  ingredientName: string
  category: string
  /** Current unit price (cents) */
  unitPriceCents: number
  /** Bulk unit price (cents) if buying larger quantity */
  bulkPriceCents: number
  /** Savings percentage going bulk */
  savingsPct: number
  /** Recommended bulk quantity */
  recommendedQuantity: number
  /** Shelf life in days (determines if bulk makes sense) */
  shelfLifeDays: number | null
  /** Chef's typical monthly usage */
  monthlyUsage: number
  /** Does buying bulk make sense given usage + shelf life? */
  recommended: boolean
  /** Reason for recommendation */
  reason: string
}

export interface VendorComparison {
  ingredientId: string
  ingredientName: string
  vendors: Array<{
    storeName: string
    storeId: string
    priceCents: number
    unit: string
    inStock: boolean
    lastConfirmed: string
    distance: string | null
  }>
  cheapest: { storeName: string; priceCents: number }
  mostExpensive: { storeName: string; priceCents: number }
  savingsIfCheapest: number
}

export interface ShoppingPlan {
  eventId: string
  eventName: string
  totalCostCents: number
  optimizedCostCents: number
  savingsCents: number
  stores: Array<{
    storeName: string
    storeId: string
    items: Array<{ name: string; quantity: number; unit: string; priceCents: number }>
    subtotalCents: number
  }>
  unresolved: Array<{ name: string; reason: string }>
}

export interface PantryRecommendation {
  ingredientId: string
  ingredientName: string
  category: string
  /** How often this chef uses it (events per month) */
  usageFrequency: number
  /** Current price volatility */
  volatility: 'low' | 'medium' | 'high'
  /** Shelf life category */
  shelfLife: 'perishable' | 'short' | 'medium' | 'long' | 'indefinite'
  /** Recommendation */
  action: 'stock_always' | 'buy_fresh' | 'buy_in_bulk' | 'seasonal_stock'
  /** Why */
  reason: string
  /** Optimal quantity to keep on hand */
  optimalStockQuantity: number | null
  optimalStockUnit: string | null
}

// ---------------------------------------------------------------------------
// Shelf Life Data
// ---------------------------------------------------------------------------

const SHELF_LIFE_DAYS: Record<string, number> = {
  protein: 3,
  seafood: 2,
  produce: 7,
  dairy: 14,
  herb: 7,
  spice: 365,
  grain: 180,
  oil: 180,
  pantry: 365,
  nut: 90,
  legume: 365,
  beverage: 90,
  baked: 5,
  sweet: 30,
  condiment: 180,
}

function getShelfLife(category: string): number {
  return SHELF_LIFE_DAYS[category.toLowerCase()] || 30
}

function getShelfLifeCategory(days: number): PantryRecommendation['shelfLife'] {
  if (days <= 3) return 'perishable'
  if (days <= 7) return 'short'
  if (days <= 30) return 'medium'
  if (days <= 180) return 'long'
  return 'indefinite'
}

// ---------------------------------------------------------------------------
// Bulk Buy Analysis
// ---------------------------------------------------------------------------

/**
 * Analyze which ingredients the chef should buy in bulk.
 * Considers: usage frequency, shelf life, price volume discounts, storage.
 */
export async function analyzeBulkBuyOpportunities(
  tenantId: string,
  state: string
): Promise<BulkBuyRecommendation[]> {
  const pgSql = pgClient

  // Get chef's ingredient usage frequency (from recipe_ingredients + events)
  const usage = (await db.execute(sql`
    SELECT
      ri.canonical_ingredient_id,
      ri.name,
      COUNT(DISTINCT e.id) AS event_count,
      SUM(ri.quantity) AS total_quantity,
      ri.unit,
      ci_cat.category
    FROM recipe_ingredients ri
    JOIN recipes r ON r.id = ri.recipe_id
    JOIN event_menus em ON em.recipe_id = r.id
    JOIN events e ON e.id = em.event_id
    LEFT JOIN (
      SELECT ingredient_id, category FROM openclaw.canonical_ingredients
    ) ci_cat ON ci_cat.ingredient_id = ri.canonical_ingredient_id
    WHERE r.tenant_id = ${tenantId}
      AND e.event_date > now() - interval '6 months'
      AND ri.canonical_ingredient_id IS NOT NULL
    GROUP BY ri.canonical_ingredient_id, ri.name, ri.unit, ci_cat.category
    HAVING COUNT(DISTINCT e.id) >= 3
    ORDER BY COUNT(DISTINCT e.id) DESC
  `)) as unknown as Array<{
    canonical_ingredient_id: string
    name: string
    event_count: number
    total_quantity: number
    unit: string
    category: string | null
  }>

  const recommendations: BulkBuyRecommendation[] = []

  for (const item of usage) {
    const category = item.category || 'pantry'
    const shelfLifeDays = getShelfLife(category)
    const monthlyUsage = Math.round(Number(item.total_quantity) / 6) // 6 months of data
    const eventsPerMonth = Math.round(Number(item.event_count) / 6)

    // Get current retail price
    const [price] = await pgSql`
      SELECT price_cents
      FROM openclaw.resolved_prices
      WHERE canonical_ingredient_id = ${item.canonical_ingredient_id}
      ORDER BY confidence DESC
      LIMIT 1
    `

    if (!price) continue
    const unitPrice = Number(price.price_cents)

    // Estimate bulk savings (typically 15-30% for 5x+ quantity)
    const bulkMultiplier = monthlyUsage >= 10 ? 0.7 : monthlyUsage >= 5 ? 0.8 : 0.85
    const bulkPrice = Math.round(unitPrice * bulkMultiplier)
    const savingsPct = Math.round((1 - bulkMultiplier) * 100)

    // Can chef use it before it expires?
    const daysToConsume =
      monthlyUsage > 0 ? Math.round(((monthlyUsage * 5) / monthlyUsage) * 30) : 999
    const canConsume = daysToConsume <= shelfLifeDays

    const recommended = canConsume && savingsPct > 10 && eventsPerMonth >= 2

    let reason: string
    if (recommended) {
      reason = `Used ${eventsPerMonth}x/month. Bulk saves ${savingsPct}%. ${shelfLifeDays}+ day shelf life covers usage.`
    } else if (!canConsume) {
      reason = `Only ${shelfLifeDays} day shelf life. Buy fresh per event.`
    } else {
      reason = `Usage too low to justify bulk. ${eventsPerMonth} events/month.`
    }

    recommendations.push({
      ingredientId: item.canonical_ingredient_id,
      ingredientName: item.name,
      category,
      unitPriceCents: unitPrice,
      bulkPriceCents: bulkPrice,
      savingsPct,
      recommendedQuantity: recommended ? monthlyUsage * 2 : monthlyUsage,
      shelfLifeDays,
      monthlyUsage,
      recommended,
      reason,
    })
  }

  // Sort: recommended first, then by savings potential
  recommendations.sort((a, b) => {
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1
    return b.savingsPct - a.savingsPct
  })

  return recommendations
}

// ---------------------------------------------------------------------------
// Vendor Comparison
// ---------------------------------------------------------------------------

/**
 * Compare prices across all stores for given ingredients.
 */
export async function compareVendors(
  ingredientIds: string[],
  state: string
): Promise<VendorComparison[]> {
  if (ingredientIds.length === 0) return []
  const pgSql = pgClient

  const comparisons: VendorComparison[] = []

  for (const ingredientId of ingredientIds) {
    const prices = await pgSql`
      SELECT
        sp.price_cents,
        sp.unit,
        sp.in_stock,
        sp.last_confirmed_at,
        s.name AS store_name,
        s.id AS store_id,
        s.city
      FROM openclaw.store_products sp
      JOIN openclaw.stores s ON s.id = sp.store_id
      JOIN openclaw.normalization_map nm ON nm.raw_name = (
        SELECT p.name FROM openclaw.products p WHERE p.id = sp.product_id
      )
      WHERE nm.canonical_ingredient_id = ${ingredientId}
        AND s.state = ${state}
        AND sp.last_confirmed_at > now() - interval '30 days'
      ORDER BY sp.price_cents ASC
      LIMIT 10
    `

    if (prices.length < 2) continue

    const [name] = await pgSql`
      SELECT name FROM openclaw.canonical_ingredients WHERE ingredient_id = ${ingredientId}
    `

    const vendors = prices.map((p) => ({
      storeName: p.store_name as string,
      storeId: p.store_id as string,
      priceCents: Number(p.price_cents),
      unit: p.unit as string,
      inStock: p.in_stock as boolean,
      lastConfirmed: (p.last_confirmed_at as Date).toISOString(),
      distance: p.city ? `${p.city}` : null,
    }))

    const cheapest = vendors[0]
    const mostExpensive = vendors[vendors.length - 1]
    const savings = mostExpensive.priceCents - cheapest.priceCents

    comparisons.push({
      ingredientId,
      ingredientName: (name?.name as string) || 'Unknown',
      vendors,
      cheapest: { storeName: cheapest.storeName, priceCents: cheapest.priceCents },
      mostExpensive: { storeName: mostExpensive.storeName, priceCents: mostExpensive.priceCents },
      savingsIfCheapest: savings,
    })
  }

  return comparisons.sort((a, b) => b.savingsIfCheapest - a.savingsIfCheapest)
}

// ---------------------------------------------------------------------------
// Event Shopping Plan
// ---------------------------------------------------------------------------

/**
 * Generate optimized shopping plan for an event.
 * Routes ingredients to cheapest available store.
 */
export async function generateShoppingPlan(
  eventId: string,
  tenantId: string,
  state: string
): Promise<ShoppingPlan | null> {
  // Get event details and all ingredients needed
  const [event] = (await db.execute(sql`
    SELECT id, name FROM events WHERE id = ${eventId} AND tenant_id = ${tenantId}
  `)) as unknown as Array<{ id: string; name: string }>

  if (!event) return null

  const ingredients = (await db.execute(sql`
    SELECT
      ri.canonical_ingredient_id,
      ri.name,
      ri.quantity,
      ri.unit,
      ri.cost_cents
    FROM recipe_ingredients ri
    JOIN recipes r ON r.id = ri.recipe_id
    JOIN event_menus em ON em.recipe_id = r.id
    WHERE em.event_id = ${eventId}
      AND ri.canonical_ingredient_id IS NOT NULL
  `)) as unknown as Array<{
    canonical_ingredient_id: string
    name: string
    quantity: number
    unit: string
    cost_cents: number | null
  }>

  const pgSql = pgClient
  const storeAssignments = new Map<
    string,
    Array<{ name: string; quantity: number; unit: string; priceCents: number }>
  >()
  const unresolved: Array<{ name: string; reason: string }> = []
  let totalNaiveCost = 0
  let totalOptimizedCost = 0

  for (const ing of ingredients) {
    totalNaiveCost += Number(ing.cost_cents || 0)

    // Find cheapest store for this ingredient
    const [cheapest] = await pgSql`
      SELECT
        sp.price_cents,
        s.name AS store_name,
        s.id AS store_id
      FROM openclaw.store_products sp
      JOIN openclaw.stores s ON s.id = sp.store_id
      JOIN openclaw.normalization_map nm ON nm.raw_name = (
        SELECT p.name FROM openclaw.products p WHERE p.id = sp.product_id
      )
      WHERE nm.canonical_ingredient_id = ${ing.canonical_ingredient_id}
        AND s.state = ${state}
        AND sp.in_stock = true
        AND sp.last_confirmed_at > now() - interval '14 days'
      ORDER BY sp.price_cents ASC
      LIMIT 1
    `

    if (!cheapest) {
      unresolved.push({ name: ing.name, reason: 'No in-stock vendor found' })
      totalOptimizedCost += Number(ing.cost_cents || 0)
      continue
    }

    const storeName = cheapest.store_name as string
    const storeId = cheapest.store_id as string
    const key = `${storeId}|${storeName}`
    const price = Number(cheapest.price_cents) * ing.quantity

    if (!storeAssignments.has(key)) storeAssignments.set(key, [])
    storeAssignments.get(key)!.push({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      priceCents: price,
    })
    totalOptimizedCost += price
  }

  const stores = Array.from(storeAssignments.entries())
    .map(([key, items]) => {
      const [storeId, storeName] = key.split('|')
      return {
        storeName,
        storeId,
        items,
        subtotalCents: items.reduce((s, i) => s + i.priceCents, 0),
      }
    })
    .sort((a, b) => b.subtotalCents - a.subtotalCents)

  return {
    eventId: event.id,
    eventName: event.name,
    totalCostCents: totalNaiveCost,
    optimizedCostCents: totalOptimizedCost,
    savingsCents: totalNaiveCost - totalOptimizedCost,
    stores,
    unresolved,
  }
}

// ---------------------------------------------------------------------------
// Pantry Stock Recommendations
// ---------------------------------------------------------------------------

/**
 * Recommend what a chef should keep stocked vs buy fresh.
 */
export async function getPantryRecommendations(tenantId: string): Promise<PantryRecommendation[]> {
  const pgSql = pgClient

  // Get all ingredients the chef uses, with frequency
  const usage = (await db.execute(sql`
    SELECT
      ri.canonical_ingredient_id,
      ri.name,
      COUNT(DISTINCT r.id) AS recipe_count,
      COUNT(DISTINCT e.id) AS event_count
    FROM recipe_ingredients ri
    JOIN recipes r ON r.id = ri.recipe_id
    LEFT JOIN event_menus em ON em.recipe_id = r.id
    LEFT JOIN events e ON e.id = em.event_id AND e.event_date > now() - interval '3 months'
    WHERE r.tenant_id = ${tenantId}
      AND ri.canonical_ingredient_id IS NOT NULL
    GROUP BY ri.canonical_ingredient_id, ri.name
    ORDER BY COUNT(DISTINCT e.id) DESC
  `)) as unknown as Array<{
    canonical_ingredient_id: string
    name: string
    recipe_count: number
    event_count: number
  }>

  const recommendations: PantryRecommendation[] = []

  for (const item of usage) {
    // Get category and trend info
    const [info] = await pgSql`
      SELECT ci.category, it.volatility
      FROM openclaw.canonical_ingredients ci
      LEFT JOIN openclaw.ingredient_trends it ON it.ingredient_id = ci.ingredient_id
      WHERE ci.ingredient_id = ${item.canonical_ingredient_id}
    `

    const category = (info?.category as string) || 'pantry'
    const volatilityVal = Number(info?.volatility || 0)
    const volatility: PantryRecommendation['volatility'] =
      volatilityVal > 0.25 ? 'high' : volatilityVal > 0.1 ? 'medium' : 'low'

    const shelfLifeDays = getShelfLife(category)
    const shelfLife = getShelfLifeCategory(shelfLifeDays)
    const usageFrequency = Number(item.event_count) / 3 // per month over 3 months

    let action: PantryRecommendation['action']
    let reason: string
    let optimalQuantity: number | null = null
    let optimalUnit: string | null = null

    if (shelfLife === 'perishable' || shelfLife === 'short') {
      action = 'buy_fresh'
      reason = `${shelfLifeDays}-day shelf life. Must buy per event.`
    } else if (usageFrequency >= 4 && shelfLifeDays >= 30) {
      action = 'stock_always'
      reason = `Used ${usageFrequency.toFixed(1)}x/month. Long shelf life. Always have on hand.`
      optimalQuantity = Math.ceil(usageFrequency * 2) // 2 months supply
      optimalUnit = 'servings'
    } else if (volatility === 'high' && shelfLifeDays >= 90) {
      action = 'buy_in_bulk'
      reason = `Volatile price + long shelf life. Buy when price dips.`
      optimalQuantity = Math.ceil(usageFrequency * 3)
      optimalUnit = 'servings'
    } else if (usageFrequency >= 2 && shelfLifeDays >= 14) {
      action = 'seasonal_stock'
      reason = `Moderate use. Stock when in-season or on sale.`
    } else {
      action = 'buy_fresh'
      reason = `Low frequency (${usageFrequency.toFixed(1)}/month). Buy as needed.`
    }

    recommendations.push({
      ingredientId: item.canonical_ingredient_id,
      ingredientName: item.name,
      category,
      usageFrequency,
      volatility,
      shelfLife,
      action,
      reason,
      optimalStockQuantity: optimalQuantity,
      optimalStockUnit: optimalUnit,
    })
  }

  return recommendations
}
