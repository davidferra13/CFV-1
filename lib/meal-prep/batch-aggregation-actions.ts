'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ============================================
// Types
// ============================================

export interface BatchClientRow {
  programId: string
  clientId: string
  clientName: string
  deliveryDay: number
  rotationWeek: number
  menuId: string | null
  menuTitle: string | null
  dishes: { name: string; recipeId: string | null }[]
}

export interface AggregatedIngredient {
  ingredientId: string
  ingredientName: string
  category: string
  totalQuantity: number
  unit: string
  contributingClients: string[] // client names
}

export interface BatchDaySnapshot {
  dayOfWeek: number // 0-6
  dayLabel: string
  clients: BatchClientRow[]
  aggregatedIngredients: AggregatedIngredient[]
}

export interface WeeklyBatchOverview {
  days: BatchDaySnapshot[]
  totalActivePrograms: number
  totalClientsThisWeek: number
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ============================================
// Main Action
// ============================================

/**
 * Get the weekly batch aggregation overview.
 * Shows all active meal prep programs grouped by delivery day,
 * with aggregated ingredient totals per day from current rotation menus.
 */
export async function getWeeklyBatchOverview(): Promise<WeeklyBatchOverview> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // 1. Get all active meal prep programs with client info
  const { data: programs, error: progError } = await db
    .from('meal_prep_programs')
    .select(
      `
      id, client_id, delivery_day, current_rotation_week, rotation_weeks, status,
      client:clients(id, full_name)
    `
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('delivery_day', { ascending: true })

  if (progError) {
    console.error('[batch-aggregation] Programs query failed:', progError.message)
    return { days: [], totalActivePrograms: 0, totalClientsThisWeek: 0 }
  }

  if (!programs || programs.length === 0) {
    return { days: [], totalActivePrograms: 0, totalClientsThisWeek: 0 }
  }

  // 2. For each program, get the current rotation week's menu
  const programIds = programs.map((p: any) => p.id)
  const { data: weeks, error: weekError } = await db
    .from('meal_prep_weeks')
    .select('id, program_id, rotation_week, menu_id')
    .in('program_id', programIds)

  if (weekError) {
    console.error('[batch-aggregation] Weeks query failed:', weekError.message)
  }

  const weeksByProgram = new Map<string, any[]>()
  for (const w of weeks ?? []) {
    const arr = weeksByProgram.get(w.program_id) ?? []
    arr.push(w)
    weeksByProgram.set(w.program_id, arr)
  }

  // 3. Collect all menu IDs that are assigned to current rotation weeks
  const menuIds = new Set<string>()
  const programMenuMap = new Map<string, string | null>() // programId -> menuId

  for (const prog of programs) {
    const progWeeks = weeksByProgram.get(prog.id) ?? []
    const currentWeek = progWeeks.find((w: any) => w.rotation_week === prog.current_rotation_week)
    const menuId = currentWeek?.menu_id ?? null
    programMenuMap.set(prog.id, menuId)
    if (menuId) menuIds.add(menuId)
  }

  // 4. Get menu titles
  let menuTitles = new Map<string, string>()
  if (menuIds.size > 0) {
    const { data: menus } = await db.from('menus').select('id, title').in('id', Array.from(menuIds))

    for (const m of menus ?? []) {
      menuTitles.set(m.id, m.title)
    }
  }

  // 5. Get menu items (dishes) for all menus
  let menuDishes = new Map<string, { name: string; recipeId: string | null }[]>()
  if (menuIds.size > 0) {
    const { data: items } = await db
      .from('menu_items')
      .select('menu_id, name, recipe_id, is_active')
      .in('menu_id', Array.from(menuIds))
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    for (const item of items ?? []) {
      const arr = menuDishes.get(item.menu_id) ?? []
      arr.push({ name: item.name, recipeId: item.recipe_id })
      menuDishes.set(item.menu_id, arr)
    }
  }

  // 6. Get recipe ingredients for all recipes in all menus
  const allRecipeIds = new Set<string>()
  for (const dishes of menuDishes.values()) {
    for (const d of dishes) {
      if (d.recipeId) allRecipeIds.add(d.recipeId)
    }
  }

  // Map: recipeId -> ingredient rows
  const recipeIngredientMap = new Map<
    string,
    { ingredientId: string; quantity: number; unit: string }[]
  >()
  if (allRecipeIds.size > 0) {
    const { data: ri } = await db
      .from('recipe_ingredients')
      .select('recipe_id, ingredient_id, quantity, unit')
      .in('recipe_id', Array.from(allRecipeIds))

    for (const row of ri ?? []) {
      const arr = recipeIngredientMap.get(row.recipe_id) ?? []
      arr.push({
        ingredientId: row.ingredient_id,
        quantity: parseFloat(row.quantity) || 0,
        unit: row.unit,
      })
      recipeIngredientMap.set(row.recipe_id, arr)
    }
  }

  // 7. Get ingredient names
  const allIngredientIds = new Set<string>()
  for (const ingredients of recipeIngredientMap.values()) {
    for (const ing of ingredients) {
      allIngredientIds.add(ing.ingredientId)
    }
  }

  const ingredientInfo = new Map<string, { name: string; category: string }>()
  if (allIngredientIds.size > 0) {
    const { data: ings } = await db
      .from('ingredients')
      .select('id, name, category')
      .in('id', Array.from(allIngredientIds))

    for (const ing of ings ?? []) {
      ingredientInfo.set(ing.id, { name: ing.name, category: ing.category })
    }
  }

  // 8. Build the per-day snapshots
  const dayBuckets = new Map<number, BatchClientRow[]>()
  for (const prog of programs) {
    const day = prog.delivery_day ?? 0
    const menuId = programMenuMap.get(prog.id) ?? null
    const row: BatchClientRow = {
      programId: prog.id,
      clientId: prog.client_id,
      clientName: prog.client?.full_name || 'Unknown Client',
      deliveryDay: day,
      rotationWeek: prog.current_rotation_week,
      menuId,
      menuTitle: menuId ? (menuTitles.get(menuId) ?? null) : null,
      dishes: menuId ? (menuDishes.get(menuId) ?? []) : [],
    }
    const bucket = dayBuckets.get(day) ?? []
    bucket.push(row)
    dayBuckets.set(day, bucket)
  }

  // 9. Aggregate ingredients per day
  const days: BatchDaySnapshot[] = []
  for (const [dayOfWeek, clients] of dayBuckets) {
    // Collect all ingredients across all clients for this day
    // Key: ingredientId + unit -> aggregation
    const ingredientAgg = new Map<
      string,
      {
        ingredientId: string
        totalQuantity: number
        unit: string
        contributingClients: Set<string>
      }
    >()

    for (const client of clients) {
      for (const dish of client.dishes) {
        if (!dish.recipeId) continue
        const ingredients = recipeIngredientMap.get(dish.recipeId) ?? []
        for (const ing of ingredients) {
          const key = `${ing.ingredientId}:${ing.unit}`
          const existing = ingredientAgg.get(key)
          if (existing) {
            existing.totalQuantity += ing.quantity
            existing.contributingClients.add(client.clientName)
          } else {
            ingredientAgg.set(key, {
              ingredientId: ing.ingredientId,
              totalQuantity: ing.quantity,
              unit: ing.unit,
              contributingClients: new Set([client.clientName]),
            })
          }
        }
      }
    }

    // Convert to sorted array
    const aggregatedIngredients: AggregatedIngredient[] = Array.from(ingredientAgg.values())
      .map((agg) => ({
        ingredientId: agg.ingredientId,
        ingredientName: ingredientInfo.get(agg.ingredientId)?.name ?? 'Unknown',
        category: ingredientInfo.get(agg.ingredientId)?.category ?? 'other',
        totalQuantity: Math.round(agg.totalQuantity * 1000) / 1000,
        unit: agg.unit,
        contributingClients: Array.from(agg.contributingClients),
      }))
      .sort(
        (a, b) =>
          a.category.localeCompare(b.category) || a.ingredientName.localeCompare(b.ingredientName)
      )

    days.push({
      dayOfWeek,
      dayLabel: DAY_LABELS[dayOfWeek] ?? `Day ${dayOfWeek}`,
      clients,
      aggregatedIngredients,
    })
  }

  days.sort((a, b) => a.dayOfWeek - b.dayOfWeek)

  return {
    days,
    totalActivePrograms: programs.length,
    totalClientsThisWeek: programs.length,
  }
}
