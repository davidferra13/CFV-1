// @ts-nocheck
// DEFERRED: This entire file requires the menu_items table (Phase 2 schema) which does not exist yet.
// 'use server' is commented out to prevent runtime crashes from exported server actions.
// Uncomment when the menu_items migration is applied.
// 'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'

// ─── BCG Matrix Quadrants ───────────────────────────────────────────────────

export type Quadrant = 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG'

export interface MenuEngineeringItem {
  id: string
  name: string
  salesCount: number
  sellingPrice: number     // cents
  foodCost: number         // cents
  contribution: number     // cents (sellingPrice - foodCost)
  foodCostPct: number      // percentage
  quadrant: Quadrant
}

export interface MenuEngineeringResult {
  items: MenuEngineeringItem[]
  avgContribution: number
  avgPopularity: number
  totalRevenue: number
  totalFoodCost: number
  overallFoodCostPct: number
  alerts: { itemId: string; itemName: string; foodCostPct: number; message: string }[]
}

// ─── Quadrant Assignment ────────────────────────────────────────────────────

function assignQuadrant(
  salesCount: number,
  contribution: number,
  avgPopularity: number,
  avgContribution: number,
): Quadrant {
  const highPopularity = salesCount >= avgPopularity
  const highContribution = contribution >= avgContribution
  if (highPopularity && highContribution) return 'STAR'
  if (highPopularity && !highContribution) return 'PLOWHORSE'
  if (!highPopularity && highContribution) return 'PUZZLE'
  return 'DOG'
}

// ─── Compute Menu Engineering ───────────────────────────────────────────────

export async function computeMenuEngineering(
  menuId?: string,
  targetFoodCostPct: number = 30,
): Promise<MenuEngineeringResult> {
  const chef = await requireChef()
  const supabase = await createServerClient()

  // Get menu items with their recipes and cost data
  // TODO: menu_items table does not exist yet - using dishes as proxy
  let query = (supabase as any)
    .from('menu_items')
    .select(`
      id, name, price,
      menu_id,
      recipe:recipes(id, name, cost_per_serving)
    `)
    .eq('menus.chef_id', chef.id)

  if (menuId) {
    query = query.eq('menu_id', menuId)
  }

  const { data: menuItems } = await query

  if (!menuItems || menuItems.length === 0) {
    return {
      items: [],
      avgContribution: 0,
      avgPopularity: 0,
      totalRevenue: 0,
      totalFoodCost: 0,
      overallFoodCostPct: 0,
      alerts: [],
    }
  }

  // Build items with sales data (using event history as proxy)
  const rawItems = menuItems.map((mi: any) => {
    const price = mi.price || 0
    const cost = (mi.recipe as any)?.cost_per_serving || 0
    const salesCount = 1 // placeholder - would come from event_menu_items join
    return {
      id: mi.id,
      name: mi.name,
      salesCount,
      sellingPrice: price,
      foodCost: cost,
      contribution: price - cost,
      foodCostPct: price > 0 ? Math.round((cost / price) * 1000) / 10 : 0,
    }
  })

  const totalSales = rawItems.reduce((s, i) => s + i.salesCount, 0)
  const avgPopularity = totalSales / rawItems.length
  const totalContribution = rawItems.reduce((s, i) => s + i.contribution * i.salesCount, 0)
  const totalSalesCount = rawItems.reduce((s, i) => s + i.salesCount, 0)
  const avgContribution = totalSalesCount > 0 ? totalContribution / totalSalesCount : 0

  const items: MenuEngineeringItem[] = rawItems.map(i => ({
    ...i,
    quadrant: assignQuadrant(i.salesCount, i.contribution, avgPopularity, avgContribution),
  }))

  const totalRevenue = items.reduce((s, i) => s + i.sellingPrice * i.salesCount, 0)
  const totalFoodCost = items.reduce((s, i) => s + i.foodCost * i.salesCount, 0)

  const alerts = items
    .filter(i => i.foodCostPct > targetFoodCostPct)
    .map(i => ({
      itemId: i.id,
      itemName: i.name,
      foodCostPct: i.foodCostPct,
      message: `${i.name} food cost (${i.foodCostPct}%) exceeds target (${targetFoodCostPct}%)`,
    }))

  return {
    items,
    avgContribution,
    avgPopularity,
    totalRevenue,
    totalFoodCost,
    overallFoodCostPct: totalRevenue > 0 ? Math.round((totalFoodCost / totalRevenue) * 1000) / 10 : 0,
    alerts,
  }
}
