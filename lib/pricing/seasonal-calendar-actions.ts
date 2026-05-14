'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getSeasonalPatterns, type SeasonalPattern } from './trend-intelligence'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export interface SeasonalCalendarEntry {
  ingredientId: string
  ingredientName: string
  category: string
  /** 12 monthly price indices (index 0 = Jan). 1.0 = average, 0.8 = 20% below, 1.3 = 30% above */
  monthlyIndices: number[]
  cheapestMonth: number
  expensiveMonth: number
  seasonalSwingPct: number
  inSeason: boolean
  confidence: number
}

export interface SeasonalCalendarData {
  entries: SeasonalCalendarEntry[]
  currentMonth: number
  deals: SeasonalCalendarEntry[]
  risingPrices: SeasonalCalendarEntry[]
  timestamp: string
}

/**
 * Get seasonal calendar data for the chef's recipe ingredients.
 * Returns monthly price indices, current deals, and rising price warnings.
 */
export async function getSeasonalCalendar(ingredientIds?: string[]): Promise<SeasonalCalendarData> {
  const chef = await requireChef()
  const currentMonth = new Date().getMonth() + 1

  // If no IDs provided, pull from chef's active recipes
  let ids = ingredientIds
  if (!ids || ids.length === 0) {
    const rows = (await db.execute(sql`
      SELECT DISTINCT ri.canonical_ingredient_id
      FROM recipe_ingredients ri
      JOIN recipes r ON r.id = ri.recipe_id
      WHERE r.tenant_id = ${chef.tenantId}
        AND r.is_archived = false
        AND ri.canonical_ingredient_id IS NOT NULL
      LIMIT 200
    `)) as unknown as Array<{ canonical_ingredient_id: string }>

    ids = rows.map((r) => r.canonical_ingredient_id)
  }

  if (ids.length === 0) {
    return {
      entries: [],
      currentMonth,
      deals: [],
      risingPrices: [],
      timestamp: new Date().toISOString(),
    }
  }

  const patterns = await getSeasonalPatterns(ids)

  const entries: SeasonalCalendarEntry[] = patterns.map((p: SeasonalPattern) => ({
    ingredientId: p.ingredientId,
    ingredientName: p.ingredientName,
    category: p.category,
    monthlyIndices:
      p.monthlyIndices.length === 12
        ? p.monthlyIndices.map((v) => v / 100)
        : Array.from({ length: 12 }, () => 1.0),
    cheapestMonth: p.cheapestMonth,
    expensiveMonth: p.expensiveMonth,
    seasonalSwingPct: p.seasonalSwingPct,
    inSeason: p.inSeason,
    confidence: p.confidence,
  }))

  // Deals: ingredients currently at or near their seasonal low (index <= 0.9)
  const deals = entries.filter((e) => {
    const idx = e.monthlyIndices[currentMonth - 1]
    return idx !== undefined && idx <= 0.9
  })

  // Rising prices: ingredients approaching their seasonal peak
  // Current index > 1.0 and next month even higher, or currently in expensive month range
  const risingPrices = entries.filter((e) => {
    const currentIdx = e.monthlyIndices[currentMonth - 1] ?? 1.0
    const nextMonth = currentMonth % 12
    const nextIdx = e.monthlyIndices[nextMonth] ?? 1.0
    return currentIdx > 1.0 && nextIdx >= currentIdx
  })

  return {
    entries,
    currentMonth,
    deals: deals.sort((a, b) => {
      const aIdx = a.monthlyIndices[currentMonth - 1] ?? 1
      const bIdx = b.monthlyIndices[currentMonth - 1] ?? 1
      return aIdx - bIdx
    }),
    risingPrices: risingPrices.sort((a, b) => {
      const aIdx = a.monthlyIndices[currentMonth - 1] ?? 1
      const bIdx = b.monthlyIndices[currentMonth - 1] ?? 1
      return bIdx - aIdx
    }),
    timestamp: new Date().toISOString(),
  }
}
