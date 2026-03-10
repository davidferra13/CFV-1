'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// Types
// ============================================

export interface RecipeNutritionData {
  id: string
  recipe_id: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number | null
  sodium_mg: number | null
  source: 'manual' | 'calculated' | 'imported'
}

export interface WeeklyNutritionSummary {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  totalFiber: number
  mealCount: number
  dailyAverageCalories: number
  dailyAverageProtein: number
  dailyAverageCarbs: number
  dailyAverageFat: number
  perMeal: { name: string; calories: number; protein: number; carbs: number; fat: number }[]
}

export interface MacroCheckResult {
  withinTargets: boolean
  checks: {
    label: string
    value: number
    target: number
    status: 'ok' | 'warning' | 'over' | 'under'
  }[]
}

// ============================================
// Validation
// ============================================

const nutritionSchema = z.object({
  calories: z.number().int().min(0),
  protein_g: z.number().min(0),
  carbs_g: z.number().min(0),
  fat_g: z.number().min(0),
  fiber_g: z.number().min(0).nullable().optional(),
  sodium_mg: z.number().min(0).nullable().optional(),
})

// ============================================
// Actions
// ============================================

export async function setRecipeNutrition(
  recipeId: string,
  input: z.infer<typeof nutritionSchema>
): Promise<{ success?: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const parsed = nutritionSchema.parse(input)

  // Verify recipe belongs to this chef
  const { data: recipe, error: recipeErr } = await supabase
    .from('recipes')
    .select('id')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (recipeErr || !recipe) {
    return { error: 'Recipe not found' }
  }

  const { error } = await supabase.from('recipe_nutrition').upsert(
    {
      chef_id: user.tenantId!,
      recipe_id: recipeId,
      calories: parsed.calories,
      protein_g: parsed.protein_g,
      carbs_g: parsed.carbs_g,
      fat_g: parsed.fat_g,
      fiber_g: parsed.fiber_g ?? null,
      sodium_mg: parsed.sodium_mg ?? null,
      source: 'manual',
    },
    { onConflict: 'chef_id,recipe_id' }
  )

  if (error) return { error: error.message }

  revalidatePath(`/recipes/${recipeId}`)
  return { success: true }
}

export async function getRecipeNutrition(recipeId: string): Promise<RecipeNutritionData | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('recipe_nutrition')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('recipe_id', recipeId)
    .single()

  if (error || !data) return null

  return data
}

export async function getWeeklyNutritionSummary(
  programId: string,
  rotationWeek: number
): Promise<WeeklyNutritionSummary> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const empty: WeeklyNutritionSummary = {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    totalFiber: 0,
    mealCount: 0,
    dailyAverageCalories: 0,
    dailyAverageProtein: 0,
    dailyAverageCarbs: 0,
    dailyAverageFat: 0,
    perMeal: [],
  }

  // Get the week's meal plan
  const { data: week, error: weekErr } = await supabase
    .from('meal_prep_weeks')
    .select('custom_dishes')
    .eq('program_id', programId)
    .eq('rotation_week', rotationWeek)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (weekErr || !week) return empty

  const dishes = week.custom_dishes
  if (!Array.isArray(dishes)) return empty

  // Collect all recipe IDs from the meal plan
  const recipeIds: string[] = []
  const mealNames: { name: string; recipeId?: string }[] = []

  for (const day of dishes) {
    if (Array.isArray(day?.meals)) {
      for (const meal of day.meals) {
        mealNames.push({ name: meal.name || 'Unknown', recipeId: meal.recipeId })
        if (meal.recipeId) {
          recipeIds.push(meal.recipeId)
        }
      }
    }
  }

  if (recipeIds.length === 0) return empty

  // Get nutrition data for all recipes
  const { data: nutritionData } = await supabase
    .from('recipe_nutrition')
    .select('recipe_id, calories, protein_g, carbs_g, fat_g, fiber_g')
    .eq('chef_id', user.tenantId!)
    .in('recipe_id', [...new Set(recipeIds)])

  if (!nutritionData || nutritionData.length === 0) return empty

  const nutritionMap = new Map(nutritionData.map((n: any) => [n.recipe_id, n]))

  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFat = 0
  let totalFiber = 0
  const perMeal: WeeklyNutritionSummary['perMeal'] = []

  for (const meal of mealNames) {
    const n = meal.recipeId ? nutritionMap.get(meal.recipeId) : null
    if (n) {
      totalCalories += n.calories || 0
      totalProtein += Number(n.protein_g) || 0
      totalCarbs += Number(n.carbs_g) || 0
      totalFat += Number(n.fat_g) || 0
      totalFiber += Number(n.fiber_g) || 0
      perMeal.push({
        name: meal.name,
        calories: n.calories || 0,
        protein: Number(n.protein_g) || 0,
        carbs: Number(n.carbs_g) || 0,
        fat: Number(n.fat_g) || 0,
      })
    }
  }

  const mealCount = perMeal.length
  // Assume 7 delivery days for daily averages
  const days = 7

  return {
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    totalFiber,
    mealCount,
    dailyAverageCalories: mealCount > 0 ? Math.round(totalCalories / days) : 0,
    dailyAverageProtein: mealCount > 0 ? Math.round(totalProtein / days) : 0,
    dailyAverageCarbs: mealCount > 0 ? Math.round(totalCarbs / days) : 0,
    dailyAverageFat: mealCount > 0 ? Math.round(totalFat / days) : 0,
    perMeal,
  }
}

export async function checkMacroBalance(
  programId: string,
  rotationWeek: number,
  targets?: {
    caloriesMin?: number
    caloriesMax?: number
    proteinMin?: number
  }
): Promise<MacroCheckResult> {
  const summary = await getWeeklyNutritionSummary(programId, rotationWeek)

  // Default targets (typical meal prep weekly targets)
  const caloriesMin = targets?.caloriesMin ?? 8000 // ~1150/day
  const caloriesMax = targets?.caloriesMax ?? 18000 // ~2570/day
  const proteinMin = targets?.proteinMin ?? 300 // ~43g/day

  const checks: MacroCheckResult['checks'] = []

  // Weekly calorie check
  if (summary.totalCalories < caloriesMin) {
    checks.push({
      label: 'Weekly Calories',
      value: summary.totalCalories,
      target: caloriesMin,
      status: 'under',
    })
  } else if (summary.totalCalories > caloriesMax) {
    checks.push({
      label: 'Weekly Calories',
      value: summary.totalCalories,
      target: caloriesMax,
      status: 'over',
    })
  } else {
    checks.push({
      label: 'Weekly Calories',
      value: summary.totalCalories,
      target: caloriesMax,
      status: 'ok',
    })
  }

  // Weekly protein check
  if (summary.totalProtein < proteinMin) {
    checks.push({
      label: 'Weekly Protein (g)',
      value: summary.totalProtein,
      target: proteinMin,
      status: 'under',
    })
  } else {
    checks.push({
      label: 'Weekly Protein (g)',
      value: summary.totalProtein,
      target: proteinMin,
      status: 'ok',
    })
  }

  // Macro ratio check (as a warning if fat > 40% of calories)
  if (summary.totalCalories > 0) {
    const fatCalPct = (summary.totalFat * 9) / summary.totalCalories
    if (fatCalPct > 0.4) {
      checks.push({
        label: 'Fat % of Calories',
        value: Math.round(fatCalPct * 100),
        target: 40,
        status: 'warning',
      })
    } else {
      checks.push({
        label: 'Fat % of Calories',
        value: Math.round(fatCalPct * 100),
        target: 40,
        status: 'ok',
      })
    }
  }

  const withinTargets = checks.every((c) => c.status === 'ok')

  return { withinTargets, checks }
}
