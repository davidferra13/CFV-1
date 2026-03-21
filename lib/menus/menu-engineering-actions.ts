'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import type { SimulatorDish } from './menu-simulator'

// ============================================
// TYPES
// ============================================

export type MenuQuadrant = 'star' | 'plowhorse' | 'puzzle' | 'dog'

export interface RecipeEngineering {
  recipeId: string
  recipeName: string
  category: string
  foodCostCents: number
  costPerPortionCents: number | null
  timesServed: number
  popularity: number // 0-1, fraction of events where recipe appeared
  contributionMarginCents: number // revenue per serving minus food cost per serving
  quadrant: MenuQuadrant
  hasCompleteCostData: boolean
  ingredientCount: number
}

export interface MenuEngineeringResult {
  recipes: RecipeEngineering[]
  summary: {
    totalRecipes: number
    stars: number
    plowhorses: number
    puzzles: number
    dogs: number
    medianPopularity: number
    medianMarginCents: number
    uncostableRecipes: number // recipes missing ingredient prices
  }
  recommendations: QuadrantRecommendation[]
  dateRange: { from: string | null; to: string | null }
}

export interface QuadrantRecommendation {
  quadrant: MenuQuadrant
  label: string
  color: string
  count: number
  advice: string
  recipes: RecipeEngineering[]
}

export interface RecipeProfitability {
  recipeId: string
  recipeName: string
  category: string
  foodCostCents: number
  costPerPortionCents: number | null
  ingredientCount: number
  hasCompleteCostData: boolean
  timesServed: number
  eventsUsedIn: { eventId: string; eventDate: string; menuName: string }[]
}

export interface MenuMixResult {
  menuId: string
  menuName: string
  recipes: RecipeEngineering[]
  summary: {
    stars: number
    plowhorses: number
    puzzles: number
    dogs: number
    totalFoodCostCents: number
    balanceScore: number // 0-100, how balanced the menu is
  }
  recommendations: string[]
}

// ============================================
// HELPERS
// ============================================

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2)
  }
  return sorted[mid]
}

function classifyQuadrant(
  popularity: number,
  marginCents: number,
  medianPopularity: number,
  medianMarginCents: number
): MenuQuadrant {
  const highPop = popularity >= medianPopularity
  const highMargin = marginCents >= medianMarginCents
  if (highPop && highMargin) return 'star'
  if (highPop && !highMargin) return 'plowhorse'
  if (!highPop && highMargin) return 'puzzle'
  return 'dog'
}

const QUADRANT_META: Record<MenuQuadrant, { label: string; color: string; advice: string }> = {
  star: {
    label: 'Stars',
    color: 'gold',
    advice:
      'Keep these front and center. They sell well and earn well. Maintain quality, feature them on menus, and protect their margins.',
  },
  plowhorse: {
    label: 'Plowhorses',
    color: 'blue',
    advice:
      'Popular but low margin. Look for ways to reduce food cost (cheaper ingredient swaps, better portioning) or slightly raise the price. Do not remove these; clients love them.',
  },
  puzzle: {
    label: 'Puzzles',
    color: 'purple',
    advice:
      'High margin but rarely ordered. Try repositioning on the menu, pairing with popular items, or featuring them in tasting menus. Worth the effort to promote.',
  },
  dog: {
    label: 'Dogs',
    color: 'red',
    advice:
      'Low popularity and low margin. Consider removing from rotation, reworking the recipe to cut costs, or replacing with a new dish. Keep only if they serve a strategic purpose (dietary accommodation, signature item).',
  },
}

// ============================================
// CORE ANALYSIS
// ============================================

export async function analyzeMenuEngineering(dateRange?: {
  from?: string
  to?: string
}): Promise<MenuEngineeringResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  // 1. Get all recipe costs from the recipe_cost_summary view
  const { data: recipeCosts, error: costError } = await supabase
    .from('recipe_cost_summary')
    .select(
      'recipe_id, recipe_name, category, total_ingredient_cost_cents, cost_per_portion_cents, has_all_prices, ingredient_count'
    )
    .eq('tenant_id', tenantId)

  if (costError) throw new Error(`Failed to load recipe costs: ${costError.message}`)
  if (!recipeCosts || recipeCosts.length === 0) {
    return {
      recipes: [],
      summary: {
        totalRecipes: 0,
        stars: 0,
        plowhorses: 0,
        puzzles: 0,
        dogs: 0,
        medianPopularity: 0,
        medianMarginCents: 0,
        uncostableRecipes: 0,
      },
      recommendations: [],
      dateRange: { from: dateRange?.from ?? null, to: dateRange?.to ?? null },
    }
  }

  // 2. Get events with menus, optionally filtered by date range
  let eventQuery = supabase
    .from('events')
    .select('id, event_date, menu_id, guest_count')
    .eq('tenant_id', tenantId)
    .eq('is_demo', false)
    .not('menu_id', 'is', null)

  if (dateRange?.from) {
    eventQuery = eventQuery.gte('event_date', dateRange.from)
  }
  if (dateRange?.to) {
    eventQuery = eventQuery.lte('event_date', dateRange.to)
  }

  const { data: events, error: eventError } = await eventQuery
  if (eventError) throw new Error(`Failed to load events: ${eventError.message}`)

  const totalEvents = events?.length ?? 0

  // 3. Get financial summaries for these events to compute average revenue per guest
  const eventIds = (events ?? []).map((e) => e.id)
  let avgRevenuePerGuestCents = 0

  if (eventIds.length > 0) {
    const { data: financials } = await supabase
      .from('event_financial_summary')
      .select('event_id, quoted_price_cents')
      .in('event_id', eventIds)

    if (financials && financials.length > 0) {
      // Match financials to events to get per-guest revenue
      const eventMap = new Map((events ?? []).map((e) => [e.id, e]))
      let totalRevenue = 0
      let totalGuests = 0
      for (const f of financials) {
        const ev = eventMap.get(f.event_id!)
        if (ev && f.quoted_price_cents && ev.guest_count > 0) {
          totalRevenue += f.quoted_price_cents
          totalGuests += ev.guest_count
        }
      }
      if (totalGuests > 0) {
        avgRevenuePerGuestCents = Math.round(totalRevenue / totalGuests)
      }
    }
  }

  // 4. For each menu, get recipes via dishes -> components -> recipe_id
  const menuIds = [...new Set((events ?? []).filter((e) => e.menu_id).map((e) => e.menu_id!))]
  const recipeEventCount = new Map<string, number>()

  if (menuIds.length > 0) {
    // Get dishes for these menus
    const { data: dishes } = await supabase
      .from('dishes')
      .select('id, menu_id')
      .in('menu_id', menuIds)
      .eq('tenant_id', tenantId)

    if (dishes && dishes.length > 0) {
      const dishIds = dishes.map((d) => d.id)
      // Build menu -> dishes map
      const menuDishMap = new Map<string, string[]>()
      for (const d of dishes) {
        const existing = menuDishMap.get(d.menu_id) ?? []
        existing.push(d.id)
        menuDishMap.set(d.menu_id, existing)
      }

      // Get components with recipe_id
      const { data: components } = await supabase
        .from('components')
        .select('dish_id, recipe_id')
        .in('dish_id', dishIds)
        .not('recipe_id', 'is', null)
        .eq('tenant_id', tenantId)

      if (components && components.length > 0) {
        // Build dish -> recipe_ids map
        const dishRecipeMap = new Map<string, Set<string>>()
        for (const c of components) {
          if (!c.recipe_id) continue
          const existing = dishRecipeMap.get(c.dish_id) ?? new Set()
          existing.add(c.recipe_id)
          dishRecipeMap.set(c.dish_id, existing)
        }

        // Build menu -> recipe_ids map
        const menuRecipeMap = new Map<string, Set<string>>()
        for (const [menuId, dIds] of menuDishMap) {
          const recipes = new Set<string>()
          for (const dId of dIds) {
            const rIds = dishRecipeMap.get(dId)
            if (rIds) {
              for (const rId of rIds) recipes.add(rId)
            }
          }
          menuRecipeMap.set(menuId, recipes)
        }

        // Count how many events each recipe appeared in
        for (const ev of events ?? []) {
          if (!ev.menu_id) continue
          const recipeIds = menuRecipeMap.get(ev.menu_id)
          if (!recipeIds) continue
          for (const rId of recipeIds) {
            recipeEventCount.set(rId, (recipeEventCount.get(rId) ?? 0) + 1)
          }
        }
      }
    }
  }

  // 5. Build engineering data for each recipe
  const engineeringData: RecipeEngineering[] = []
  for (const rc of recipeCosts) {
    if (!rc.recipe_id) continue
    const timesServed = recipeEventCount.get(rc.recipe_id) ?? 0
    const popularity = totalEvents > 0 ? timesServed / totalEvents : 0
    const costPerPortion = rc.cost_per_portion_cents ?? rc.total_ingredient_cost_cents ?? 0
    // Contribution margin: avg revenue per guest minus recipe cost per portion
    const contributionMarginCents = avgRevenuePerGuestCents - costPerPortion

    engineeringData.push({
      recipeId: rc.recipe_id,
      recipeName: rc.recipe_name ?? 'Unnamed',
      category: rc.category ?? 'other',
      foodCostCents: rc.total_ingredient_cost_cents ?? 0,
      costPerPortionCents: rc.cost_per_portion_cents,
      timesServed,
      popularity,
      contributionMarginCents,
      quadrant: 'dog', // placeholder, classify after computing medians
      hasCompleteCostData: rc.has_all_prices ?? false,
      ingredientCount: rc.ingredient_count ?? 0,
    })
  }

  // 6. Compute medians and classify
  const popularities = engineeringData.map((r) => r.popularity)
  const margins = engineeringData.map((r) => r.contributionMarginCents)
  const medianPop = median(popularities)
  const medianMargin = median(margins)

  for (const r of engineeringData) {
    r.quadrant = classifyQuadrant(r.popularity, r.contributionMarginCents, medianPop, medianMargin)
  }

  // Sort: stars first, then plowhorses, puzzles, dogs. Within each, by margin descending
  const quadrantOrder: Record<MenuQuadrant, number> = { star: 0, plowhorse: 1, puzzle: 2, dog: 3 }
  engineeringData.sort((a, b) => {
    const qDiff = quadrantOrder[a.quadrant] - quadrantOrder[b.quadrant]
    if (qDiff !== 0) return qDiff
    return b.contributionMarginCents - a.contributionMarginCents
  })

  // 7. Build summary
  const counts = { star: 0, plowhorse: 0, puzzle: 0, dog: 0 }
  for (const r of engineeringData) counts[r.quadrant]++
  const uncostable = engineeringData.filter((r) => !r.hasCompleteCostData).length

  // 8. Build recommendations
  const recommendations: QuadrantRecommendation[] = (
    ['star', 'plowhorse', 'puzzle', 'dog'] as MenuQuadrant[]
  ).map((q) => ({
    quadrant: q,
    label: QUADRANT_META[q].label,
    color: QUADRANT_META[q].color,
    count: counts[q],
    advice: QUADRANT_META[q].advice,
    recipes: engineeringData.filter((r) => r.quadrant === q),
  }))

  return {
    recipes: engineeringData,
    summary: {
      totalRecipes: engineeringData.length,
      stars: counts.star,
      plowhorses: counts.plowhorse,
      puzzles: counts.puzzle,
      dogs: counts.dog,
      medianPopularity: medianPop,
      medianMarginCents: medianMargin,
      uncostableRecipes: uncostable,
    },
    recommendations,
    dateRange: { from: dateRange?.from ?? null, to: dateRange?.to ?? null },
  }
}

// ============================================
// SINGLE RECIPE PROFITABILITY
// ============================================

export async function getRecipeProfitability(recipeId: string): Promise<RecipeProfitability> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  // Get recipe cost data
  const { data: costData, error: costError } = await supabase
    .from('recipe_cost_summary')
    .select(
      'recipe_id, recipe_name, category, total_ingredient_cost_cents, cost_per_portion_cents, has_all_prices, ingredient_count'
    )
    .eq('recipe_id', recipeId)
    .eq('tenant_id', tenantId)
    .single()

  if (costError) throw new Error(`Recipe not found: ${costError.message}`)

  // Find events where this recipe was used (via components -> dishes -> menus -> events)
  const { data: components } = await supabase
    .from('components')
    .select('dish_id')
    .eq('recipe_id', recipeId)
    .eq('tenant_id', tenantId)

  const eventsUsedIn: { eventId: string; eventDate: string; menuName: string }[] = []

  if (components && components.length > 0) {
    const dishIds = [...new Set(components.map((c) => c.dish_id))]

    const { data: dishes } = await supabase
      .from('dishes')
      .select('menu_id')
      .in('id', dishIds)
      .eq('tenant_id', tenantId)

    if (dishes && dishes.length > 0) {
      const menuIds = [...new Set(dishes.map((d) => d.menu_id))]

      const { data: menus } = await supabase
        .from('menus')
        .select('id, name, event_id')
        .in('id', menuIds)
        .eq('tenant_id', tenantId)
        .not('event_id', 'is', null)

      if (menus && menus.length > 0) {
        const eventIds = menus.filter((m) => m.event_id).map((m) => m.event_id!)

        const { data: events } = await supabase
          .from('events')
          .select('id, event_date')
          .in('id', eventIds)
          .eq('tenant_id', tenantId)
          .eq('is_demo', false)

        if (events) {
          const menuMap = new Map(menus.map((m) => [m.event_id!, m]))
          for (const ev of events) {
            const menu = menuMap.get(ev.id)
            if (menu) {
              eventsUsedIn.push({
                eventId: ev.id,
                eventDate: ev.event_date,
                menuName: menu.name,
              })
            }
          }
        }
      }
    }
  }

  return {
    recipeId: costData.recipe_id!,
    recipeName: costData.recipe_name ?? 'Unnamed',
    category: costData.category ?? 'other',
    foodCostCents: costData.total_ingredient_cost_cents ?? 0,
    costPerPortionCents: costData.cost_per_portion_cents,
    ingredientCount: costData.ingredient_count ?? 0,
    hasCompleteCostData: costData.has_all_prices ?? false,
    timesServed: eventsUsedIn.length,
    eventsUsedIn: eventsUsedIn.sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
  }
}

// ============================================
// MENU MIX ANALYSIS
// ============================================

export async function getMenuMixAnalysis(menuId: string): Promise<MenuMixResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  // Get menu info
  const { data: menu, error: menuError } = await supabase
    .from('menus')
    .select('id, name, event_id')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  if (menuError) throw new Error(`Menu not found: ${menuError.message}`)

  // Get all recipes in this menu via dishes -> components
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)

  if (!dishes || dishes.length === 0) {
    return {
      menuId,
      menuName: menu.name,
      recipes: [],
      summary: {
        stars: 0,
        plowhorses: 0,
        puzzles: 0,
        dogs: 0,
        totalFoodCostCents: 0,
        balanceScore: 0,
      },
      recommendations: [],
    }
  }

  const dishIds = dishes.map((d) => d.id)
  const { data: components } = await supabase
    .from('components')
    .select('recipe_id')
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)
    .eq('tenant_id', tenantId)

  const recipeIds = [
    ...new Set((components ?? []).filter((c) => c.recipe_id).map((c) => c.recipe_id!)),
  ]

  if (recipeIds.length === 0) {
    return {
      menuId,
      menuName: menu.name,
      recipes: [],
      summary: {
        stars: 0,
        plowhorses: 0,
        puzzles: 0,
        dogs: 0,
        totalFoodCostCents: 0,
        balanceScore: 0,
      },
      recommendations: [],
    }
  }

  // Run the full analysis to get quadrant classifications, then filter to this menu's recipes
  const fullAnalysis = await analyzeMenuEngineering()
  const menuRecipes = fullAnalysis.recipes.filter((r) => recipeIds.includes(r.recipeId))

  // If the full analysis didn't cover some recipes (no events yet), fill them in from cost data
  const coveredIds = new Set(menuRecipes.map((r) => r.recipeId))
  const missingIds = recipeIds.filter((id) => !coveredIds.has(id))

  if (missingIds.length > 0) {
    const { data: missingCosts } = await supabase
      .from('recipe_cost_summary')
      .select(
        'recipe_id, recipe_name, category, total_ingredient_cost_cents, cost_per_portion_cents, has_all_prices, ingredient_count'
      )
      .in('recipe_id', missingIds)
      .eq('tenant_id', tenantId)

    for (const mc of missingCosts ?? []) {
      if (!mc.recipe_id) continue
      menuRecipes.push({
        recipeId: mc.recipe_id,
        recipeName: mc.recipe_name ?? 'Unnamed',
        category: mc.category ?? 'other',
        foodCostCents: mc.total_ingredient_cost_cents ?? 0,
        costPerPortionCents: mc.cost_per_portion_cents,
        timesServed: 0,
        popularity: 0,
        contributionMarginCents:
          0 - (mc.cost_per_portion_cents ?? mc.total_ingredient_cost_cents ?? 0),
        quadrant: 'dog',
        hasCompleteCostData: mc.has_all_prices ?? false,
        ingredientCount: mc.ingredient_count ?? 0,
      })
    }
  }

  // Summary
  const counts = { star: 0, plowhorse: 0, puzzle: 0, dog: 0 }
  let totalFoodCostCents = 0
  for (const r of menuRecipes) {
    counts[r.quadrant]++
    totalFoodCostCents += r.foodCostCents
  }

  // Balance score: ideal menu is ~50% stars, 25% plowhorses, 15% puzzles, 10% dogs
  // Score based on how close the actual distribution is to ideal
  const total = menuRecipes.length || 1
  const idealDist = { star: 0.5, plowhorse: 0.25, puzzle: 0.15, dog: 0.1 }
  let deviationSum = 0
  for (const q of ['star', 'plowhorse', 'puzzle', 'dog'] as MenuQuadrant[]) {
    const actual = counts[q] / total
    deviationSum += Math.abs(actual - idealDist[q])
  }
  // Max deviation is 2.0 (all in one quadrant). Convert to 0-100 score.
  const balanceScore = Math.round(Math.max(0, (1 - deviationSum / 1.5) * 100))

  // Recommendations
  const recs: string[] = []
  if (counts.dog > total * 0.3) {
    recs.push(
      'Over 30% of this menu is Dogs. Consider swapping some low performers for higher-margin dishes.'
    )
  }
  if (counts.star === 0) {
    recs.push(
      'This menu has no Stars. Add at least one high-popularity, high-margin dish to anchor the menu.'
    )
  }
  if (counts.plowhorse > total * 0.4) {
    recs.push(
      'Heavy on Plowhorses. Look for ingredient cost savings or slight price increases on these popular items.'
    )
  }
  if (counts.puzzle > 0 && counts.star < counts.puzzle) {
    recs.push(
      'More Puzzles than Stars. Try promoting your high-margin Puzzles to boost their popularity.'
    )
  }
  if (balanceScore >= 70) {
    recs.push('Good menu balance overall. Keep monitoring as ingredient costs change.')
  }

  return {
    menuId,
    menuName: menu.name,
    recipes: menuRecipes,
    summary: {
      stars: counts.star,
      plowhorses: counts.plowhorse,
      puzzles: counts.puzzle,
      dogs: counts.dog,
      totalFoodCostCents,
      balanceScore,
    },
    recommendations: recs,
  }
}

// ============================================
// SIMULATOR DATA BRIDGE
// ============================================

export interface MenuSimulatorData {
  currentDishes: SimulatorDish[]
  guestCount: number
  menuRevenueCents: number
  guestAllergens: { allergen: string; severity: string; confirmed_by_chef: boolean }[]
  availableRecipes: SimulatorDish[]
}

/**
 * Fetches all data needed for the What-If Simulator panel.
 * Bridges DB schema into the SimulatorDish format the pure simulator expects.
 */
export async function getMenuSimulatorData(menuId: string): Promise<MenuSimulatorData> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  // 1. Get menu with event link
  const { data: menu, error: menuError } = await supabase
    .from('menus')
    .select('id, target_guest_count, event_id')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  if (menuError) throw new Error(`Menu not found: ${menuError.message}`)

  const guestCount = menu.target_guest_count || 4

  // 2. Get event revenue + client allergens
  let menuRevenueCents = 0
  let guestAllergens: { allergen: string; severity: string; confirmed_by_chef: boolean }[] = []

  if (menu.event_id) {
    const { data: event } = await supabase
      .from('events')
      .select('quoted_price_cents, client_id')
      .eq('id', menu.event_id)
      .eq('tenant_id', tenantId)
      .single()

    if (event) {
      menuRevenueCents = event.quoted_price_cents ?? 0

      if (event.client_id) {
        const { data: allergies } = await supabase
          .from('client_allergies')
          .select('allergen, severity, confirmed_by_chef')
          .eq('client_id', event.client_id)

        guestAllergens = allergies ?? []
      }
    }
  }

  // 3. Get current dishes with components, recipes, and ingredients
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, name, course_name, prep_time_minutes')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)

  const currentDishes: SimulatorDish[] = []

  if (dishes && dishes.length > 0) {
    const dishIds = dishes.map((d) => d.id)

    // Get components with recipe links
    const { data: components } = await supabase
      .from('components')
      .select('dish_id, recipe_id')
      .in('dish_id', dishIds)
      .eq('tenant_id', tenantId)

    // Get recipe costs
    const recipeIds = [
      ...new Set((components ?? []).filter((c) => c.recipe_id).map((c) => c.recipe_id!)),
    ]

    let recipeCostMap = new Map<string, number>()
    let recipeIngredientMap = new Map<string, { name: string }[]>()

    if (recipeIds.length > 0) {
      const { data: costData } = await supabase
        .from('recipe_cost_summary')
        .select('recipe_id, cost_per_portion_cents, total_ingredient_cost_cents')
        .in('recipe_id', recipeIds)
        .eq('tenant_id', tenantId)

      for (const c of costData ?? []) {
        if (c.recipe_id) {
          recipeCostMap.set(
            c.recipe_id,
            c.cost_per_portion_cents ?? c.total_ingredient_cost_cents ?? 0
          )
        }
      }

      // Get ingredients per recipe
      const { data: recipeIngredients } = await supabase
        .from('recipe_ingredients')
        .select('recipe_id, ingredient_id')
        .in('recipe_id', recipeIds)

      const ingredientIds = [
        ...new Set(
          (recipeIngredients ?? []).filter((ri) => ri.ingredient_id).map((ri) => ri.ingredient_id!)
        ),
      ]

      let ingredientNameMap = new Map<string, string>()
      if (ingredientIds.length > 0) {
        const { data: ingredients } = await supabase
          .from('ingredients')
          .select('id, name')
          .in('id', ingredientIds)

        for (const ing of ingredients ?? []) {
          ingredientNameMap.set(ing.id, ing.name)
        }
      }

      // Build recipe -> ingredients map
      for (const ri of recipeIngredients ?? []) {
        if (!ri.recipe_id || !ri.ingredient_id) continue
        const existing = recipeIngredientMap.get(ri.recipe_id) ?? []
        const name = ingredientNameMap.get(ri.ingredient_id)
        if (name) existing.push({ name })
        recipeIngredientMap.set(ri.recipe_id, existing)
      }
    }

    // Build dish -> recipe mapping
    const dishRecipeMap = new Map<string, string[]>()
    for (const c of components ?? []) {
      if (!c.recipe_id) continue
      const existing = dishRecipeMap.get(c.dish_id) ?? []
      existing.push(c.recipe_id)
      dishRecipeMap.set(c.dish_id, existing)
    }

    // Assemble SimulatorDish objects
    for (const dish of dishes) {
      const rIds = dishRecipeMap.get(dish.id) ?? []
      let costPerServingCents = 0
      const ingredients: { name: string }[] = []
      const seenIngredients = new Set<string>()

      for (const rId of rIds) {
        costPerServingCents += recipeCostMap.get(rId) ?? 0
        for (const ing of recipeIngredientMap.get(rId) ?? []) {
          const lower = ing.name.toLowerCase()
          if (!seenIngredients.has(lower)) {
            seenIngredients.add(lower)
            ingredients.push(ing)
          }
        }
      }

      currentDishes.push({
        id: dish.id,
        name: dish.name,
        ingredients,
        costPerServingCents,
        prepTimeMinutes: dish.prep_time_minutes ?? null,
      })
    }
  }

  // 4. Get available recipes (tenant recipes not currently on this menu) as swap candidates
  const usedRecipeIds = new Set<string>()
  for (const d of currentDishes) {
    // We already tracked dish-recipe mapping above
  }

  // Get all tenant recipes with costs (limit to those with cost data for useful swaps)
  const { data: allRecipes } = await supabase
    .from('recipe_cost_summary')
    .select('recipe_id, recipe_name, cost_per_portion_cents, total_ingredient_cost_cents')
    .eq('tenant_id', tenantId)
    .not('cost_per_portion_cents', 'is', null)
    .limit(100)

  const availableRecipes: SimulatorDish[] = []
  for (const r of allRecipes ?? []) {
    if (!r.recipe_id) continue
    // Get ingredients for this recipe
    const { data: recipeIngs } = await supabase
      .from('recipe_ingredients')
      .select('ingredient_id, ingredients(name)')
      .eq('recipe_id', r.recipe_id)
      .limit(30)

    const ingredients = (recipeIngs ?? [])
      .map((ri: any) => ({ name: ri.ingredients?.name }))
      .filter((i: any) => i.name)

    availableRecipes.push({
      id: r.recipe_id,
      name: r.recipe_name ?? 'Unnamed',
      ingredients,
      costPerServingCents: r.cost_per_portion_cents ?? r.total_ingredient_cost_cents ?? 0,
      prepTimeMinutes: null,
    })
  }

  return {
    currentDishes,
    guestCount,
    menuRevenueCents,
    guestAllergens,
    availableRecipes,
  }
}
