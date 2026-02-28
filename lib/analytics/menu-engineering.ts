// DEFERRED: Menu engineering analytics. The `menu_items` table does not exist in the current schema.
// The BCG matrix logic (quadrant assignment, contribution analysis) is ready and correct.
// When `menu_items` is added (Phase 2 schema), uncomment the database query in computeMenuEngineering
// and wire it to the actual table columns. No importers reference this file currently.
'use server'

import { requireChef } from '@/lib/auth/get-user'

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

// Exported for future use when menu_items table is added
export function assignQuadrant(
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
  _menuId?: string,
  _targetFoodCostPct: number = 30
): Promise<MenuEngineeringResult> {
  // Auth check — ensures only authenticated chefs can call this
  await requireChef()

  // TODO: menu_items table does not exist yet in the schema.
  // When added, replace this stub with a real query:
  //
  //   const supabase = createServerClient()
  //   const { data: menuItems } = await supabase
  //     .from('menu_items')
  //     .select('id, name, price, menu_id, recipe:recipes(id, name, cost_per_serving)')
  //     .eq('tenant_id', chef.tenantId!)
  //
  //   Then process menuItems through the BCG matrix logic using assignQuadrant().
  //
  // For now, return empty result since there's no backing table.
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
