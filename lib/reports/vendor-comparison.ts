// Vendor Comparison Report Generator
// For a chef's top ingredients by usage, compares prices across vendors
// and computes trends and potential savings.

import { createServerClient } from '@/lib/db/server'

// Types

export type VendorPrice = {
  vendorId: string
  vendorName: string
  priceCents: number
  unit: string
  isCheapest: boolean
}

export type PriceTrend = {
  direction: 'up' | 'down' | 'flat'
  changePercent: number
  previousPriceCents: number
  currentPriceCents: number
}

export type IngredientComparison = {
  ingredientId: string
  ingredientName: string
  vendorPrices: VendorPrice[]
  bestPriceCents: number
  bestVendorName: string
  trend: PriceTrend | null
}

export type VendorSavingsOpportunity = {
  ingredientName: string
  currentVendor: string
  currentPriceCents: number
  suggestedVendor: string
  suggestedPriceCents: number
  savingsCents: number
}

export type VendorRanking = {
  vendorName: string
  vendorId: string
  cheapestCount: number
  avgPriceCents: number
  totalItemsTracked: number
}

export type VendorComparisonReport = {
  month: string // YYYY-MM
  generatedAt: string
  comparisons: IngredientComparison[]
  vendorNames: string[] // all unique vendor names (for table columns)
  vendorRankings: VendorRanking[]
  savingsOpportunities: VendorSavingsOpportunity[]
  totalPotentialSavingsCents: number
  topVendorByValue: string | null
  mostExpensiveVendor: string | null
}

export async function generateVendorComparison(
  tenantId: string,
  month?: string
): Promise<VendorComparisonReport> {
  const db: any = createServerClient()

  // Default to current month
  const now = new Date()
  const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [yearStr, monthStr] = targetMonth.split('-')
  const yearNum = parseInt(yearStr, 10)
  const monthNum = parseInt(monthStr, 10)

  // Calculate date ranges
  const monthStart = `${targetMonth}-01`
  const nextMonth = monthNum === 12
    ? `${yearNum + 1}-01-01`
    : `${yearNum}-${String(monthNum + 1).padStart(2, '0')}-01`

  // Previous month for trend comparison
  const prevMonthNum = monthNum === 1 ? 12 : monthNum - 1
  const prevYearNum = monthNum === 1 ? yearNum - 1 : yearNum
  const prevMonthStart = `${prevYearNum}-${String(prevMonthNum).padStart(2, '0')}-01`

  // Get all vendor items with ingredient links and vendor names
  const [vendorItemsResult, vendorPricePointsResult, prevPricePointsResult] = await Promise.all([
    db
      .from('vendor_items')
      .select('id, vendor_id, ingredient_id, vendor_item_name, unit_price_cents, unit_measure, vendors(id, name, status)')
      .eq('chef_id', tenantId)
      .not('ingredient_id', 'is', null),
    // Current month price points for trend data
    db
      .from('vendor_price_points')
      .select('vendor_id, item_name, unit, price_cents, recorded_at, ingredient_id')
      .eq('chef_id', tenantId)
      .gte('recorded_at', monthStart)
      .lt('recorded_at', nextMonth)
      .order('recorded_at', { ascending: false }),
    // Previous month price points
    db
      .from('vendor_price_points')
      .select('vendor_id, item_name, unit, price_cents, recorded_at, ingredient_id')
      .eq('chef_id', tenantId)
      .gte('recorded_at', prevMonthStart)
      .lt('recorded_at', monthStart)
      .order('recorded_at', { ascending: false }),
  ])

  const vendorItems: any[] = vendorItemsResult.data || []
  const currentPoints: any[] = vendorPricePointsResult.data || []
  const prevPoints: any[] = prevPricePointsResult.data || []

  // Get ingredient names
  const ingredientIds = [...new Set(vendorItems.map((vi: any) => vi.ingredient_id).filter(Boolean))]

  let ingredientMap = new Map<string, string>()
  if (ingredientIds.length > 0) {
    const { data: ingredients } = await db
      .from('ingredients')
      .select('id, name')
      .in('id', ingredientIds)

    for (const ing of ingredients || []) {
      ingredientMap.set(ing.id, ing.name)
    }
  }

  // Group vendor items by ingredient
  const byIngredient = new Map<string, any[]>()
  for (const vi of vendorItems) {
    if (!vi.ingredient_id) continue
    const existing = byIngredient.get(vi.ingredient_id) || []
    existing.push(vi)
    byIngredient.set(vi.ingredient_id, existing)
  }

  // Build previous month price map for trends: key = vendorId|ingredientId
  const prevPriceMap = new Map<string, number>()
  for (const pp of prevPoints) {
    if (!pp.ingredient_id) continue
    const key = `${pp.vendor_id}|${pp.ingredient_id}`
    // Only keep the latest (first in desc order)
    if (!prevPriceMap.has(key)) {
      prevPriceMap.set(key, pp.price_cents)
    }
  }

  // Build current month price map for trends
  const currentPriceMap = new Map<string, number>()
  for (const cp of currentPoints) {
    if (!cp.ingredient_id) continue
    const key = `${cp.vendor_id}|${cp.ingredient_id}`
    if (!currentPriceMap.has(key)) {
      currentPriceMap.set(key, cp.price_cents)
    }
  }

  // Build comparisons
  const comparisons: IngredientComparison[] = []
  const allVendorNames = new Set<string>()
  const vendorCheapestCounts = new Map<string, { id: string; count: number; totalPrice: number; totalItems: number }>()

  for (const [ingredientId, items] of byIngredient) {
    if (items.length < 1) continue // need at least 1 vendor

    const ingName = ingredientMap.get(ingredientId) || items[0].vendor_item_name || 'Unknown'

    // Build vendor prices for this ingredient
    const vendorPrices: VendorPrice[] = []
    let bestPriceCents = Infinity
    let bestVendorName = ''

    for (const item of items) {
      const vendorName = item.vendors?.name || 'Unknown Vendor'
      const vendorId = item.vendor_id
      const priceCents = item.unit_price_cents || 0
      const unit = item.unit_measure || 'each'

      allVendorNames.add(vendorName)

      if (priceCents > 0 && priceCents < bestPriceCents) {
        bestPriceCents = priceCents
        bestVendorName = vendorName
      }

      vendorPrices.push({
        vendorId,
        vendorName,
        priceCents,
        unit,
        isCheapest: false, // will set after finding best
      })

      // Track vendor rankings
      const ranking = vendorCheapestCounts.get(vendorId) || { id: vendorId, count: 0, totalPrice: 0, totalItems: 0 }
      ranking.totalPrice += priceCents
      ranking.totalItems++
      vendorCheapestCounts.set(vendorId, ranking)
    }

    // Mark cheapest
    if (bestPriceCents < Infinity) {
      for (const vp of vendorPrices) {
        if (vp.priceCents === bestPriceCents) {
          vp.isCheapest = true

          // Increment cheapest count for ranking
          const ranking = vendorCheapestCounts.get(vp.vendorId)!
          ranking.count++
        }
      }
    }

    // Compute trend for this ingredient (using the cheapest vendor's price)
    let trend: PriceTrend | null = null
    const cheapestVendor = vendorPrices.find((vp) => vp.isCheapest)
    if (cheapestVendor) {
      const trendKey = `${cheapestVendor.vendorId}|${ingredientId}`
      const prevPrice = prevPriceMap.get(trendKey)
      const currPrice = currentPriceMap.get(trendKey) ?? cheapestVendor.priceCents

      if (prevPrice !== undefined && prevPrice > 0) {
        const changePct = ((currPrice - prevPrice) / prevPrice) * 100
        trend = {
          direction: changePct > 1 ? 'up' : changePct < -1 ? 'down' : 'flat',
          changePercent: Math.round(changePct * 10) / 10,
          previousPriceCents: prevPrice,
          currentPriceCents: currPrice,
        }
      }
    }

    if (bestPriceCents === Infinity) bestPriceCents = 0

    comparisons.push({
      ingredientId,
      ingredientName: ingName,
      vendorPrices,
      bestPriceCents,
      bestVendorName,
      trend,
    })
  }

  // Sort by ingredient name
  comparisons.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))

  // Vendor rankings
  const vendorRankings: VendorRanking[] = Array.from(vendorCheapestCounts.entries())
    .map(([vendorId, data]) => {
      const item = vendorItems.find((vi: any) => vi.vendor_id === vendorId)
      return {
        vendorName: item?.vendors?.name || 'Unknown',
        vendorId,
        cheapestCount: data.count,
        avgPriceCents: data.totalItems > 0 ? Math.round(data.totalPrice / data.totalItems) : 0,
        totalItemsTracked: data.totalItems,
      }
    })
    .sort((a, b) => b.cheapestCount - a.cheapestCount)

  // Savings opportunities: for each ingredient with 2+ vendors, calculate savings
  // by switching to cheapest from most expensive
  const savingsOpportunities: VendorSavingsOpportunity[] = []
  for (const comp of comparisons) {
    if (comp.vendorPrices.length < 2) continue
    const sorted = [...comp.vendorPrices].sort((a, b) => a.priceCents - b.priceCents)
    const cheapest = sorted[0]
    // For each non-cheapest vendor, calculate savings
    for (const expensive of sorted.slice(1)) {
      if (expensive.priceCents > cheapest.priceCents && cheapest.priceCents > 0) {
        savingsOpportunities.push({
          ingredientName: comp.ingredientName,
          currentVendor: expensive.vendorName,
          currentPriceCents: expensive.priceCents,
          suggestedVendor: cheapest.vendorName,
          suggestedPriceCents: cheapest.priceCents,
          savingsCents: expensive.priceCents - cheapest.priceCents,
        })
      }
    }
  }

  // Sort by savings descending
  savingsOpportunities.sort((a, b) => b.savingsCents - a.savingsCents)

  const totalPotentialSavingsCents = savingsOpportunities.reduce(
    (sum, s) => sum + s.savingsCents,
    0
  )

  const topVendorByValue = vendorRankings.length > 0 ? vendorRankings[0].vendorName : null
  const mostExpensiveVendor = vendorRankings.length > 0
    ? vendorRankings[vendorRankings.length - 1].vendorName
    : null

  return {
    month: targetMonth,
    generatedAt: new Date().toISOString(),
    comparisons,
    vendorNames: Array.from(allVendorNames).sort(),
    vendorRankings,
    savingsOpportunities: savingsOpportunities.slice(0, 20), // top 20 opportunities
    totalPotentialSavingsCents,
    topVendorByValue,
    mostExpensiveVendor,
  }
}
