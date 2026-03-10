'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { addDays, format } from 'date-fns'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LabelDish {
  name: string
  servings: number
  reheatingInstructions: string
  allergens: string[]
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
}

export interface GenerateLabelsInput {
  dishes: LabelDish[]
  prepDate: string
  shelfLifeDays: number
  clientName?: string
  chefName: string
  includeNutrition: boolean
}

export interface ContainerLabel {
  dishName: string
  preparedDate: string
  useByDate: string
  reheatingInstructions: string
  allergens: string[]
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  chefName: string
  clientName?: string
  servingNumber: number
  totalServings: number
}

// ─── Generate Labels ────────────────────────────────────────────────────────

export async function generateLabels(data: GenerateLabelsInput): Promise<ContainerLabel[]> {
  await requireChef()

  const prepDate = new Date(data.prepDate)
  const useByDate = addDays(prepDate, data.shelfLifeDays || 5)

  const labels: ContainerLabel[] = []

  for (const dish of data.dishes) {
    const servingCount = Math.max(1, dish.servings)
    for (let i = 1; i <= servingCount; i++) {
      labels.push({
        dishName: dish.name || 'Untitled Dish',
        preparedDate: format(prepDate, 'MMM d, yyyy'),
        useByDate: format(useByDate, 'MMM d, yyyy'),
        reheatingInstructions: dish.reheatingInstructions || '',
        allergens: dish.allergens || [],
        calories: data.includeNutrition ? dish.calories : undefined,
        protein: data.includeNutrition ? dish.protein : undefined,
        carbs: data.includeNutrition ? dish.carbs : undefined,
        fat: data.includeNutrition ? dish.fat : undefined,
        chefName: data.chefName,
        clientName: data.clientName || undefined,
        servingNumber: i,
        totalServings: servingCount,
      })
    }
  }

  return labels
}

// ─── Generate Labels from Event ─────────────────────────────────────────────

export async function generateLabelsFromEvent(eventId: string): Promise<{
  dishes: LabelDish[]
  clientName: string | null
  chefName: string
}> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get event with client info
  const { data: event, error: evErr } = await supabase
    .from('events')
    .select('id, occasion, client_id, tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', user.entityId)
    .single()

  if (evErr || !event) throw new Error('Event not found')

  // Get client name
  let clientName: string | null = null
  if (event.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('full_name')
      .eq('id', event.client_id)
      .single()
    clientName = client?.full_name ?? null
  }

  // Get chef name
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, full_name')
    .eq('id', user.entityId)
    .single()
  const chefName = chef?.business_name || chef?.full_name || 'Chef'

  // Get menus for this event
  const { data: menus } = await supabase.from('menus').select('id').eq('event_id', eventId)

  if (!menus || menus.length === 0) {
    return { dishes: [], clientName, chefName }
  }

  const menuIds = menus.map((m) => m.id)

  // Get dishes from those menus
  const { data: dishRows } = await supabase
    .from('dishes')
    .select('name, allergen_flags, description')
    .in('menu_id', menuIds)

  const dishes: LabelDish[] = (dishRows || []).map((d) => ({
    name: d.name || 'Untitled Dish',
    servings: 1,
    reheatingInstructions: '',
    allergens: d.allergen_flags || [],
    calories: undefined,
    protein: undefined,
    carbs: undefined,
    fat: undefined,
  }))

  return { dishes, clientName, chefName }
}

// ─── Generate Labels from Meal Prep Week ────────────────────────────────────

export async function generateLabelsFromMealPrepWeek(
  programId: string,
  rotationWeek: number
): Promise<{
  dishes: LabelDish[]
  clientName: string | null
  chefName: string
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // 1. Fetch the meal_prep_week for this program + rotation week
  const { data: week, error: weekErr } = await supabase
    .from('meal_prep_weeks')
    .select('id, program_id, menu_id, custom_dishes, notes')
    .eq('program_id', programId)
    .eq('rotation_week', rotationWeek)
    .eq('tenant_id', user.entityId)
    .single()

  if (weekErr || !week) {
    throw new Error('Meal prep week not found')
  }

  // 2. Get the program to find client info
  const { data: program, error: progErr } = await supabase
    .from('meal_prep_programs')
    .select('id, client_id, rotation_weeks')
    .eq('id', programId)
    .eq('tenant_id', user.entityId)
    .single()

  if (progErr || !program) {
    throw new Error('Meal prep program not found')
  }

  // 3. Get client name and dietary restrictions
  let clientName: string | null = null
  let clientAllergens: string[] = []
  if (program.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('full_name, dietary_restrictions')
      .eq('id', program.client_id)
      .single()
    clientName = client?.full_name ?? null
    if (client?.dietary_restrictions) {
      clientAllergens = Array.isArray(client.dietary_restrictions)
        ? client.dietary_restrictions
        : [client.dietary_restrictions]
    }
  }

  // 4. Get chef name
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, full_name')
    .eq('id', user.entityId)
    .single()
  const chefName = chef?.business_name || chef?.full_name || 'Chef'

  const dishes: LabelDish[] = []

  // 5. If menu_id is set, fetch menu dishes
  if (week.menu_id) {
    const { data: dishRows } = await supabase
      .from('dishes')
      .select('name, allergen_flags, description, recipe_id')
      .eq('menu_id', week.menu_id)

    // Try to get nutrition data for this menu
    const { data: nutritionRows } = await supabase
      .from('menu_nutrition')
      .select('dish_name, recipe_id, calories, protein_g, carbs_g, fat_g')
      .eq('menu_id', week.menu_id)

    const nutritionMap = new Map<string, any>()
    for (const n of nutritionRows ?? []) {
      const key = n.recipe_id || n.dish_name
      if (key) nutritionMap.set(key, n)
    }

    // Try to get reheating instructions from linked recipes
    const recipeIds = (dishRows ?? []).map((d: any) => d.recipe_id).filter(Boolean)
    let recipeMap = new Map<string, any>()
    if (recipeIds.length > 0) {
      const { data: recipes } = await supabase
        .from('recipes')
        .select('id, instructions, allergens')
        .in('id', recipeIds)
      for (const r of recipes ?? []) {
        recipeMap.set(r.id, r)
      }
    }

    for (const d of dishRows ?? []) {
      const recipe = d.recipe_id ? recipeMap.get(d.recipe_id) : null
      const nutrition = nutritionMap.get(d.recipe_id) || nutritionMap.get(d.name)
      const allergens = d.allergen_flags?.length
        ? d.allergen_flags
        : recipe?.allergens?.length
          ? recipe.allergens
          : clientAllergens

      dishes.push({
        name: d.name || 'Untitled Dish',
        servings: 1,
        reheatingInstructions: recipe?.instructions
          ? extractReheatingInstructions(recipe.instructions)
          : 'Reheat at 350F for 10-15 minutes or microwave 2-3 minutes.',
        allergens,
        calories: nutrition?.calories ?? undefined,
        protein: nutrition?.protein_g ?? undefined,
        carbs: nutrition?.carbs_g ?? undefined,
        fat: nutrition?.fat_g ?? undefined,
      })
    }
  }

  // 6. If custom_dishes is set, use the JSONB array directly
  if (Array.isArray(week.custom_dishes) && week.custom_dishes.length > 0) {
    for (const cd of week.custom_dishes) {
      dishes.push({
        name: cd.name || 'Untitled Dish',
        servings: cd.servings || 1,
        reheatingInstructions:
          cd.reheatingInstructions || 'Reheat at 350F for 10-15 minutes or microwave 2-3 minutes.',
        allergens: cd.allergens?.length ? cd.allergens : clientAllergens,
        calories: cd.calories ?? undefined,
        protein: cd.protein ?? undefined,
        carbs: cd.carbs ?? undefined,
        fat: cd.fat ?? undefined,
      })
    }
  }

  return { dishes, clientName, chefName }
}

/**
 * Extract reheating-related instructions from a full recipe instruction string.
 * Falls back to a generic instruction if nothing relevant is found.
 */
function extractReheatingInstructions(instructions: string): string {
  if (!instructions) return 'Reheat at 350F for 10-15 minutes or microwave 2-3 minutes.'
  const lines = instructions.split(/[\n.]+/)
  const reheatLine = lines.find(
    (l) => /reheat|warm|microwave|oven/i.test(l) && l.trim().length > 10
  )
  return reheatLine?.trim() || 'Reheat at 350F for 10-15 minutes or microwave 2-3 minutes.'
}

// ─── Save Label Preset ──────────────────────────────────────────────────────
// Stores reheating instructions per dish name in the chef's local storage
// or a future label_presets table. For now, returns success with the data
// so the client can persist it in localStorage.

export async function saveLabelPreset(data: {
  dishName: string
  reheatingInstructions: string
  shelfLifeDays: number
  allergens: string[]
}): Promise<{ success: true; preset: typeof data }> {
  await requireChef()

  // Validate inputs
  if (!data.dishName.trim()) {
    throw new Error('Dish name is required')
  }

  return { success: true, preset: data }
}
