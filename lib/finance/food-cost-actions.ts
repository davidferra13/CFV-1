'use server'

// Food Cost Tracking - server actions for per-event food cost analysis.
// Combines recipe-based estimated costs with manual grocery spend entries.
// Formula > AI: all calculations are pure math, zero LLM dependency.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import {
  calculateFoodCostPercentage,
  getFoodCostRating,
  type FoodCostRatingResult,
} from './food-cost-calculator'
import { dateToMonthString } from '@/lib/utils/format'

// ── Types ──────────────────────────────────────────────────────────────

export interface IngredientBreakdown {
  name: string
  qty: number
  unit: string
  unitCostCents: number
  totalCostCents: number
  hasCostData: boolean
}

export interface DishBreakdown {
  dishName: string
  courseName: string
  estimatedCostCents: number
  ingredients: IngredientBreakdown[]
}

export interface GroceryEntry {
  id: string
  store: string
  amountCents: number
  date: string
  notes: string | null
  receiptUrl: string | null
}

export interface EventFoodCost {
  estimatedCostCents: number
  actualSpendCents: number
  costPerGuestCents: number
  foodCostPercentage: number
  foodCostRating: FoodCostRatingResult
  guestCount: number | null
  revenueCents: number
  breakdown: DishBreakdown[]
  groceryEntries: GroceryEntry[]
}

// ── Main Query ─────────────────────────────────────────────────────────

export async function getEventFoodCost(eventId: string): Promise<EventFoodCost> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // 1. Get event basics (menu_id, guest_count) + financial summary
  const [eventRes, financialRes, groceryRes] = await Promise.all([
    db
      .from('events')
      .select('id, menu_id, guest_count')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single(),
    db
      .from('event_financial_summary')
      .select('net_revenue_cents, quoted_price_cents')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .single(),
    db
      .from('grocery_spend_entries' as any)
      .select('id, store_name, amount_cents, purchase_date, notes, receipt_url')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('purchase_date', { ascending: false }),
  ])

  const event = eventRes.data
  const guestCount: number | null = event?.guest_count ?? null
  const revenueCents: number =
    financialRes.data?.net_revenue_cents ?? financialRes.data?.quoted_price_cents ?? 0

  // Map grocery entries
  const groceryEntries: GroceryEntry[] = ((groceryRes.data ?? []) as any[]).map((r: any) => ({
    id: r.id,
    store: r.store_name,
    amountCents: r.amount_cents,
    date: r.purchase_date,
    notes: r.notes,
    receiptUrl: r.receipt_url,
  }))

  const actualSpendCents = groceryEntries.reduce((sum, e) => sum + e.amountCents, 0)

  // Also check for expense line items (from receipt → ingredient matching)
  let lineItemActualCents = 0
  try {
    const { getEventExpenseLineItems } = await import('@/lib/finance/expense-line-item-actions')
    const lineItems = await getEventExpenseLineItems(eventId)
    if (lineItems.length > 0) {
      lineItemActualCents = lineItems.reduce((sum, li) => sum + li.amountCents, 0)
    }
  } catch {
    // Non-blocking: expense line items table may not exist yet
  }

  // 2. Build the dish breakdown from menu -> dishes -> components -> recipe -> ingredients
  const breakdown: DishBreakdown[] = []
  let estimatedCostCents = 0

  if (event?.menu_id) {
    // Get dishes for this menu
    const { data: dishes } = await db
      .from('dishes')
      .select('id, name, course_name')
      .eq('menu_id', event.menu_id)
      .eq('tenant_id', tenantId)
      .order('course_number', { ascending: true })

    if (dishes && dishes.length > 0) {
      const dishIds = dishes.map((d: any) => d.id)

      // Get components with recipe_id for these dishes
      const { data: components } = await db
        .from('components')
        .select('id, dish_id, recipe_id, name, scale_factor')
        .in('dish_id', dishIds)
        .eq('tenant_id', tenantId)

      // Get unique recipe IDs
      const recipeIds = [
        ...new Set(
          ((components ?? []) as any[]).filter((c: any) => c.recipe_id).map((c: any) => c.recipe_id)
        ),
      ]

      // Get recipe ingredients with ingredient cost data
      let recipeIngredientMap = new Map<string, IngredientBreakdown[]>()

      if (recipeIds.length > 0) {
        const { data: recipeIngredients } = await db
          .from('recipe_ingredients')
          .select(
            'recipe_id, quantity, unit, ingredient_id, ingredients(name, cost_per_unit_cents, last_price_cents, default_unit)'
          )
          .in('recipe_id', recipeIds)

        for (const ri of (recipeIngredients ?? []) as any[]) {
          const ing = ri.ingredients
          if (!ing) continue

          const costPerUnit = ing.cost_per_unit_cents ?? ing.last_price_cents ?? 0
          const hasCostData = !!(ing.cost_per_unit_cents || ing.last_price_cents)
          const totalCost = Math.round(ri.quantity * costPerUnit)

          const entry: IngredientBreakdown = {
            name: ing.name,
            qty: ri.quantity,
            unit: ri.unit || ing.default_unit || 'ea',
            unitCostCents: costPerUnit,
            totalCostCents: totalCost,
            hasCostData,
          }

          const existing = recipeIngredientMap.get(ri.recipe_id) ?? []
          existing.push(entry)
          recipeIngredientMap.set(ri.recipe_id, existing)
        }
      }

      // Build per-dish breakdown
      for (const dish of dishes as any[]) {
        const dishComponents = ((components ?? []) as any[]).filter(
          (c: any) => c.dish_id === dish.id
        )

        let dishIngredients: IngredientBreakdown[] = []
        let dishCost = 0

        for (const comp of dishComponents) {
          if (!comp.recipe_id) continue
          const ingredients = recipeIngredientMap.get(comp.recipe_id) ?? []
          const scaleFactor = comp.scale_factor ?? 1

          for (const ing of ingredients) {
            const scaledCost = Math.round(ing.totalCostCents * scaleFactor)
            const scaledQty = ing.qty * scaleFactor
            dishIngredients.push({
              ...ing,
              qty: scaledQty,
              totalCostCents: scaledCost,
            })
            dishCost += scaledCost
          }
        }

        breakdown.push({
          dishName: dish.name || 'Untitled dish',
          courseName: dish.course_name,
          estimatedCostCents: dishCost,
          ingredients: dishIngredients,
        })

        estimatedCostCents += dishCost
      }
    }
  }

  // 3. Calculate percentages
  // Priority: line item actuals > grocery spend > recipe estimate
  const bestActual = lineItemActualCents > 0 ? lineItemActualCents : actualSpendCents
  const effectiveFoodCost = bestActual > 0 ? bestActual : estimatedCostCents
  const foodCostPercentage = calculateFoodCostPercentage(effectiveFoodCost, revenueCents)
  const foodCostRating = getFoodCostRating(foodCostPercentage)

  const costPerGuestCents =
    guestCount && guestCount > 0 ? Math.round(effectiveFoodCost / guestCount) : 0

  return {
    estimatedCostCents,
    actualSpendCents,
    costPerGuestCents,
    foodCostPercentage,
    foodCostRating,
    guestCount,
    revenueCents,
    breakdown,
    groceryEntries,
  }
}

// ── Grocery Spend CRUD ─────────────────────────────────────────────────

export async function addGrocerySpend(data: {
  eventId: string
  store: string
  amountCents: number
  date: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db.from('grocery_spend_entries' as any).insert({
    tenant_id: user.tenantId!,
    event_id: data.eventId,
    store_name: data.store,
    amount_cents: data.amountCents,
    purchase_date: data.date,
    notes: data.notes || null,
    created_by: user.authUserId,
  })

  if (error) {
    console.error('[food-cost] Failed to add grocery spend:', error.message)
    return { success: false, error: error.message }
  }

  revalidatePath(`/events/${data.eventId}`)
  return { success: true }
}

export async function updateGrocerySpend(
  id: string,
  data: {
    store?: string
    amountCents?: number
    date?: string
    notes?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const updatePayload: Record<string, any> = {}
  if (data.store !== undefined) updatePayload.store_name = data.store
  if (data.amountCents !== undefined) updatePayload.amount_cents = data.amountCents
  if (data.date !== undefined) updatePayload.purchase_date = data.date
  if (data.notes !== undefined) updatePayload.notes = data.notes || null

  const { error } = await db
    .from('grocery_spend_entries' as any)
    .update(updatePayload)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[food-cost] Failed to update grocery spend:', error.message)
    return { success: false, error: error.message }
  }

  revalidatePath('/events')
  return { success: true }
}

export async function deleteGrocerySpend(
  id: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('grocery_spend_entries' as any)
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[food-cost] Failed to delete grocery spend:', error.message)
    return { success: false, error: error.message }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

// ── Ingredient Cost Lookup ─────────────────────────────────────────────

export async function getIngredientCostEstimate(
  ingredientId: string,
  quantity: number,
  _unit: string
): Promise<{ unitCostCents: number; totalCostCents: number; hasCostData: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: ingredient } = await db
    .from('ingredients')
    .select('cost_per_unit_cents, last_price_cents')
    .eq('id', ingredientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const unitCostCents = ingredient?.cost_per_unit_cents ?? ingredient?.last_price_cents ?? 0
  const hasCostData = !!(ingredient?.cost_per_unit_cents || ingredient?.last_price_cents)

  return {
    unitCostCents,
    totalCostCents: Math.round(quantity * unitCostCents),
    hasCostData,
  }
}

// ── Dashboard Summary (across recent events) ──────────────────────────

export async function getFoodCostDashboardSummary(): Promise<{
  avgFoodCostPercent: number
  avgFoodCostRating: FoodCostRatingResult
  recentEventCount: number
  trendDirection: 'improving' | 'worsening' | 'stable' | 'insufficient_data'
  currentMonthAvg: number
  previousMonthAvg: number
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // Get last 6 months of events with menus
  const sixMonthsAgo = new Date(year, month - 7, 1)
  const startDate = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`

  const { data: events } = await db
    .from('events')
    .select('id, event_date, menu_id, guest_count')
    .eq('tenant_id', tenantId)
    .eq('is_demo', false)
    .not('menu_id', 'is', null)
    .gte('event_date', startDate)
    .order('event_date', { ascending: false })
    .limit(50)

  if (!events || events.length === 0) {
    return {
      avgFoodCostPercent: 0,
      avgFoodCostRating: getFoodCostRating(0),
      recentEventCount: 0,
      trendDirection: 'insufficient_data',
      currentMonthAvg: 0,
      previousMonthAvg: 0,
    }
  }

  const eventIds = events.map((e: any) => e.id)

  // Get financials
  const { data: financials } = await db
    .from('event_financial_summary')
    .select('event_id, net_revenue_cents, quoted_price_cents')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  const finMap = new Map<string, number>()
  for (const f of (financials ?? []) as any[]) {
    finMap.set(f.event_id, f.net_revenue_cents ?? f.quoted_price_cents ?? 0)
  }

  // Get grocery spend totals per event
  const { data: groceryTotals } = await db
    .from('grocery_spend_entries' as any)
    .select('event_id, amount_cents')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  const groceryMap = new Map<string, number>()
  for (const g of (groceryTotals ?? []) as any[]) {
    groceryMap.set(g.event_id, (groceryMap.get(g.event_id) ?? 0) + g.amount_cents)
  }

  // Get recipe cost summaries per menu
  const menuIds = [...new Set(events.filter((e: any) => e.menu_id).map((e: any) => e.menu_id))]
  const menuCostMap = new Map<string, number>()

  if (menuIds.length > 0) {
    // Get dishes for menus
    const { data: dishes } = await db
      .from('dishes')
      .select('id, menu_id')
      .in('menu_id', menuIds)
      .eq('tenant_id', tenantId)

    if (dishes && dishes.length > 0) {
      const dishIds = dishes.map((d: any) => d.id)

      const { data: components } = await db
        .from('components')
        .select('dish_id, recipe_id, scale_factor')
        .in('dish_id', dishIds)
        .not('recipe_id', 'is', null)
        .eq('tenant_id', tenantId)

      const recipeIds = [...new Set(((components ?? []) as any[]).map((c: any) => c.recipe_id))]

      if (recipeIds.length > 0) {
        const { data: recipeCosts } = await db
          .from('recipe_cost_summary')
          .select('recipe_id, total_ingredient_cost_cents')
          .eq('tenant_id', tenantId)
          .in('recipe_id', recipeIds)

        const recipeCostMap = new Map<string, number>()
        for (const rc of (recipeCosts ?? []) as any[]) {
          recipeCostMap.set(rc.recipe_id, rc.total_ingredient_cost_cents ?? 0)
        }

        // Build dish -> recipe cost map
        const dishRecipeCostMap = new Map<string, number>()
        for (const c of (components ?? []) as any[]) {
          if (!c.recipe_id) continue
          const cost = recipeCostMap.get(c.recipe_id) ?? 0
          const scaled = Math.round(cost * (c.scale_factor ?? 1))
          dishRecipeCostMap.set(c.dish_id, (dishRecipeCostMap.get(c.dish_id) ?? 0) + scaled)
        }

        // Build menu cost map
        for (const d of (dishes ?? []) as any[]) {
          const cost = dishRecipeCostMap.get(d.id) ?? 0
          menuCostMap.set(d.menu_id, (menuCostMap.get(d.menu_id) ?? 0) + cost)
        }
      }
    }
  }

  // Calculate per-event food cost percentages
  const currentMonthStr = `${year}-${String(month).padStart(2, '0')}`
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`

  let totalPercent = 0
  let countWithData = 0
  let currentMonthTotal = 0
  let currentMonthCount = 0
  let prevMonthTotal = 0
  let prevMonthCount = 0

  for (const evt of events as any[]) {
    const revenue = finMap.get(evt.id) ?? 0
    if (revenue <= 0) continue

    // Prefer actual grocery spend, fall back to estimated from recipes
    const actualSpend = groceryMap.get(evt.id) ?? 0
    const estimatedCost = evt.menu_id ? (menuCostMap.get(evt.menu_id) ?? 0) : 0
    const foodCost = actualSpend > 0 ? actualSpend : estimatedCost
    if (foodCost <= 0) continue

    const pct = calculateFoodCostPercentage(foodCost, revenue)
    totalPercent += pct
    countWithData++

    const eventMonth = dateToMonthString(evt.event_date as Date | string)
    if (eventMonth === currentMonthStr) {
      currentMonthTotal += pct
      currentMonthCount++
    } else if (eventMonth === prevMonthStr) {
      prevMonthTotal += pct
      prevMonthCount++
    }
  }

  const avgFoodCostPercent =
    countWithData > 0 ? Math.round((totalPercent / countWithData) * 10) / 10 : 0
  const currentMonthAvg =
    currentMonthCount > 0 ? Math.round((currentMonthTotal / currentMonthCount) * 10) / 10 : 0
  const previousMonthAvg =
    prevMonthCount > 0 ? Math.round((prevMonthTotal / prevMonthCount) * 10) / 10 : 0

  let trendDirection: 'improving' | 'worsening' | 'stable' | 'insufficient_data'
  if (currentMonthCount === 0 || prevMonthCount === 0) {
    trendDirection = 'insufficient_data'
  } else if (currentMonthAvg < previousMonthAvg - 1) {
    trendDirection = 'improving' // lower food cost % = better
  } else if (currentMonthAvg > previousMonthAvg + 1) {
    trendDirection = 'worsening'
  } else {
    trendDirection = 'stable'
  }

  return {
    avgFoodCostPercent,
    avgFoodCostRating: getFoodCostRating(avgFoodCostPercent),
    recentEventCount: countWithData,
    trendDirection,
    currentMonthAvg,
    previousMonthAvg,
  }
}
