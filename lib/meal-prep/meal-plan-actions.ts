'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// Types
// ============================================

export type MealEntry = {
  name: string
  recipeId?: string
  category?: string
  notes?: string
}

export type DayPlan = {
  dayIndex: number // 0=Mon, 1=Tue ... 6=Sun
  meals: MealEntry[]
}

export type VarietyWarning = {
  dishName: string
  reason: 'duplicate_this_week' | 'appeared_recent_weeks'
  details: string
}

// ============================================
// Actions
// ============================================

/**
 * Get the meal plan for a specific rotation week.
 * Reads from meal_prep_weeks.custom_dishes JSONB, structured as DayPlan[].
 */
export async function getWeeklyMealPlan(
  programId: string,
  rotationWeek: number
): Promise<{ plan: DayPlan[]; weekId: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('meal_prep_weeks')
    .select('id, custom_dishes')
    .eq('program_id', programId)
    .eq('rotation_week', rotationWeek)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) {
    return { plan: buildEmptyPlan(), weekId: null }
  }

  // custom_dishes may be in old format (flat array) or new format (DayPlan[])
  const raw = data.custom_dishes
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0]?.dayIndex === 'number') {
    // New DayPlan[] format
    return { plan: ensureAllDays(raw as DayPlan[]), weekId: data.id }
  }

  // Old format or empty: return empty plan
  return { plan: buildEmptyPlan(), weekId: data.id }
}

/**
 * Save the entire week plan at once.
 */
export async function saveMealPlan(
  programId: string,
  rotationWeek: number,
  plan: DayPlan[]
): Promise<{ success?: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('meal_prep_weeks')
    .update({ custom_dishes: plan })
    .eq('program_id', programId)
    .eq('rotation_week', rotationWeek)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/meal-prep/${programId}`)
  revalidatePath(`/meal-prep/${programId}/plan`)
  return { success: true }
}

/**
 * Add a single dish to a specific day.
 */
export async function assignDishToDay(
  programId: string,
  rotationWeek: number,
  dayIndex: number,
  dish: { name: string; recipeId?: string; notes?: string }
): Promise<{ success?: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch current plan
  const { plan } = await getWeeklyMealPlan(programId, rotationWeek)

  const dayPlan = plan.find((d) => d.dayIndex === dayIndex)
  if (!dayPlan) {
    return { error: 'Invalid day index' }
  }

  dayPlan.meals.push({
    name: dish.name,
    recipeId: dish.recipeId,
    notes: dish.notes,
  })

  const { error } = await supabase
    .from('meal_prep_weeks')
    .update({ custom_dishes: plan })
    .eq('program_id', programId)
    .eq('rotation_week', rotationWeek)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/meal-prep/${programId}`)
  revalidatePath(`/meal-prep/${programId}/plan`)
  return { success: true }
}

/**
 * Remove a dish from a specific day.
 */
export async function removeDishFromDay(
  programId: string,
  rotationWeek: number,
  dayIndex: number,
  dishIndex: number
): Promise<{ success?: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { plan } = await getWeeklyMealPlan(programId, rotationWeek)

  const dayPlan = plan.find((d) => d.dayIndex === dayIndex)
  if (!dayPlan || dishIndex < 0 || dishIndex >= dayPlan.meals.length) {
    return { error: 'Invalid day or dish index' }
  }

  dayPlan.meals.splice(dishIndex, 1)

  const { error } = await supabase
    .from('meal_prep_weeks')
    .update({ custom_dishes: plan })
    .eq('program_id', programId)
    .eq('rotation_week', rotationWeek)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/meal-prep/${programId}`)
  revalidatePath(`/meal-prep/${programId}/plan`)
  return { success: true }
}

/**
 * Get client dietary context (restrictions, allergies, dislikes, favorite cuisines).
 */
export async function getClientDietaryContext(clientId: string): Promise<{
  allergies: string[]
  dietary_restrictions: string[]
  dislikes: string[]
  favorite_cuisines: string[]
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('clients')
    .select('allergies, dietary_restrictions, dislikes, favorite_cuisines')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) {
    return { allergies: [], dietary_restrictions: [], dislikes: [], favorite_cuisines: [] }
  }

  return {
    allergies: data.allergies ?? [],
    dietary_restrictions: data.dietary_restrictions ?? [],
    dislikes: data.dislikes ?? [],
    favorite_cuisines: data.favorite_cuisines ?? [],
  }
}

/**
 * Deterministic variety check.
 * Flags: dish appears more than once this week, or appeared in previous 2 weeks.
 */
export async function checkVariety(
  programId: string,
  rotationWeek: number,
  plan: DayPlan[]
): Promise<VarietyWarning[]> {
  const warnings: VarietyWarning[] = []

  // 1. Check duplicates within this week
  const allDishNames = plan.flatMap((d) => d.meals.map((m) => m.name.toLowerCase().trim()))
  const seen = new Map<string, number>()
  for (const name of allDishNames) {
    seen.set(name, (seen.get(name) ?? 0) + 1)
  }
  for (const [name, count] of seen) {
    if (count > 1) {
      warnings.push({
        dishName: name,
        reason: 'duplicate_this_week',
        details: `"${name}" appears ${count} times this week`,
      })
    }
  }

  // 2. Check previous 2 rotation weeks
  const prevWeeks: number[] = []
  for (let i = 1; i <= 2; i++) {
    const prev = rotationWeek - i
    if (prev >= 1) prevWeeks.push(prev)
  }

  if (prevWeeks.length > 0) {
    const user = await requireChef()
    const supabase: any = createServerClient()

    const { data: prevData } = await supabase
      .from('meal_prep_weeks')
      .select('rotation_week, custom_dishes')
      .eq('program_id', programId)
      .eq('tenant_id', user.tenantId!)
      .in('rotation_week', prevWeeks)

    if (prevData) {
      const prevDishNames = new Set<string>()
      for (const week of prevData) {
        const dishes = week.custom_dishes
        if (Array.isArray(dishes)) {
          for (const day of dishes) {
            if (Array.isArray(day?.meals)) {
              for (const meal of day.meals) {
                if (meal?.name) prevDishNames.add(meal.name.toLowerCase().trim())
              }
            }
          }
        }
      }

      for (const name of new Set(allDishNames)) {
        if (prevDishNames.has(name)) {
          warnings.push({
            dishName: name,
            reason: 'appeared_recent_weeks',
            details: `"${name}" also appeared in a recent rotation week`,
          })
        }
      }
    }
  }

  return warnings
}

/**
 * Search recipes for the recipe picker.
 * Thin wrapper for client convenience (avoids importing from recipes/actions).
 */
export async function searchRecipesForMealPlan(
  query: string
): Promise<{ id: string; name: string; category: string | null }[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('recipes')
    .select('id, name, category')
    .eq('tenant_id', user.tenantId!)
    .eq('archived', false)
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true })
    .limit(20)

  return data ?? []
}

// ============================================
// Helpers
// ============================================

function buildEmptyPlan(): DayPlan[] {
  return Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, meals: [] }))
}

function ensureAllDays(plan: DayPlan[]): DayPlan[] {
  const byDay = new Map(plan.map((d) => [d.dayIndex, d]))
  return Array.from({ length: 7 }, (_, i) => byDay.get(i) ?? { dayIndex: i, meals: [] })
}
