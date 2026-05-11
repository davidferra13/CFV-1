/**
 * Ingredient Demand Forecast
 *
 * "Next 30 days: 3 events need lobster. Buy now at $14/lb or wait and risk $18/lb."
 *
 * Combines upcoming event menus with PIE seasonal/trend data to produce
 * actionable buying recommendations. Deterministic, zero AI.
 *
 * NOT a 'use server' file. Pure logic called by server actions.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { resolvePricesBatch, type ResolvedPrice } from '@/lib/pricing/resolve-price'
import { getSeasonalPattern } from '@/lib/pricing/seasonal-analysis'

// ---- Types ----------------------------------------------------------------

export interface IngredientDemandItem {
  ingredientId: string
  ingredientName: string
  category: string | null
  unit: string | null
  /** Total quantity needed across all events */
  totalQuantity: number
  /** Events that need this ingredient, sorted by date */
  events: DemandEvent[]
  /** Current resolved price from PIE */
  currentPrice: ResolvedPrice | null
  /** Estimated total cost in cents */
  estimatedCostCents: number
  /** Seasonal trend data */
  seasonal: {
    direction: 'rising' | 'falling' | 'stable' | 'unknown'
    currentMonthIndex: number | null
    cheapestMonth: string | null
    forecast30dCents: number | null
  }
  /** Buying recommendation */
  recommendation: BuyRecommendation
}

export interface DemandEvent {
  eventId: string
  eventDate: string
  clientName: string
  occasion: string | null
  guestCount: number
  quantity: number
  status: string
}

export type BuyRecommendation = {
  action: 'buy_now' | 'wait' | 'watch' | 'no_data'
  reason: string
  urgencyScore: number // 0-100, higher = more urgent
  potentialSavingsCents: number | null
}

export interface IngredientDemandForecast {
  items: IngredientDemandItem[]
  totalEstimatedCostCents: number
  eventsCovered: number
  dateRange: { start: string; end: string }
  topBuyNow: IngredientDemandItem[]
  topWatch: IngredientDemandItem[]
}

// ---- Helpers ---------------------------------------------------------------

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysBetween(a: string, b: string): number {
  return Math.ceil(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  )
}

// ---- Core ------------------------------------------------------------------

export async function forecastIngredientDemand(
  tenantId: string,
  days: number = 30
): Promise<IngredientDemandForecast | null> {
  const now = new Date()
  const today = toISODate(now)
  const futureDate = toISODate(new Date(now.getTime() + days * 86400000))

  // 1. Get upcoming confirmed/probable events
  const events = (await db.execute(sql`
    SELECT
      e.id AS event_id,
      e.event_date::text AS event_date,
      e.guest_count,
      e.status,
      e.occasion,
      c.full_name AS client_name,
      e.menu_id
    FROM events e
    LEFT JOIN clients c ON c.id = e.client_id
    WHERE e.tenant_id = ${tenantId}
      AND e.status IN ('confirmed', 'paid', 'accepted', 'in_progress')
      AND e.event_date >= ${today}
      AND e.event_date <= ${futureDate}
    ORDER BY e.event_date ASC
  `)) as unknown as Array<{
    event_id: string
    event_date: string
    guest_count: number | null
    status: string
    occasion: string | null
    client_name: string | null
    menu_id: string | null
  }>

  if (events.length === 0) return null

  // 2. Get menus for these events
  const menuIds = events.map(e => e.menu_id).filter(Boolean) as string[]
  if (menuIds.length === 0) return null

  // 3. Get dishes from these menus
  const dishes = (await db.execute(sql`
    SELECT d.id, d.menu_id, d.recipe_id
    FROM dishes d
    WHERE d.menu_id = ANY(${menuIds})
      AND d.recipe_id IS NOT NULL
  `)) as unknown as Array<{ id: string; menu_id: string; recipe_id: string }>

  const recipeIds = [...new Set(dishes.map(d => d.recipe_id))]
  if (recipeIds.length === 0) return null

  // 4. Get recipe ingredients
  const ingredients = (await db.execute(sql`
    SELECT
      i.id AS ingredient_id,
      i.name,
      i.category,
      i.quantity,
      i.unit,
      i.recipe_id
    FROM ingredients i
    WHERE i.recipe_id = ANY(${recipeIds})
      AND i.name IS NOT NULL
  `)) as unknown as Array<{
    ingredient_id: string
    name: string
    category: string | null
    quantity: number | null
    unit: string | null
    recipe_id: string
  }>

  if (ingredients.length === 0) return null

  // 5. Build mapping chains: recipe -> menu -> event
  const recipeToMenus = new Map<string, string[]>()
  for (const d of dishes) {
    if (!recipeToMenus.has(d.recipe_id)) recipeToMenus.set(d.recipe_id, [])
    const arr = recipeToMenus.get(d.recipe_id)!
    if (!arr.includes(d.menu_id)) arr.push(d.menu_id)
  }

  const menuToEvents = new Map<string, typeof events>()
  for (const e of events) {
    if (!e.menu_id) continue
    if (!menuToEvents.has(e.menu_id)) menuToEvents.set(e.menu_id, [])
    menuToEvents.get(e.menu_id)!.push(e)
  }

  // 6. Aggregate ingredients across events
  type AggEntry = {
    ingredientId: string
    ingredientName: string
    category: string | null
    unit: string | null
    totalQuantity: number
    events: Map<string, DemandEvent>
  }
  const aggregated = new Map<string, AggEntry>()

  for (const ing of ingredients) {
    const key = ing.ingredient_id
    const menus = recipeToMenus.get(ing.recipe_id) || []

    for (const menuId of menus) {
      const linkedEvents = menuToEvents.get(menuId) || []
      for (const evt of linkedEvents) {
        if (!aggregated.has(key)) {
          aggregated.set(key, {
            ingredientId: ing.ingredient_id,
            ingredientName: ing.name,
            category: ing.category,
            unit: ing.unit,
            totalQuantity: 0,
            events: new Map(),
          })
        }

        const entry = aggregated.get(key)!
        const qty = ing.quantity || 1
        entry.totalQuantity += qty

        if (!entry.events.has(evt.event_id)) {
          entry.events.set(evt.event_id, {
            eventId: evt.event_id,
            eventDate: evt.event_date,
            clientName: evt.client_name || 'Client',
            occasion: evt.occasion,
            guestCount: evt.guest_count || 1,
            quantity: qty,
            status: evt.status,
          })
        } else {
          // Same event, same ingredient from different recipes
          entry.events.get(evt.event_id)!.quantity += qty
        }
      }
    }
  }

  if (aggregated.size === 0) return null

  // 7. Batch resolve prices for all ingredients
  const ingredientIds = [...aggregated.keys()]
  const prices = await resolvePricesBatch(ingredientIds, tenantId)

  // 8. Get seasonal patterns for each ingredient (sample up to 50 for perf)
  const seasonalMap = new Map<string, Awaited<ReturnType<typeof getSeasonalPattern>>>()
  const sampleIds = ingredientIds.slice(0, 50)
  const seasonalResults = await Promise.allSettled(
    sampleIds.map(id => getSeasonalPattern(id, tenantId))
  )
  for (let i = 0; i < sampleIds.length; i++) {
    const result = seasonalResults[i]
    if (result.status === 'fulfilled' && result.value) {
      seasonalMap.set(sampleIds[i], result.value)
    }
  }

  // 9. Build forecast items with recommendations
  const currentMonth = now.getMonth() + 1
  const items: IngredientDemandItem[] = []

  for (const [id, agg] of aggregated) {
    const price = prices.get(id) || null
    const seasonal = seasonalMap.get(id) || null

    // Determine seasonal direction
    let direction: IngredientDemandItem['seasonal']['direction'] = 'unknown'
    let currentMonthIndex: number | null = null
    let cheapestMonth: string | null = null
    let forecast30dCents: number | null = null

    if (seasonal && seasonal.has_seasonal_pattern) {
      const currentMP = seasonal.monthly_prices.find(m => m.month === currentMonth)
      const nextMP = seasonal.monthly_prices.find(m => m.month === ((currentMonth % 12) + 1))
      currentMonthIndex = currentMP?.avg_cents || null

      if (currentMP && nextMP) {
        if (nextMP.avg_cents > currentMP.avg_cents * 1.05) direction = 'rising'
        else if (nextMP.avg_cents < currentMP.avg_cents * 0.95) direction = 'falling'
        else direction = 'stable'
        forecast30dCents = nextMP.avg_cents
      }

      cheapestMonth = MONTH_NAMES[seasonal.cheapest_month - 1] || null
    }

    // Calculate estimated cost
    const unitCents = price?.cents || 0
    const estimatedCostCents = Math.round(unitCents * agg.totalQuantity)

    // Build recommendation
    const eventList = Array.from(agg.events.values()).sort(
      (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    )
    const earliestEvent = eventList[0]
    const daysUntilNeeded = earliestEvent
      ? daysBetween(today, earliestEvent.eventDate)
      : days

    const recommendation = buildRecommendation({
      direction,
      daysUntilNeeded,
      price,
      forecast30dCents,
      eventCount: eventList.length,
      estimatedCostCents,
    })

    items.push({
      ingredientId: id,
      ingredientName: agg.ingredientName,
      category: agg.category,
      unit: agg.unit,
      totalQuantity: agg.totalQuantity,
      events: eventList,
      currentPrice: price,
      estimatedCostCents,
      seasonal: {
        direction,
        currentMonthIndex,
        cheapestMonth,
        forecast30dCents,
      },
      recommendation,
    })
  }

  // Sort by urgency/value
  items.sort((a, b) => b.recommendation.urgencyScore - a.recommendation.urgencyScore)

  const totalCost = items.reduce((s, i) => s + i.estimatedCostCents, 0)

  return {
    items,
    totalEstimatedCostCents: totalCost,
    eventsCovered: events.length,
    dateRange: { start: today, end: futureDate },
    topBuyNow: items.filter(i => i.recommendation.action === 'buy_now').slice(0, 10),
    topWatch: items.filter(i => i.recommendation.action === 'watch').slice(0, 10),
  }
}

// ---- Recommendation Engine -------------------------------------------------

function buildRecommendation(ctx: {
  direction: IngredientDemandItem['seasonal']['direction']
  daysUntilNeeded: number
  price: ResolvedPrice | null
  forecast30dCents: number | null
  eventCount: number
  estimatedCostCents: number
}): BuyRecommendation {
  const { direction, daysUntilNeeded, price, forecast30dCents, eventCount, estimatedCostCents } = ctx

  // No price data at all
  if (!price || price.source === 'none') {
    return {
      action: 'no_data',
      reason: 'No pricing data available for this ingredient.',
      urgencyScore: daysUntilNeeded <= 7 ? 60 : 30,
      potentialSavingsCents: null,
    }
  }

  // Urgent: needed in 3 days or less
  if (daysUntilNeeded <= 3) {
    return {
      action: 'buy_now',
      reason: `Needed in ${daysUntilNeeded} day${daysUntilNeeded === 1 ? '' : 's'}. Buy immediately.`,
      urgencyScore: 95,
      potentialSavingsCents: null,
    }
  }

  // Price trending up: buy now to lock in current price
  if (direction === 'rising' && forecast30dCents && price.cents > 0) {
    const savingsCents = Math.max(0, (forecast30dCents - price.cents) * (estimatedCostCents / price.cents || 1))
    const savingsRounded = Math.round(savingsCents)
    return {
      action: 'buy_now',
      reason: `Price trending up. Current price may save you compared to buying later.`,
      urgencyScore: Math.min(90, 60 + eventCount * 5),
      potentialSavingsCents: savingsRounded > 0 ? savingsRounded : null,
    }
  }

  // Price trending down: wait if possible
  if (direction === 'falling' && daysUntilNeeded > 7) {
    const savingsCents = forecast30dCents && price.cents > 0
      ? Math.max(0, (price.cents - forecast30dCents) * (estimatedCostCents / price.cents || 1))
      : null
    return {
      action: 'wait',
      reason: `Price trending down. Wait for a better price if your schedule allows.`,
      urgencyScore: Math.max(20, 50 - daysUntilNeeded),
      potentialSavingsCents: savingsCents ? Math.round(savingsCents) : null,
    }
  }

  // Multiple events need this: buy in bulk
  if (eventCount >= 3) {
    return {
      action: 'buy_now',
      reason: `Needed for ${eventCount} events. Bulk buying saves trips and may reduce cost.`,
      urgencyScore: Math.min(85, 55 + eventCount * 5),
      potentialSavingsCents: Math.round(estimatedCostCents * 0.1), // estimated 10% bulk savings
    }
  }

  // Moderate urgency: needed in 1-2 weeks
  if (daysUntilNeeded <= 14) {
    return {
      action: 'buy_now',
      reason: `First event in ${daysUntilNeeded} days. Time to shop.`,
      urgencyScore: 65,
      potentialSavingsCents: null,
    }
  }

  // Default: watch
  return {
    action: 'watch',
    reason: `Not needed for ${daysUntilNeeded} days. Monitor price before buying.`,
    urgencyScore: 30,
    potentialSavingsCents: null,
  }
}

// ---- Top Buying Recommendations --------------------------------------------

export async function getBuyingRecommendations(
  tenantId: string
): Promise<IngredientDemandItem[]> {
  const forecast = await forecastIngredientDemand(tenantId, 30)
  if (!forecast) return []

  // Top 10 buy-now-or-wait decisions sorted by urgency then savings potential
  return forecast.items
    .filter(i => i.recommendation.action !== 'no_data')
    .sort((a, b) => {
      // Primary: urgency score descending
      if (b.recommendation.urgencyScore !== a.recommendation.urgencyScore) {
        return b.recommendation.urgencyScore - a.recommendation.urgencyScore
      }
      // Secondary: estimated cost descending (higher value items first)
      return b.estimatedCostCents - a.estimatedCostCents
    })
    .slice(0, 10)
}
