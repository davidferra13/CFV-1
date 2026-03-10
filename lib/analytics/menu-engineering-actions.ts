'use server'

// Menu Engineering Matrix - Server Actions
// Classic 4-quadrant analysis: Stars, Plowhorses, Puzzles, Dogs.
// All deterministic math (Formula > AI). No LLM calls.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export type MenuQuadrant = 'star' | 'plowhorse' | 'puzzle' | 'dog'

export interface MenuEngineeringItem {
  dishName: string
  unitsSold: number
  revenueCents: number
  foodCostCents: number
  profitCents: number
  profitMarginPercent: number
  popularityPercent: number
  quadrant: MenuQuadrant
}

export interface MenuEngineeringResult {
  status: 'ok' | 'insufficient_data'
  items: MenuEngineeringItem[]
  avgProfitMarginPercent: number
  avgPopularityPercent: number
  totalUnitsSold: number
  totalRevenueCents: number
  totalProfitCents: number
  topPerformer: string | null
  worstPerformer: string | null
}

export interface MenuMixCategory {
  category: string
  unitsSold: number
  revenueCents: number
  percentOfSales: number
  percentOfRevenue: number
}

export interface MenuMixResult {
  status: 'ok' | 'insufficient_data'
  categories: MenuMixCategory[]
  totalUnits: number
  totalRevenueCents: number
}

export interface ItemTrendPoint {
  period: string
  label: string
  unitsSold: number
  revenueCents: number
}

export interface ItemTrendResult {
  status: 'ok' | 'not_found'
  itemName: string
  trend: ItemTrendPoint[]
}

export interface MenuRecommendation {
  itemName: string
  quadrant: MenuQuadrant
  action: string
  detail: string
}

export interface PriceImpactResult {
  itemName: string
  currentPriceCents: number
  newPriceCents: number
  currentMarginPercent: number
  newMarginPercent: number
  currentQuadrant: MenuQuadrant
  newQuadrant: MenuQuadrant
  quadrantChanged: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10
}

function assignQuadrant(
  popularityPercent: number,
  profitMarginPercent: number,
  avgPopularity: number,
  avgMargin: number
): MenuQuadrant {
  const highPop = popularityPercent > avgPopularity
  const highMargin = profitMarginPercent > avgMargin
  if (highPop && highMargin) return 'star'
  if (highPop && !highMargin) return 'plowhorse'
  if (!highPop && highMargin) return 'puzzle'
  return 'dog'
}

// ─── Core: Fetch dish-level sales data ───────────────────────────────────────

async function fetchDishSalesData(tenantId: string, days: number) {
  const supabase: any = createServerClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  // Get completed events in the period
  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, quoted_price_cents, guest_count')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('event_date', cutoffStr)

  if (!events || events.length === 0) return null

  const eventIds = events.map((e: any) => e.id)
  const eventMap = new Map(
    events.map((e: any) => [
      e.id,
      {
        quotedPriceCents: e.quoted_price_cents ?? 0,
        guestCount: e.guest_count ?? 1,
        eventDate: e.event_date,
      },
    ])
  )

  // Get menus for those events
  const { data: menus } = await supabase
    .from('menus')
    .select('id, event_id')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  if (!menus || menus.length === 0) return null

  const menuIds = menus.map((m: any) => m.id)
  const menuToEvent = new Map(menus.map((m: any) => [m.id, m.event_id]))

  // Get dishes from those menus
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, menu_id, course_name')
    .eq('tenant_id', tenantId)
    .in('menu_id', menuIds)

  if (!dishes || dishes.length === 0) return null

  const dishIds = dishes.map((d: any) => d.id)

  // Get components with recipe links for cost calculation
  const { data: components } = await supabase
    .from('components')
    .select('id, dish_id, recipe_id')
    .eq('tenant_id', tenantId)
    .in('dish_id', dishIds)

  // Get recipe costs from the view
  const recipeIds = (components || []).map((c: any) => c.recipe_id).filter((id: any) => id != null)
  const uniqueRecipeIds = [...new Set(recipeIds)] as string[]

  let recipeCostMap = new Map<string, number>()
  if (uniqueRecipeIds.length > 0) {
    const { data: recipeCosts } = await supabase
      .from('recipe_cost_summary')
      .select('recipe_id, total_ingredient_cost_cents')
      .eq('tenant_id', tenantId)
      .in('recipe_id', uniqueRecipeIds)

    for (const rc of recipeCosts || []) {
      recipeCostMap.set(rc.recipe_id, rc.total_ingredient_cost_cents ?? 0)
    }
  }

  // Build dish cost map: sum recipe costs for all components in each dish
  const dishCostMap = new Map<string, number>()
  for (const comp of components || []) {
    if (comp.recipe_id) {
      const cost = recipeCostMap.get(comp.recipe_id) ?? 0
      dishCostMap.set(comp.dish_id, (dishCostMap.get(comp.dish_id) ?? 0) + cost)
    }
  }

  // Aggregate by dish name (course_name)
  // For revenue: divide event's quoted price evenly among its dishes
  type DishAgg = {
    unitsSold: number
    revenueCents: number
    foodCostCents: number
    eventDates: string[]
  }
  const byName = new Map<string, DishAgg>()

  // Count dishes per event for revenue allocation
  const dishesPerEvent = new Map<string, number>()
  for (const d of dishes) {
    const eventId = menuToEvent.get(d.menu_id)
    if (eventId) {
      dishesPerEvent.set(eventId, (dishesPerEvent.get(eventId) ?? 0) + 1)
    }
  }

  for (const d of dishes) {
    const eventId = menuToEvent.get(d.menu_id)
    if (!eventId) continue
    const eventInfo = eventMap.get(eventId) as any
    if (!eventInfo) continue

    const name = d.course_name || 'Unnamed Dish'
    const existing = byName.get(name) ?? {
      unitsSold: 0,
      revenueCents: 0,
      foodCostCents: 0,
      eventDates: [],
    }

    existing.unitsSold += 1
    // Allocate event revenue evenly among dishes
    const dishCount = dishesPerEvent.get(eventId) ?? 1
    existing.revenueCents += Math.round(eventInfo.quotedPriceCents / dishCount)
    existing.foodCostCents += dishCostMap.get(d.id) ?? 0
    existing.eventDates.push(eventInfo.eventDate)

    byName.set(name, existing)
  }

  return byName
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function getMenuEngineering(days = 30): Promise<MenuEngineeringResult> {
  const user = await requireChef()
  const data = await fetchDishSalesData(user.tenantId!, days)

  if (!data || data.size === 0) {
    return {
      status: 'insufficient_data',
      items: [],
      avgProfitMarginPercent: 0,
      avgPopularityPercent: 0,
      totalUnitsSold: 0,
      totalRevenueCents: 0,
      totalProfitCents: 0,
      topPerformer: null,
      worstPerformer: null,
    }
  }

  // Calculate totals
  let totalUnitsSold = 0
  let totalRevenueCents = 0
  let totalProfitCents = 0

  const rawItems: Array<{
    dishName: string
    unitsSold: number
    revenueCents: number
    foodCostCents: number
    profitCents: number
    profitMarginPercent: number
    popularityPercent: number
  }> = []

  for (const [name, agg] of data) {
    totalUnitsSold += agg.unitsSold
  }

  for (const [name, agg] of data) {
    const profitCents = agg.revenueCents - agg.foodCostCents
    const profitMarginPercent = pct(profitCents, agg.revenueCents)
    const popularityPercent = pct(agg.unitsSold, totalUnitsSold)
    totalRevenueCents += agg.revenueCents
    totalProfitCents += profitCents

    rawItems.push({
      dishName: name,
      unitsSold: agg.unitsSold,
      revenueCents: agg.revenueCents,
      foodCostCents: agg.foodCostCents,
      profitCents,
      profitMarginPercent,
      popularityPercent,
    })
  }

  // Compute averages across all items
  const itemCount = rawItems.length
  const avgProfitMarginPercent =
    itemCount > 0
      ? Math.round((rawItems.reduce((s, i) => s + i.profitMarginPercent, 0) / itemCount) * 10) / 10
      : 0
  const avgPopularityPercent = itemCount > 0 ? Math.round((100 / itemCount) * 10) / 10 : 0

  // Assign quadrants
  const items: MenuEngineeringItem[] = rawItems.map((item) => ({
    ...item,
    quadrant: assignQuadrant(
      item.popularityPercent,
      item.profitMarginPercent,
      avgPopularityPercent,
      avgProfitMarginPercent
    ),
  }))

  // Sort by profit descending
  items.sort((a, b) => b.profitCents - a.profitCents)

  const topPerformer = items.length > 0 ? items[0].dishName : null
  const worstPerformer = items.length > 0 ? items[items.length - 1].dishName : null

  return {
    status: 'ok',
    items,
    avgProfitMarginPercent,
    avgPopularityPercent,
    totalUnitsSold,
    totalRevenueCents,
    totalProfitCents,
    topPerformer,
    worstPerformer,
  }
}

export async function getMenuMix(days = 30): Promise<MenuMixResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  // Get completed events
  const { data: events } = await supabase
    .from('events')
    .select('id, quoted_price_cents')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .gte('event_date', cutoffStr)

  if (!events || events.length === 0) {
    return { status: 'insufficient_data', categories: [], totalUnits: 0, totalRevenueCents: 0 }
  }

  const eventIds = events.map((e: any) => e.id)
  const eventRevenue = new Map(events.map((e: any) => [e.id, e.quoted_price_cents ?? 0]))

  // Get menus
  const { data: menus } = await supabase
    .from('menus')
    .select('id, event_id')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)

  if (!menus || menus.length === 0) {
    return { status: 'insufficient_data', categories: [], totalUnits: 0, totalRevenueCents: 0 }
  }

  const menuIds = menus.map((m: any) => m.id)
  const menuToEvent = new Map(menus.map((m: any) => [m.id, m.event_id]))

  // Get dishes with course info
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, menu_id, course_name')
    .eq('tenant_id', user.tenantId!)
    .in('menu_id', menuIds)

  if (!dishes || dishes.length === 0) {
    return { status: 'insufficient_data', categories: [], totalUnits: 0, totalRevenueCents: 0 }
  }

  // Dishes per event for revenue split
  const dishesPerEvent = new Map<string, number>()
  for (const d of dishes) {
    const eventId = menuToEvent.get(d.menu_id)
    if (eventId) dishesPerEvent.set(eventId, (dishesPerEvent.get(eventId) ?? 0) + 1)
  }

  // Group by course_name as "category"
  const byCat = new Map<string, { units: number; revenueCents: number }>()
  let totalUnits = 0
  let totalRevenueCents = 0

  for (const d of dishes) {
    const eventId = menuToEvent.get(d.menu_id)
    if (!eventId) continue
    const cat = d.course_name || 'Other'
    const existing = byCat.get(cat) ?? { units: 0, revenueCents: 0 }
    existing.units += 1
    const dishCount = dishesPerEvent.get(eventId) ?? 1
    const rev = Math.round((eventRevenue.get(eventId) ?? 0) / dishCount)
    existing.revenueCents += rev
    totalUnits += 1
    totalRevenueCents += rev
    byCat.set(cat, existing)
  }

  const categories: MenuMixCategory[] = Array.from(byCat.entries())
    .map(([category, data]) => ({
      category,
      unitsSold: data.units,
      revenueCents: data.revenueCents,
      percentOfSales: pct(data.units, totalUnits),
      percentOfRevenue: pct(data.revenueCents, totalRevenueCents),
    }))
    .sort((a, b) => b.unitsSold - a.unitsSold)

  return { status: 'ok', categories, totalUnits, totalRevenueCents }
}

export async function getItemTrend(itemName: string, days = 90): Promise<ItemTrendResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  // Get completed events
  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, quoted_price_cents')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .gte('event_date', cutoffStr)
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) {
    return { status: 'not_found', itemName, trend: [] }
  }

  const eventIds = events.map((e: any) => e.id)

  // Get menus
  const { data: menus } = await supabase
    .from('menus')
    .select('id, event_id')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)

  if (!menus || menus.length === 0) {
    return { status: 'not_found', itemName, trend: [] }
  }

  const menuIds = menus.map((m: any) => m.id)
  const menuToEvent = new Map(menus.map((m: any) => [m.id, m.event_id]))

  // Get matching dishes
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, menu_id, course_name')
    .eq('tenant_id', user.tenantId!)
    .in('menu_id', menuIds)
    .eq('course_name', itemName)

  if (!dishes || dishes.length === 0) {
    return { status: 'not_found', itemName, trend: [] }
  }

  // Dishes per event for revenue allocation
  const { data: allDishes } = await supabase
    .from('dishes')
    .select('id, menu_id')
    .eq('tenant_id', user.tenantId!)
    .in('menu_id', menuIds)

  const dishesPerEvent = new Map<string, number>()
  for (const d of allDishes || []) {
    const eventId = menuToEvent.get(d.menu_id)
    if (eventId) dishesPerEvent.set(eventId, (dishesPerEvent.get(eventId) ?? 0) + 1)
  }

  const eventRevenue = new Map(events.map((e: any) => [e.id, e.quoted_price_cents ?? 0]))
  const eventDate = new Map(events.map((e: any) => [e.id, e.event_date]))

  // Group by week
  const MONTH_LABELS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const byWeek = new Map<string, { units: number; revenueCents: number }>()

  for (const d of dishes) {
    const eventId = menuToEvent.get(d.menu_id)
    if (!eventId) continue
    const date = eventDate.get(eventId) as string
    if (!date) continue
    // Group by ISO week (YYYY-Www)
    const dt = new Date(date)
    const startOfWeek = new Date(dt)
    startOfWeek.setDate(dt.getDate() - dt.getDay())
    const weekKey = startOfWeek.toISOString().split('T')[0]
    const existing = byWeek.get(weekKey) ?? { units: 0, revenueCents: 0 }
    existing.units += 1
    const dishCount = dishesPerEvent.get(eventId) ?? 1
    existing.revenueCents += Math.round((eventRevenue.get(eventId) ?? 0) / dishCount)
    byWeek.set(weekKey, existing)
  }

  const trend: ItemTrendPoint[] = Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, data]) => {
      const dt = new Date(weekStart)
      return {
        period: weekStart,
        label: `${MONTH_LABELS[dt.getMonth()]} ${dt.getDate()}`,
        unitsSold: data.units,
        revenueCents: data.revenueCents,
      }
    })

  return { status: 'ok', itemName, trend }
}

export async function getMenuEngineeringRecommendations(days = 30): Promise<MenuRecommendation[]> {
  const result = await getMenuEngineering(days)
  if (result.status === 'insufficient_data') return []

  const recommendations: MenuRecommendation[] = []

  for (const item of result.items) {
    switch (item.quadrant) {
      case 'star':
        recommendations.push({
          itemName: item.dishName,
          quadrant: 'star',
          action: 'Maintain prominence',
          detail: `Keep "${item.dishName}" prominently placed. It sells well and delivers strong margins.`,
        })
        break
      case 'dog':
        if (item.unitsSold < 5) {
          recommendations.push({
            itemName: item.dishName,
            quadrant: 'dog',
            action: 'Consider removing',
            detail: `"${item.dishName}" has only sold ${item.unitsSold} times with low margins. Consider replacing it with a new dish.`,
          })
        } else {
          recommendations.push({
            itemName: item.dishName,
            quadrant: 'dog',
            action: 'Rework or replace',
            detail: `"${item.dishName}" has low margins and moderate sales. Try reducing ingredient costs or swapping for a more profitable option.`,
          })
        }
        break
      case 'puzzle':
        if (item.profitMarginPercent > 60) {
          recommendations.push({
            itemName: item.dishName,
            quadrant: 'puzzle',
            action: 'Promote more',
            detail: `"${item.dishName}" has a ${item.profitMarginPercent}% margin but low sales. Feature it more prominently in menus.`,
          })
        } else {
          recommendations.push({
            itemName: item.dishName,
            quadrant: 'puzzle',
            action: 'Reposition',
            detail: `"${item.dishName}" is profitable but not popular. Try presenting it differently or pairing it with popular items.`,
          })
        }
        break
      case 'plowhorse':
        if (item.profitMarginPercent < 20) {
          recommendations.push({
            itemName: item.dishName,
            quadrant: 'plowhorse',
            action: 'Raise price or reduce cost',
            detail: `"${item.dishName}" is popular (${item.unitsSold} sold) but only has a ${item.profitMarginPercent}% margin. Raise the price or find cheaper ingredients.`,
          })
        } else {
          recommendations.push({
            itemName: item.dishName,
            quadrant: 'plowhorse',
            action: 'Optimize costs',
            detail: `"${item.dishName}" sells well but margins are below average. Small cost reductions could move it into Star territory.`,
          })
        }
        break
    }
  }

  return recommendations
}

export async function getMenuPriceImpact(
  itemName: string,
  newPriceCents: number
): Promise<PriceImpactResult | null> {
  const result = await getMenuEngineering(30)
  if (result.status === 'insufficient_data') return null

  const item = result.items.find((i) => i.dishName === itemName)
  if (!item) return null

  const currentPriceCents = item.unitsSold > 0 ? Math.round(item.revenueCents / item.unitsSold) : 0

  // Simulate new revenue and margin
  const newRevenueCents = newPriceCents * item.unitsSold
  const newProfitCents = newRevenueCents - item.foodCostCents
  const newMarginPercent = pct(newProfitCents, newRevenueCents)

  const newQuadrant = assignQuadrant(
    item.popularityPercent,
    newMarginPercent,
    result.avgPopularityPercent,
    result.avgProfitMarginPercent
  )

  return {
    itemName,
    currentPriceCents,
    newPriceCents,
    currentMarginPercent: item.profitMarginPercent,
    newMarginPercent,
    currentQuadrant: item.quadrant,
    newQuadrant,
    quadrantChanged: item.quadrant !== newQuadrant,
  }
}
