'use server'

import { requireChef } from '@/lib/auth/get-user'
import {
  forecastIngredientDemand,
  getBuyingRecommendations,
  type IngredientDemandForecast,
  type IngredientDemandItem,
} from './ingredient-demand'

/**
 * Get the full ingredient demand forecast for the next N days.
 * Shows all ingredients needed, which events use them, current prices,
 * seasonal trends, and buying recommendations.
 */
export async function getIngredientDemandForecast(
  days: number = 30
): Promise<IngredientDemandForecast | null> {
  const user = await requireChef()
  if (!user.tenantId) return null

  try {
    return await forecastIngredientDemand(user.tenantId, days)
  } catch (err) {
    console.error('[getIngredientDemandForecast] Error:', err)
    return null
  }
}

/**
 * Get top 10 buy-now-or-wait recommendations.
 * Sorted by urgency and value.
 */
export async function getTopBuyingRecommendations(): Promise<IngredientDemandItem[]> {
  const user = await requireChef()
  if (!user.tenantId) return []

  try {
    return await getBuyingRecommendations(user.tenantId)
  } catch (err) {
    console.error('[getTopBuyingRecommendations] Error:', err)
    return []
  }
}
