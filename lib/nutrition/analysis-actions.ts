'use server'

// Menu Nutrition Analysis - Spoonacular API integration
// Fetches per-dish nutritional data for menus and stores results in menu_nutrition.
// Pro feature: nutrition-analysis module.
// Formula > AI: uses Spoonacular API (deterministic lookup), never Ollama.

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MenuNutritionEntry = {
  id: string
  tenant_id: string
  menu_id: string
  recipe_id: string | null
  dish_name: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  sodium_mg: number | null
  allergens: string[]
  source: 'manual' | 'spoonacular' | 'usda'
  chef_override: boolean
  api_response: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

type SpoonacularNutrient = {
  name: string
  amount: number
  unit: string
}

type SpoonacularNutritionResponse = {
  calories: number
  carbs: string
  fat: string
  protein: string
  nutrients: SpoonacularNutrient[]
}

// ─── Spoonacular API ──────────────────────────────────────────────────────────

function getSpoonacularKey(): string {
  const key = process.env.SPOONACULAR_API_KEY
  if (!key)
    throw new Error('SPOONACULAR_API_KEY not set in .env.local. Add it to use nutrition analysis.')
  return key
}

/**
 * Search for a dish by name and get its nutrition info via Spoonacular.
 * Uses the "Guess Nutrition by Dish Name" endpoint which is the most
 * reliable for dish-level nutrition (vs ingredient-level).
 */
async function fetchDishNutrition(dishName: string): Promise<{
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  sodium_mg: number | null
  allergens: string[]
  apiResponse: Record<string, unknown> | null
} | null> {
  const apiKey = getSpoonacularKey()

  try {
    // Use "Guess Nutrition by Dish Name" - best for whole dishes
    const res = await fetch(
      `https://api.spoonacular.com/recipes/guessNutrition?title=${encodeURIComponent(dishName)}&apiKey=${apiKey}`
    )

    if (!res.ok) {
      console.error(`[nutrition] Spoonacular returned ${res.status} for "${dishName}"`)
      return null
    }

    const data = (await res.json()) as SpoonacularNutritionResponse

    // Extract macros from the response
    const calories = data.calories ?? null
    const protein_g = parseNutrientValue(data.protein)
    const carbs_g = parseNutrientValue(data.carbs)
    const fat_g = parseNutrientValue(data.fat)

    // Fiber and sodium come from the nutrients array if available
    let fiber_g: number | null = null
    let sodium_mg: number | null = null

    if (data.nutrients && Array.isArray(data.nutrients)) {
      const fiberEntry = data.nutrients.find((n) => n.name.toLowerCase().includes('fiber'))
      const sodiumEntry = data.nutrients.find((n) => n.name.toLowerCase().includes('sodium'))
      if (fiberEntry) fiber_g = Math.round(fiberEntry.amount * 10) / 10
      if (sodiumEntry) sodium_mg = Math.round(sodiumEntry.amount)
    }

    return {
      calories: typeof calories === 'number' ? Math.round(calories) : null,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g,
      sodium_mg,
      allergens: [],
      apiResponse: data as Record<string, unknown>,
    }
  } catch (err) {
    console.error(`[nutrition] Failed to fetch nutrition for "${dishName}":`, err)
    return null
  }
}

/** Parse "42g" or "42 grams" into a number */
function parseNutrientValue(val: unknown): number | null {
  if (typeof val === 'number') return Math.round(val * 10) / 10
  if (typeof val === 'string') {
    const match = val.match(/([\d.]+)/)
    if (match) return Math.round(parseFloat(match[1]) * 10) / 10
  }
  if (val && typeof val === 'object' && 'value' in val) {
    const v = (val as { value: number }).value
    return typeof v === 'number' ? Math.round(v * 10) / 10 : null
  }
  return null
}

// ─── Server Actions ───────────────────────────────────────────────────────────

/**
 * Analyze nutrition for all dishes in a menu via Spoonacular API.
 * Fetches per-dish macros and upserts into menu_nutrition table.
 * Pro feature.
 */
export async function analyzeMenuNutrition(menuId: string): Promise<{
  success: boolean
  analyzed: number
  failed: number
  errors: string[]
  entries: MenuNutritionEntry[]
}> {
  const user = await requireChef()
  await requirePro('nutrition-analysis')

  const validated = z.string().uuid().parse(menuId)
  const db: any = createServerClient()

  // 1. Verify menu belongs to this tenant
  const { data: menu, error: menuError } = await db
    .from('menus')
    .select('id, name')
    .eq('id', validated)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (menuError || !menu) {
    throw new Error('Menu not found or access denied')
  }

  // 2. Fetch dishes for this menu
  const { data: dishes } = await db
    .from('dishes')
    .select('id, name, recipe_id')
    .eq('menu_id', validated)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (!dishes || dishes.length === 0) {
    return { success: true, analyzed: 0, failed: 0, errors: [], entries: [] }
  }

  // Check API key before making any calls
  if (!process.env.SPOONACULAR_API_KEY) {
    return {
      success: false,
      analyzed: 0,
      failed: dishes.length,
      errors: [
        'SPOONACULAR_API_KEY not configured. Add it to .env.local to use nutrition analysis.',
      ],
      entries: [],
    }
  }

  // 3. Fetch nutrition for each dish via Spoonacular
  let analyzed = 0
  let failed = 0
  const errors: string[] = []
  const upsertRows: Record<string, unknown>[] = []

  for (const dish of dishes) {
    const dishName = dish.name || 'Unknown Dish'
    const nutrition = await fetchDishNutrition(dishName)

    if (nutrition) {
      upsertRows.push({
        tenant_id: user.tenantId!,
        menu_id: validated,
        recipe_id: dish.recipe_id || null,
        dish_name: dishName,
        calories: nutrition.calories,
        protein_g: nutrition.protein_g,
        carbs_g: nutrition.carbs_g,
        fat_g: nutrition.fat_g,
        fiber_g: nutrition.fiber_g,
        sodium_mg: nutrition.sodium_mg,
        allergens: JSON.stringify(nutrition.allergens),
        source: 'spoonacular',
        chef_override: false,
        api_response: JSON.stringify(nutrition.apiResponse),
      })
      analyzed++
    } else {
      errors.push(
        `Could not fetch nutrition for "${dishName}" (Spoonacular API failure or no match)`
      )
      // Insert a row with nulls so the chef knows which dishes failed
      upsertRows.push({
        tenant_id: user.tenantId!,
        menu_id: validated,
        recipe_id: dish.recipe_id || null,
        dish_name: dishName,
        calories: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        fiber_g: null,
        sodium_mg: null,
        allergens: '[]',
        source: 'spoonacular',
        chef_override: false,
        api_response: null,
      })
      failed++
    }
  }

  // 4. Upsert all rows (on conflict: update only if not chef-overridden)
  if (upsertRows.length > 0) {
    const { error: upsertError } = await db.from('menu_nutrition').upsert(upsertRows, {
      onConflict: 'menu_id,recipe_id,dish_name',
      ignoreDuplicates: false,
    })

    if (upsertError) {
      console.error('[nutrition] Upsert error:', upsertError)
      throw new Error('Failed to save nutrition data')
    }
  }

  // 5. Return fresh data
  const entries = await fetchMenuNutritionRows(db, validated, user.tenantId!)
  revalidatePath(`/nutrition/${validated}`)

  return { success: true, analyzed, failed, errors, entries }
}

/**
 * Get stored nutrition data for a menu.
 */
export async function getMenuNutrition(menuId: string): Promise<MenuNutritionEntry[]> {
  const user = await requireChef()
  await requirePro('nutrition-analysis')

  const validated = z.string().uuid().parse(menuId)
  const db: any = createServerClient()

  return fetchMenuNutritionRows(db, validated, user.tenantId!)
}

/**
 * Chef override: update specific nutrition values for a dish.
 * Marks the entry as chef_override = true so future API calls don't overwrite it.
 */
export async function updateDishNutrition(
  nutritionId: string,
  updates: {
    calories?: number | null
    protein_g?: number | null
    carbs_g?: number | null
    fat_g?: number | null
    fiber_g?: number | null
    sodium_mg?: number | null
  }
): Promise<MenuNutritionEntry> {
  const user = await requireChef()
  await requirePro('nutrition-analysis')

  const validatedId = z.string().uuid().parse(nutritionId)
  const UpdateSchema = z.object({
    calories: z.number().int().nonnegative().nullable().optional(),
    protein_g: z.number().nonnegative().nullable().optional(),
    carbs_g: z.number().nonnegative().nullable().optional(),
    fat_g: z.number().nonnegative().nullable().optional(),
    fiber_g: z.number().nonnegative().nullable().optional(),
    sodium_mg: z.number().int().nonnegative().nullable().optional(),
  })
  const validatedUpdates = UpdateSchema.parse(updates)

  const db: any = createServerClient()

  // Verify ownership
  const { data: existing, error: fetchErr } = await db
    .from('menu_nutrition')
    .select('id, menu_id')
    .eq('id', validatedId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchErr || !existing) {
    throw new Error('Nutrition entry not found or access denied')
  }

  // Update with chef_override flag
  const { data: updated, error: updateErr } = await db
    .from('menu_nutrition')
    .update({
      ...validatedUpdates,
      chef_override: true,
      source: 'manual',
    })
    .eq('id', validatedId)
    .eq('tenant_id', user.tenantId!)
    .select('*')
    .single()

  if (updateErr || !updated) {
    throw new Error('Failed to update nutrition entry')
  }

  revalidatePath(`/nutrition/${existing.menu_id}`)

  return mapRow(updated)
}

/**
 * Delete a single nutrition entry.
 */
export async function deleteDishNutrition(nutritionId: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  await requirePro('nutrition-analysis')

  const validatedId = z.string().uuid().parse(nutritionId)
  const db: any = createServerClient()

  // Verify ownership and get menu_id for revalidation
  const { data: existing, error: fetchErr } = await db
    .from('menu_nutrition')
    .select('id, menu_id')
    .eq('id', validatedId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchErr || !existing) {
    throw new Error('Nutrition entry not found or access denied')
  }

  const { error: deleteErr } = await db
    .from('menu_nutrition')
    .delete()
    .eq('id', validatedId)
    .eq('tenant_id', user.tenantId!)

  if (deleteErr) {
    throw new Error('Failed to delete nutrition entry')
  }

  revalidatePath(`/nutrition/${existing.menu_id}`)

  return { success: true }
}

/**
 * Toggle whether nutrition info is shown on client-facing proposals/portal.
 * Stores the preference as a metadata entry in menu_nutrition with a special
 * sentinel dish_name. If the menus table gains a show_nutrition column later,
 * this can be migrated.
 */
export async function toggleNutritionDisplay(
  menuId: string,
  show: boolean
): Promise<{ success: boolean; show: boolean }> {
  const user = await requireChef()
  await requirePro('nutrition-analysis')

  const validated = z.string().uuid().parse(menuId)
  const db: any = createServerClient()

  // Verify menu ownership
  const { data: menu, error: menuErr } = await db
    .from('menus')
    .select('id')
    .eq('id', validated)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (menuErr || !menu) {
    throw new Error('Menu not found or access denied')
  }

  // Use a sentinel row to store the display preference
  const sentinelName = '__nutrition_display_settings__'

  const { error: upsertErr } = await db.from('menu_nutrition').upsert(
    {
      tenant_id: user.tenantId!,
      menu_id: validated,
      recipe_id: null,
      dish_name: sentinelName,
      calories: show ? 1 : 0, // 1 = show, 0 = hide
      source: 'manual',
      chef_override: true,
      allergens: '[]',
    },
    { onConflict: 'menu_id,recipe_id,dish_name' }
  )

  if (upsertErr) {
    console.error('[nutrition] Toggle display error:', upsertErr)
    throw new Error('Failed to update nutrition display setting')
  }

  revalidatePath(`/nutrition/${validated}`)

  return { success: true, show }
}

/**
 * Get whether nutrition is set to display on proposals for a given menu.
 */
export async function getNutritionDisplaySetting(menuId: string): Promise<boolean> {
  const user = await requireChef()
  const validated = z.string().uuid().parse(menuId)
  const db: any = createServerClient()

  const { data } = await db
    .from('menu_nutrition')
    .select('calories')
    .eq('menu_id', validated)
    .eq('tenant_id', user.tenantId!)
    .eq('dish_name', '__nutrition_display_settings__')
    .maybeSingle()

  return data?.calories === 1
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

async function fetchMenuNutritionRows(
  db: any,
  menuId: string,
  tenantId: string
): Promise<MenuNutritionEntry[]> {
  const { data, error } = await db
    .from('menu_nutrition')
    .select('*')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .neq('dish_name', '__nutrition_display_settings__')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[nutrition] Fetch error:', error)
    return []
  }

  return (data || []).map(mapRow)
}

function mapRow(row: any): MenuNutritionEntry {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    menu_id: row.menu_id,
    recipe_id: row.recipe_id,
    dish_name: row.dish_name,
    calories: row.calories,
    protein_g: row.protein_g ? Number(row.protein_g) : null,
    carbs_g: row.carbs_g ? Number(row.carbs_g) : null,
    fat_g: row.fat_g ? Number(row.fat_g) : null,
    fiber_g: row.fiber_g ? Number(row.fiber_g) : null,
    sodium_mg: row.sodium_mg,
    allergens: Array.isArray(row.allergens)
      ? row.allergens
      : typeof row.allergens === 'string'
        ? JSON.parse(row.allergens)
        : [],
    source: row.source,
    chef_override: row.chef_override,
    api_response: row.api_response,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
