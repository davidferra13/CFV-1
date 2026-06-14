/**
 * Ingredient PIE Detail
 *
 * On-demand server action that fetches full PIE pricing intelligence
 * for a single ingredient. Used by the recipe detail page to show
 * pricing history, seasonal data, confidence tier, and trend info
 * when a chef clicks on an ingredient row.
 */

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { resolvePrice } from './resolve-price'
import type { ResolvedPrice } from './resolve-price'
import { getSeasonalPattern } from './seasonal-analysis'
import type { SeasonalPattern } from './seasonal-analysis'
import { getIngredientPriceHistory } from '@/lib/inventory/price-history-actions'
import type { PriceHistoryEntry } from '@/lib/inventory/price-history-actions'

export interface IngredientPieDetail {
  resolvedPrice: ResolvedPrice
  priceHistory: PriceHistoryEntry[]
  seasonalPattern: SeasonalPattern | null
  /** Current month index: 100 = average. Below 100 = cheaper than usual. */
  currentMonthIndex: number | null
  /** Human-friendly season label */
  seasonLabel: 'peak' | 'in-season' | 'off-season' | null
}

/**
 * Fetch full PIE detail for an ingredient. Called on-demand when
 * a chef expands an ingredient row on the recipe detail page.
 */
export async function getIngredientPieDetail(ingredientId: string): Promise<IngredientPieDetail> {
  console.log('[PIE-DETAIL] invoked', { ingredientId, ts: Date.now() })
  const user = await requireChef()
  const tenantId = user.tenantId!
  console.log('[PIE-DETAIL] start', { ingredientId, tenantId })

  // Fetch all three data sources in parallel
  const [resolvedPrice, priceHistory, seasonalPattern] = await Promise.all([
    resolvePrice(ingredientId, tenantId).catch((e) => {
      console.error('[PIE-DETAIL] resolvePrice error:', e)
      throw e
    }),
    getIngredientPriceHistory(ingredientId, { months: 12, limit: 20 }).catch((e) => {
      console.error('[PIE-DETAIL] priceHistory error:', e)
      throw e
    }),
    getSeasonalPattern(ingredientId, tenantId).catch((e) => {
      console.error('[PIE-DETAIL] seasonalPattern error:', e)
      throw e
    }),
  ])

  // Compute current month's seasonal index
  let currentMonthIndex: number | null = null
  let seasonLabel: IngredientPieDetail['seasonLabel'] = null

  if (seasonalPattern && seasonalPattern.monthly_prices.length > 0) {
    const currentMonth = new Date().getMonth() + 1
    const currentMonthData = seasonalPattern.monthly_prices.find((m) => m.month === currentMonth)
    if (currentMonthData) {
      // Calculate index relative to average
      const avgAll =
        seasonalPattern.monthly_prices.reduce((sum, m) => sum + m.avg_cents, 0) /
        seasonalPattern.monthly_prices.length
      if (avgAll > 0) {
        currentMonthIndex = Math.round((currentMonthData.avg_cents / avgAll) * 100)
      }
    }

    // Determine season label
    if (currentMonthIndex !== null) {
      if (currentMonthIndex <= 85) {
        seasonLabel = 'in-season'
      } else if (currentMonthIndex >= 115) {
        seasonLabel = 'peak'
      } else {
        seasonLabel = 'off-season'
      }
    }

    // Also check if we are in the cheapest month
    if (currentMonth === seasonalPattern.cheapest_month) {
      seasonLabel = 'in-season'
    } else if (currentMonth === seasonalPattern.most_expensive_month) {
      seasonLabel = 'peak'
    }
  }

  return {
    resolvedPrice,
    priceHistory,
    seasonalPattern,
    currentMonthIndex,
    seasonLabel,
  }
}
