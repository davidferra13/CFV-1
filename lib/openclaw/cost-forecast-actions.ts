'use server'

/**
 * Menu Cost Forecasting
 * Projects menu cost based on current price trends.
 * All logic is deterministic linear extrapolation (formula > AI).
 */

import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { resolvePricesBatch } from '@/lib/pricing/resolve-price'

// --- Types ---

export type IngredientForecast = {
  name: string
  currentCents: number
  forecastCents: number
  trendDirection: 'up' | 'down' | 'flat' | 'unknown'
  trendPct7d: number | null
}

export type CostForecast = {
  currentCostCents: number
  forecastCostCents: number
  changePct: number
  daysOut: number
  confidence: 'high' | 'medium' | 'low'
  ingredientForecasts: IngredientForecast[]
  caveat: string | null
}

// --- Action ---

export async function forecastMenuCost(
  menuId: string,
  eventDate: string
): Promise<CostForecast | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  // Parse event date, skip if in the past
  const eventDay = new Date(eventDate)
  const now = new Date()
  if (eventDay <= now) return null

  const daysOut = Math.ceil((eventDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Get menu's recipe ingredients (menu -> menu_recipes -> recipe_ingredients -> ingredients)
  const ingredientRows = (await db.execute(sql`
    SELECT DISTINCT i.id, i.name, i.price_trend_pct
    FROM menu_recipes mr
    JOIN recipe_ingredients ri ON ri.recipe_id = mr.recipe_id
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE mr.menu_id = ${menuId}
      AND i.tenant_id = ${tenantId}
  `)) as unknown as { id: string; name: string; price_trend_pct: number | null }[]

  if (ingredientRows.length === 0) return null

  const ingredientIds = ingredientRows.map((r) => r.id)
  const currentPrices = await resolvePricesBatch(ingredientIds, tenantId)

  let currentTotal = 0
  let forecastTotal = 0
  let trendDataCount = 0
  const forecasts: IngredientForecast[] = []

  for (const row of ingredientRows) {
    const price = currentPrices.get(row.id)
    const currentCents = price?.cents || 0

    currentTotal += currentCents

    const trendPct7d = row.price_trend_pct
    let forecastCents = currentCents
    let trendDirection: 'up' | 'down' | 'flat' | 'unknown' = 'unknown'

    if (trendPct7d !== null && currentCents > 0) {
      trendDataCount++
      // Linear extrapolation, capped at +/- 30%
      const rawForecast = currentCents * (1 + (trendPct7d / 100) * (daysOut / 7))
      forecastCents = Math.round(
        Math.max(currentCents * 0.7, Math.min(currentCents * 1.3, rawForecast))
      )

      if (trendPct7d < -1) trendDirection = 'down'
      else if (trendPct7d > 1) trendDirection = 'up'
      else trendDirection = 'flat'
    }

    forecastTotal += forecastCents

    forecasts.push({
      name: row.name,
      currentCents,
      forecastCents,
      trendDirection,
      trendPct7d,
    })
  }

  // Confidence
  const trendCoverage = ingredientRows.length > 0 ? trendDataCount / ingredientRows.length : 0
  let confidence: 'high' | 'medium' | 'low'
  if (trendCoverage > 0.8 && daysOut < 14) confidence = 'high'
  else if (trendCoverage > 0.5 || daysOut <= 30) confidence = 'medium'
  else confidence = 'low'

  const changePct =
    currentTotal > 0 ? Math.round(((forecastTotal - currentTotal) / currentTotal) * 1000) / 10 : 0

  const caveat =
    trendDataCount < ingredientRows.length
      ? `Based on ${Math.round(trendCoverage * 100)}% trend data coverage for ${ingredientRows.length} ingredients. Accuracy improves over time.`
      : null

  return {
    currentCostCents: currentTotal,
    forecastCostCents: forecastTotal,
    changePct,
    daysOut,
    confidence,
    ingredientForecasts: forecasts,
    caveat,
  }
}
