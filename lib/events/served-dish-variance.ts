'use server'

// Served Dish Variance
// Compares planned menu items (from menus/dishes) against what was actually served
// (from served_dish_history). Used on the AAR page to show planned-vs-served variance.
// Formula > AI: pure data comparison, zero LLM dependency.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ── Types ──────────────────────────────────────────────────────────────────────

export type DishItem = {
  name: string
  recipeId: string | null
  notes: string | null
}

export type DishSubstitution = {
  planned: DishItem
  served: DishItem
}

export type ServedDishVarianceResult = {
  planned: DishItem[]
  served: DishItem[]
  additions: DishItem[] // Served but not in the plan
  removals: DishItem[] // Planned but not served
  substitutions: DishSubstitution[] // Same recipe_id slot but different name
  matchCount: number // How many planned items were served as-is
}

// ── Server Action ──────────────────────────────────────────────────────────────

/**
 * Compare the planned menu for an event against what was actually served.
 * Planned items come from the event's linked menu (dishes table).
 * Served items come from served_dish_history for the event.
 * Returns null if the event doesn't exist or has no data to compare.
 */
export async function getServedDishVariance(
  eventId: string,
  tenantId: string
): Promise<ServedDishVarianceResult | null> {
  const user = await requireChef()
  const safeTenantId = user.tenantId!
  const supabase: any = createServerClient()

  // 1. Fetch the event to get its menu_id
  const { data: event } = await supabase
    .from('events')
    .select('id, menu_id, client_id')
    .eq('id', eventId)
    .eq('tenant_id', safeTenantId)
    .single()

  if (!event) return null

  // 2. Fetch planned dishes from the menu
  const planned: DishItem[] = []
  if (event.menu_id) {
    const { data: dishes } = await supabase
      .from('dishes')
      .select('name, recipe_id')
      .eq('menu_id', event.menu_id)
      .eq('tenant_id', safeTenantId)
      .order('course_number', { ascending: true })
      .order('sort_order', { ascending: true })

    for (const d of dishes ?? []) {
      if (d.name) {
        planned.push({
          name: d.name,
          recipeId: d.recipe_id ?? null,
          notes: null,
        })
      }
    }
  }

  // 3. Fetch served dishes from history
  const { data: servedRows } = await supabase
    .from('served_dish_history')
    .select('dish_name, recipe_id, notes, client_reaction')
    .eq('event_id', eventId)
    .eq('chef_id', safeTenantId)
    .order('created_at', { ascending: true })

  const served: DishItem[] = (servedRows ?? []).map((r: any) => ({
    name: r.dish_name,
    recipeId: r.recipe_id ?? null,
    notes: r.notes ?? r.client_reaction ?? null,
  }))

  // If neither planned nor served data exists, nothing to compare
  if (planned.length === 0 && served.length === 0) return null

  // 4. Compute variance
  // Normalize names for comparison (lowercase, trimmed)
  const normalize = (n: string) => n.toLowerCase().trim()

  const plannedNames = new Set(planned.map((p) => normalize(p.name)))
  const servedNames = new Set(served.map((s) => normalize(s.name)))

  // Additions: served but not planned
  const additions = served.filter((s) => !plannedNames.has(normalize(s.name)))

  // Removals: planned but not served
  const removals = planned.filter((p) => !servedNames.has(normalize(p.name)))

  // Substitutions: same recipe_id but different name
  const substitutions: DishSubstitution[] = []
  if (removals.length > 0 && additions.length > 0) {
    // Try to match by recipe_id first
    const removalsWithRecipe = removals.filter((r) => r.recipeId)
    const additionsWithRecipe = additions.filter((a) => a.recipeId)

    for (const removal of removalsWithRecipe) {
      const matchIdx = additionsWithRecipe.findIndex(
        (a) => a.recipeId === removal.recipeId
      )
      if (matchIdx !== -1) {
        substitutions.push({
          planned: removal,
          served: additionsWithRecipe[matchIdx],
        })
        // Remove from additions and removals arrays
        const addName = normalize(additionsWithRecipe[matchIdx].name)
        const remName = normalize(removal.name)
        additions.splice(
          additions.findIndex((a) => normalize(a.name) === addName),
          1
        )
        removals.splice(
          removals.findIndex((r) => normalize(r.name) === remName),
          1
        )
        additionsWithRecipe.splice(matchIdx, 1)
      }
    }
  }

  const matchCount = planned.filter((p) => servedNames.has(normalize(p.name))).length

  return {
    planned,
    served,
    additions,
    removals,
    substitutions,
    matchCount,
  }
}
