'use server'

// Prep Generation - Auto-generates prep requirements from service day menus.
// Menu -> Menu Items -> Recipes -> Recipe Ingredients -> Prep Requirements.
// Cross-references inventory_counts for on-hand quantities and deficits.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ── Types ─────────────────────────────────────────────────────────────────

export interface PrepRequirement {
  id: string
  chef_id: string
  service_day_id: string
  recipe_id: string | null
  ingredient_id: string | null
  ingredient_name: string
  required_qty: number
  unit: string
  on_hand_qty: number | null
  deficit_qty: number | null
  prep_status: 'pending' | 'in_progress' | 'done' | 'verified'
  assigned_to: string | null
  station_id: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  due_time: string | null
  completed_at: string | null
  completed_by: string | null
  notes: string | null
}

export interface PrepSummary {
  total: number
  pending: number
  in_progress: number
  done: number
  verified: number
  completion_pct: number
  critical_pending: number
  deficit_items: number
}

// ── Generate Prep from Menu ───────────────────────────────────────────────

/**
 * Auto-generate prep requirements for a service day from its linked menus.
 * Flow: service_menus -> menus -> menu_items -> recipes -> recipe_ingredients
 * Cross-references inventory_counts for on-hand and computes deficits.
 * Multiplies by expected_covers / recipe.servings for proper scaling.
 */
export async function generatePrepRequirements(serviceDayId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get service day with expected covers
  const { data: sd } = await db
    .from('service_days')
    .select('id, expected_covers')
    .eq('id', serviceDayId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!sd) return { success: false, error: 'Service day not found' }

  // Get linked menus
  const { data: serviceMenus } = await db
    .from('service_menus')
    .select('menu_id')
    .eq('service_day_id', serviceDayId)
    .eq('is_active', true)

  if (!serviceMenus?.length) {
    return { success: false, error: 'No menus linked to this service day' }
  }

  const menuIds = serviceMenus.map((sm: any) => sm.menu_id)

  // Get all menu items with linked recipes
  const { data: menuItems } = await db
    .from('menu_items')
    .select('id, name, recipe_id, recipes(servings)')
    .in('menu_id', menuIds)
    .eq('is_active', true)
    .not('recipe_id', 'is', null)

  if (!menuItems?.length) {
    return { success: false, error: 'No menu items with linked recipes found' }
  }

  // Get all recipe ingredients in one query
  const recipeIds = [...new Set(menuItems.map((mi: any) => mi.recipe_id))]
  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, quantity, unit, ingredients(name)')
    .in('recipe_id', recipeIds)

  if (!recipeIngredients?.length) {
    return { success: false, error: 'No recipe ingredients found' }
  }

  // Aggregate: same ingredient across multiple recipes/items
  const ingredientMap = new Map<
    string,
    {
      ingredient_id: string | null
      ingredient_name: string
      required_qty: number
      unit: string
      recipe_ids: Set<string>
    }
  >()

  for (const mi of menuItems) {
    const recipeServings = mi.recipes?.servings || 1
    // Scale factor: how many times to multiply recipe for expected covers
    const scaleFactor = sd.expected_covers ? Math.ceil(sd.expected_covers / recipeServings) : 1

    const riForRecipe = recipeIngredients.filter((ri: any) => ri.recipe_id === mi.recipe_id)

    for (const ri of riForRecipe) {
      const key = ri.ingredient_id || ri.ingredients?.name || 'unknown'
      const existing = ingredientMap.get(key)

      if (existing) {
        existing.required_qty += ri.quantity * scaleFactor
        existing.recipe_ids.add(ri.recipe_id)
      } else {
        ingredientMap.set(key, {
          ingredient_id: ri.ingredient_id,
          ingredient_name: ri.ingredients?.name || 'Unknown',
          required_qty: ri.quantity * scaleFactor,
          unit: ri.unit,
          recipe_ids: new Set([ri.recipe_id]),
        })
      }
    }
  }

  // Get current inventory counts
  const ingredientIds = [...ingredientMap.values()].map((v) => v.ingredient_id).filter(Boolean)

  let inventoryCounts = new Map<string, number>()
  if (ingredientIds.length) {
    const { data: counts } = await db
      .from('inventory_counts')
      .select('ingredient_id, current_qty')
      .eq('chef_id', user.tenantId!)
      .in('ingredient_id', ingredientIds)

    if (counts) {
      for (const c of counts) {
        inventoryCounts.set(c.ingredient_id, c.current_qty || 0)
      }
    }
  }

  // Clear existing prep requirements for this service day (regenerate)
  await db
    .from('service_prep_requirements')
    .delete()
    .eq('service_day_id', serviceDayId)
    .eq('chef_id', user.tenantId!)

  // Insert new prep requirements
  const prepItems = [...ingredientMap.entries()].map(([, val]) => {
    const onHand = val.ingredient_id ? (inventoryCounts.get(val.ingredient_id) ?? null) : null
    const deficit = onHand != null ? Math.max(0, val.required_qty - onHand) : null

    return {
      chef_id: user.tenantId!,
      service_day_id: serviceDayId,
      recipe_id: [...val.recipe_ids][0], // Primary recipe
      ingredient_id: val.ingredient_id,
      ingredient_name: val.ingredient_name,
      required_qty: val.required_qty,
      unit: val.unit,
      on_hand_qty: onHand,
      deficit_qty: deficit,
      priority: deficit != null && deficit > 0 ? 'high' : 'medium',
    }
  })

  if (prepItems.length) {
    const { error } = await db.from('service_prep_requirements').insert(prepItems)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/ops')
  revalidatePath('/ops/prep')
  return { success: true, generated: prepItems.length }
}

// ── Prep Queries ──────────────────────────────────────────────────────────

export async function getPrepRequirements(
  serviceDayId: string,
  filters?: { station_id?: string; assigned_to?: string; prep_status?: string }
): Promise<PrepRequirement[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('service_prep_requirements')
    .select('*')
    .eq('service_day_id', serviceDayId)
    .eq('chef_id', user.tenantId!)
    .order('priority', { ascending: true })
    .order('ingredient_name', { ascending: true })

  if (filters?.station_id) query = query.eq('station_id', filters.station_id)
  if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to)
  if (filters?.prep_status) query = query.eq('prep_status', filters.prep_status)

  const { data } = await query
  return data || []
}

export async function getPrepSummary(serviceDayId: string): Promise<PrepSummary> {
  const items = await getPrepRequirements(serviceDayId)

  const pending = items.filter((i) => i.prep_status === 'pending').length
  const in_progress = items.filter((i) => i.prep_status === 'in_progress').length
  const done = items.filter((i) => i.prep_status === 'done').length
  const verified = items.filter((i) => i.prep_status === 'verified').length
  const total = items.length
  const completion_pct = total > 0 ? Math.round(((done + verified) / total) * 100) : 0
  const critical_pending = items.filter(
    (i) => i.priority === 'critical' && i.prep_status === 'pending'
  ).length
  const deficit_items = items.filter((i) => (i.deficit_qty ?? 0) > 0).length

  return {
    total,
    pending,
    in_progress,
    done,
    verified,
    completion_pct,
    critical_pending,
    deficit_items,
  }
}

// ── Prep Updates ──────────────────────────────────────────────────────────

export async function updatePrepStatus(
  id: string,
  status: 'pending' | 'in_progress' | 'done' | 'verified',
  staffMemberId?: string
) {
  const user = await requireChef()
  const db: any = createServerClient()

  const updates: Record<string, any> = { prep_status: status }
  if (status === 'done' || status === 'verified') {
    updates.completed_at = new Date().toISOString()
    if (staffMemberId) updates.completed_by = staffMemberId
  }

  const { error } = await db
    .from('service_prep_requirements')
    .update(updates)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) return { success: false, error: error.message }

  revalidatePath('/ops')
  revalidatePath('/ops/prep')
  return { success: true }
}

export async function assignPrep(id: string, assignedTo: string | null, stationId?: string | null) {
  const user = await requireChef()
  const db: any = createServerClient()

  const updates: Record<string, any> = { assigned_to: assignedTo }
  if (stationId !== undefined) updates.station_id = stationId

  const { error } = await db
    .from('service_prep_requirements')
    .update(updates)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) return { success: false, error: error.message }

  revalidatePath('/ops/prep')
  return { success: true }
}

export async function batchUpdatePrepStatus(
  ids: string[],
  status: 'pending' | 'in_progress' | 'done' | 'verified',
  staffMemberId?: string
) {
  const results = await Promise.all(ids.map((id) => updatePrepStatus(id, status, staffMemberId)))
  const failures = results.filter((r) => !r.success)
  if (failures.length) {
    return { success: false, error: `${failures.length} of ${ids.length} failed` }
  }
  return { success: true, updated: ids.length }
}
