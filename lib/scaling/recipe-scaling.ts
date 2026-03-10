// Recipe Scaling Engine
// Pure math: guest_count / recipe.yield_quantity * component.scale_factor = multiplier
// Apply multiplier to every ingredient quantity. No AI, no guessing.
//
// This is a read-only computation layer. It does not mutate any data.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export interface ScaledIngredient {
  ingredientId: string
  name: string
  category: string
  baseQuantity: number
  scaledQuantity: number
  unit: string
  costPerUnitCents: number | null
  scaledCostCents: number | null
  yieldPct: number
  isOptional: boolean
  prepNotes: string | null
}

export interface ScaledComponent {
  componentId: string
  componentName: string
  componentCategory: string
  recipeId: string | null
  recipeName: string | null
  recipeYieldQuantity: number | null
  recipeYieldUnit: string | null
  recipeYieldDescription: string | null
  scaleFactor: number
  guestMultiplier: number | null
  totalMultiplier: number
  portionQuantity: number | null
  portionUnit: string | null
  scaledIngredients: ScaledIngredient[]
  recipePrepMinutes: number | null
  recipeCookMinutes: number | null
  recipeTotalMinutes: number | null
  noRecipeLinked: boolean
  noYieldData: boolean
}

export interface ScaledDish {
  dishId: string
  dishName: string
  courseNumber: number
  components: ScaledComponent[]
}

export interface MenuScalingResult {
  menuId: string
  menuName: string
  eventId: string | null
  eventGuestCount: number
  menuTargetGuests: number | null
  dishes: ScaledDish[]
  totals: {
    totalScaledCostCents: number
    costPerGuestCents: number
    uniqueIngredientCount: number
    missingPriceCount: number
    missingYieldCount: number
    unlinkedComponentCount: number
  }
  // Consolidated ingredient list (for shopping list)
  consolidatedIngredients: ConsolidatedIngredient[]
}

export interface ConsolidatedIngredient {
  ingredientId: string
  name: string
  category: string
  totalQuantity: number
  unit: string
  costPerUnitCents: number | null
  totalCostCents: number | null
  usedIn: string[] // component names
}

// ============================================
// STORE SECTION MAPPING
// ============================================

const STORE_SECTION_ORDER: Record<string, number> = {
  produce: 1,
  fresh_herb: 2,
  dairy: 3,
  protein: 4,
  frozen: 5,
  baking: 6,
  pantry: 7,
  canned: 8,
  spice: 9,
  dry_herb: 10,
  oil: 11,
  condiment: 12,
  alcohol: 13,
  beverage: 14,
  specialty: 15,
  other: 16,
}

export function getStoreSectionOrder(category: string): number {
  return STORE_SECTION_ORDER[category] ?? 99
}

export function getStoreSectionLabel(category: string): string {
  const labels: Record<string, string> = {
    produce: 'Produce',
    fresh_herb: 'Fresh Herbs',
    dairy: 'Dairy',
    protein: 'Protein / Meat',
    frozen: 'Frozen',
    baking: 'Baking',
    pantry: 'Pantry',
    canned: 'Canned Goods',
    spice: 'Spices',
    dry_herb: 'Dried Herbs',
    oil: 'Oils & Vinegars',
    condiment: 'Condiments',
    alcohol: 'Alcohol',
    beverage: 'Beverages',
    specialty: 'Specialty',
    other: 'Other',
  }
  return labels[category] ?? 'Other'
}

// ============================================
// CORE: Scale a menu for a given guest count
// ============================================

export async function scaleMenuForGuests(
  menuId: string,
  guestCount: number
): Promise<MenuScalingResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // 1. Fetch the menu
  const { data: menu, error: menuErr } = await supabase
    .from('menus')
    .select('id, name, target_guest_count, event_id')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  if (menuErr || !menu) {
    throw new Error('Menu not found')
  }

  // 2. Fetch dishes
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, course_name, course_number')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .order('course_number', { ascending: true })

  if (!dishes || dishes.length === 0) {
    return buildEmptyResult(menu, guestCount)
  }

  // 3. Fetch all components for these dishes, with recipe info
  const dishIds = dishes.map((d: any) => d.id)
  const { data: components } = await supabase
    .from('components')
    .select(
      `
      id,
      name,
      category,
      dish_id,
      recipe_id,
      scale_factor,
      portion_quantity,
      portion_unit,
      sort_order
    `
    )
    .in('dish_id', dishIds)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })

  // 4. Fetch recipes for all linked components
  const recipeIds = (components || []).map((c: any) => c.recipe_id).filter(Boolean)
  const recipeMap = new Map<string, any>()

  if (recipeIds.length > 0) {
    const { data: recipes } = await supabase
      .from('recipes')
      .select(
        `
        id,
        name,
        yield_quantity,
        yield_unit,
        yield_description,
        prep_time_minutes,
        cook_time_minutes,
        total_time_minutes
      `
      )
      .in('id', recipeIds)
      .eq('tenant_id', tenantId)

    for (const r of recipes || []) {
      recipeMap.set(r.id, r)
    }
  }

  // 5. Fetch all recipe_ingredients with ingredient details
  const ingredientsByRecipe = new Map<string, any[]>()

  if (recipeIds.length > 0) {
    const { data: recipeIngredients } = await supabase
      .from('recipe_ingredients')
      .select(
        `
        id,
        recipe_id,
        quantity,
        unit,
        is_optional,
        preparation_notes,
        ingredient:ingredients!inner(
          id,
          name,
          category,
          cost_per_unit_cents,
          last_price_cents,
          default_yield_pct
        )
      `
      )
      .in('recipe_id', recipeIds)
      .order('sort_order', { ascending: true })

    for (const ri of recipeIngredients || []) {
      const existing = ingredientsByRecipe.get(ri.recipe_id) || []
      existing.push(ri)
      ingredientsByRecipe.set(ri.recipe_id, existing)
    }
  }

  // 6. Build the scaled result
  let totalScaledCostCents = 0
  let missingPriceCount = 0
  let missingYieldCount = 0
  let unlinkedComponentCount = 0
  const consolidationMap = new Map<string, ConsolidatedIngredient>()

  const scaledDishes: ScaledDish[] = dishes.map((dish: any) => {
    const dishComponents = (components || []).filter((c: any) => c.dish_id === dish.id)

    const scaledComponents: ScaledComponent[] = dishComponents.map((comp: any) => {
      const recipe = comp.recipe_id ? recipeMap.get(comp.recipe_id) : null
      const recipeIngredients = comp.recipe_id ? ingredientsByRecipe.get(comp.recipe_id) || [] : []

      const noRecipeLinked = !comp.recipe_id
      const noYieldData = recipe ? !recipe.yield_quantity : false
      const scaleFactor = comp.scale_factor || 1

      if (noRecipeLinked) unlinkedComponentCount++
      if (recipe && noYieldData) missingYieldCount++

      // Calculate multiplier
      // guestMultiplier = how many batches of this recipe we need
      let guestMultiplier: number | null = null
      let totalMultiplier = scaleFactor

      if (recipe?.yield_quantity && recipe.yield_quantity > 0) {
        guestMultiplier = guestCount / recipe.yield_quantity
        totalMultiplier = guestMultiplier * scaleFactor
      }

      // Scale each ingredient
      const scaledIngredients: ScaledIngredient[] = recipeIngredients.map((ri: any) => {
        const ing = ri.ingredient
        const unitCost = ing.cost_per_unit_cents ?? ing.last_price_cents
        const yieldPct = ing.default_yield_pct || 100
        const baseQty = Number(ri.quantity)
        const scaledQty = roundToReasonable(baseQty * totalMultiplier)

        let scaledCost: number | null = null
        if (unitCost != null) {
          // Yield-adjusted cost: (price * quantity * 100) / yieldPct
          scaledCost = Math.round((unitCost * scaledQty * 100) / Math.max(1, yieldPct))
          totalScaledCostCents += scaledCost
        } else {
          missingPriceCount++
        }

        // Add to consolidation map
        const key = `${ing.id}::${ri.unit}`
        const existing = consolidationMap.get(key)
        if (existing) {
          existing.totalQuantity = roundToReasonable(existing.totalQuantity + scaledQty)
          if (scaledCost != null) {
            existing.totalCostCents = (existing.totalCostCents ?? 0) + scaledCost
          }
          if (!existing.usedIn.includes(comp.name)) {
            existing.usedIn.push(comp.name)
          }
        } else {
          consolidationMap.set(key, {
            ingredientId: ing.id,
            name: ing.name,
            category: ing.category,
            totalQuantity: scaledQty,
            unit: ri.unit,
            costPerUnitCents: unitCost,
            totalCostCents: scaledCost,
            usedIn: [comp.name],
          })
        }

        return {
          ingredientId: ing.id,
          name: ing.name,
          category: ing.category,
          baseQuantity: baseQty,
          scaledQuantity: scaledQty,
          unit: ri.unit,
          costPerUnitCents: unitCost,
          scaledCostCents: scaledCost,
          yieldPct,
          isOptional: ri.is_optional,
          prepNotes: ri.preparation_notes,
        }
      })

      return {
        componentId: comp.id,
        componentName: comp.name,
        componentCategory: comp.category,
        recipeId: recipe?.id ?? null,
        recipeName: recipe?.name ?? null,
        recipeYieldQuantity: recipe?.yield_quantity ? Number(recipe.yield_quantity) : null,
        recipeYieldUnit: recipe?.yield_unit ?? null,
        recipeYieldDescription: recipe?.yield_description ?? null,
        scaleFactor,
        guestMultiplier,
        totalMultiplier,
        portionQuantity: comp.portion_quantity ? Number(comp.portion_quantity) : null,
        portionUnit: comp.portion_unit,
        scaledIngredients,
        recipePrepMinutes: recipe?.prep_time_minutes ?? null,
        recipeCookMinutes: recipe?.cook_time_minutes ?? null,
        recipeTotalMinutes: recipe?.total_time_minutes ?? null,
        noRecipeLinked,
        noYieldData,
      }
    })

    return {
      dishId: dish.id,
      dishName: dish.course_name,
      courseNumber: dish.course_number,
      components: scaledComponents,
    }
  })

  // Sort consolidated ingredients by store section
  const consolidatedIngredients = [...consolidationMap.values()].sort(
    (a, b) =>
      getStoreSectionOrder(a.category) - getStoreSectionOrder(b.category) ||
      a.name.localeCompare(b.name)
  )

  return {
    menuId: menu.id,
    menuName: menu.name,
    eventId: menu.event_id,
    eventGuestCount: guestCount,
    menuTargetGuests: menu.target_guest_count,
    dishes: scaledDishes,
    totals: {
      totalScaledCostCents,
      costPerGuestCents: guestCount > 0 ? Math.round(totalScaledCostCents / guestCount) : 0,
      uniqueIngredientCount: consolidationMap.size,
      missingPriceCount,
      missingYieldCount,
      unlinkedComponentCount,
    },
    consolidatedIngredients,
  }
}

// ============================================
// CONVENIENCE: Scale a menu using event guest count
// ============================================

export async function scaleMenuForEvent(menuId: string): Promise<MenuScalingResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get the menu's linked event
  const { data: menu } = await supabase
    .from('menus')
    .select('event_id, target_guest_count')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu) throw new Error('Menu not found')

  let guestCount = menu.target_guest_count

  if (menu.event_id) {
    const { data: event } = await supabase
      .from('events')
      .select('guest_count')
      .eq('id', menu.event_id)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (event?.guest_count) {
      guestCount = event.guest_count
    }
  }

  if (!guestCount || guestCount <= 0) {
    throw new Error('No guest count available. Set it on the event or the menu.')
  }

  return scaleMenuForGuests(menuId, guestCount)
}

// ============================================
// HELPERS
// ============================================

function buildEmptyResult(menu: any, guestCount: number): MenuScalingResult {
  return {
    menuId: menu.id,
    menuName: menu.name,
    eventId: menu.event_id,
    eventGuestCount: guestCount,
    menuTargetGuests: menu.target_guest_count,
    dishes: [],
    totals: {
      totalScaledCostCents: 0,
      costPerGuestCents: 0,
      uniqueIngredientCount: 0,
      missingPriceCount: 0,
      missingYieldCount: 0,
      unlinkedComponentCount: 0,
    },
    consolidatedIngredients: [],
  }
}

/**
 * Round quantities to reasonable precision.
 * Small quantities (< 10): 2 decimal places
 * Medium (10-100): 1 decimal place
 * Large (> 100): whole numbers
 */
function roundToReasonable(n: number): number {
  if (n < 10) return Math.round(n * 100) / 100
  if (n < 100) return Math.round(n * 10) / 10
  return Math.round(n)
}
