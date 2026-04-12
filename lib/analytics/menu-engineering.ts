'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { getCachedChefArchetype } from '@/lib/chef/layout-data-cache'
import { getTargetsForArchetype } from '@/lib/costing/knowledge'

// ─── BCG Matrix Quadrants ───────────────────────────────────────────────────

export type Quadrant = 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG'

export interface MenuEngineeringItem {
  id: string
  name: string
  salesCount: number
  sellingPrice: number // cents
  foodCost: number // cents
  contribution: number // cents (sellingPrice - foodCost)
  foodCostPct: number // percentage
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
  avgContribution: number
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
  targetFoodCostPct?: number
): Promise<MenuEngineeringResult> {
  const chef = await requireChef()

  // Use operator-specific target if none provided
  if (targetFoodCostPct === undefined) {
    const archetype = await getCachedChefArchetype(chef.entityId)
    const targets = getTargetsForArchetype(archetype)
    targetFoodCostPct = targets.foodCostPctHigh
  }

  const db = await createServerClient()

  // Get dishes with their linked recipes and cost data
  let query = (db as any)
    .from('dishes')
    .select(
      `
      id, name, course_name, course_number,
      menu_id,
      linked_recipe_id
    `
    )
    .eq('tenant_id', chef.tenantId!)

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

  // Batch-fetch recipe costs for linked recipes
  const recipeIds = menuItems.map((mi: any) => mi.linked_recipe_id).filter(Boolean) as string[]

  let recipeCostMap = new Map<string, number>()
  if (recipeIds.length > 0) {
    const { data: costData } = await (db as any)
      .from('recipe_cost_summary')
      .select('recipe_id, cost_per_portion_cents')
      .in('recipe_id', recipeIds)
      .eq('tenant_id', chef.tenantId!)

    for (const c of costData ?? []) {
      if (c.recipe_id && c.cost_per_portion_cents) {
        recipeCostMap.set(c.recipe_id, c.cost_per_portion_cents)
      }
    }
  }

  // Count how many times each dish name appears on completed/in_progress events
  // as a proxy for sales count (one event = one "sale" of that dish)
  const { data: dishHistory } = await (db as any)
    .from('dishes')
    .select('name, menu_id')
    .eq('tenant_id', chef.tenantId!)
    .not('name', 'is', null)

  // Build a map from menu_id -> list of dish names for completed events
  const { data: completedEventMenuIds } = await (db as any)
    .from('events')
    .select('menu_id')
    .eq('tenant_id', chef.tenantId!)
    .in('status', ['completed', 'in_progress'])
    .not('menu_id', 'is', null)

  const completedMenuIdSet = new Set<string>(
    (completedEventMenuIds ?? []).map((e: any) => e.menu_id).filter(Boolean)
  )

  // Count by normalized dish name (case-insensitive)
  const dishSaleCountMap = new Map<string, number>()
  for (const dh of dishHistory ?? []) {
    if (!dh.name || !completedMenuIdSet.has(dh.menu_id)) continue
    const key = dh.name.trim().toLowerCase()
    dishSaleCountMap.set(key, (dishSaleCountMap.get(key) ?? 0) + 1)
  }

  // Build items with sales data (using event history as proxy)
  const rawItems = menuItems.map((mi: any) => {
    const cost = mi.linked_recipe_id ? (recipeCostMap.get(mi.linked_recipe_id) ?? 0) : 0
    const salesCount = dishSaleCountMap.get((mi.name ?? '').trim().toLowerCase()) ?? 1
    return {
      id: mi.id,
      name: mi.name,
      salesCount,
      sellingPrice: 0, // dishes don't store price; price lives on the event/quote
      foodCost: cost,
      contribution: -cost, // without selling price, contribution is negative cost
      foodCostPct: 0,
    }
  })

  const totalSales = rawItems.reduce((s: any, i: any) => s + i.salesCount, 0)
  const avgPopularity = totalSales / rawItems.length
  const totalContribution = rawItems.reduce(
    (s: any, i: any) => s + i.contribution * i.salesCount,
    0
  )
  const totalSalesCount = rawItems.reduce((s: any, i: any) => s + i.salesCount, 0)
  const avgContribution = totalSalesCount > 0 ? totalContribution / totalSalesCount : 0

  const items: MenuEngineeringItem[] = rawItems.map((i: any) => ({
    ...i,
    quadrant: assignQuadrant(i.salesCount, i.contribution, avgPopularity, avgContribution),
  }))

  const totalRevenue = items.reduce((s: any, i: any) => s + i.sellingPrice * i.salesCount, 0)
  const totalFoodCost = items.reduce((s: any, i: any) => s + i.foodCost * i.salesCount, 0)

  const alerts = items
    .filter((i: any) => i.foodCostPct > targetFoodCostPct)
    .map((i: any) => ({
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
    overallFoodCostPct:
      totalRevenue > 0 ? Math.round((totalFoodCost / totalRevenue) * 1000) / 10 : 0,
    alerts,
  }
}
