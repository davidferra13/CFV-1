'use server'

import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import type { MealBoardEntry } from './types'
import { getCircleHouseholdSummary } from './household-actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShoppingIngredient {
  name: string
  quantity: number | null
  unit: string | null
  fromMeals: string[] // dish titles that need this ingredient
}

export interface WeeklyShoppingList {
  weekLabel: string
  mealCount: number
  headCount: number | null
  // Ingredients aggregated from linked recipes
  ingredients: ShoppingIngredient[]
  // Meals without linked recipes (chef plans manually)
  unlinkedMeals: { title: string; date: string; mealType: string; count: number }[]
  // All allergies to watch for
  allergies: string[]
}

// ---------------------------------------------------------------------------
// Generate shopping list for a week's meals
// ---------------------------------------------------------------------------

const GenerateWeeklyShoppingListSchema = z.object({
  groupId: z.string().uuid(),
  groupToken: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function generateWeeklyShoppingList(
  input: z.infer<typeof GenerateWeeklyShoppingListSchema>
): Promise<WeeklyShoppingList> {
  const validated = GenerateWeeklyShoppingListSchema.parse(input)
  const db: any = createServerClient({ admin: true })

  const { data: group, error: groupError } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', validated.groupId)
    .eq('group_token', validated.groupToken)
    .maybeSingle()

  if (groupError) throw new Error(`Failed to verify circle access: ${groupError.message}`)
  if (!group) throw new Error('Access denied')

  // Get all planned meals for the date range
  const { data: meals, error: mealsError } = await db
    .from('hub_meal_board')
    .select('*')
    .eq('group_id', validated.groupId)
    .gte('meal_date', validated.startDate)
    .lte('meal_date', validated.endDate)
    .neq('status', 'cancelled')
    .order('meal_date', { ascending: true })

  if (mealsError) throw new Error(`Failed to load meal board: ${mealsError.message}`)

  const entries: MealBoardEntry[] = meals ?? []
  if (entries.length === 0) {
    return {
      weekLabel: `${validated.startDate} to ${validated.endDate}`,
      mealCount: 0,
      headCount: null,
      ingredients: [],
      unlinkedMeals: [],
      allergies: [],
    }
  }

  // Collect all allergen flags from meals
  const allergySet = new Set<string>()
  for (const e of entries) {
    for (const flag of e.allergen_flags ?? []) allergySet.add(flag)
  }

  const householdSummary = await getCircleHouseholdSummary(validated.groupId, validated.groupToken)
  for (const allergy of householdSummary.allAllergies) allergySet.add(allergy)

  // Separate linked (has dish_id with recipe) vs unlinked meals
  const dishIds = entries.filter((e) => e.dish_id).map((e) => e.dish_id!)
  const ingredientMap = new Map<string, ShoppingIngredient>()
  const unlinkedMap = new Map<
    string,
    { title: string; date: string; mealType: string; count: number }
  >()
  const recipeLinkedDishIds = new Set<string>()

  if (dishIds.length > 0) {
    // dishes -> components -> recipe -> recipe_ingredients -> ingredients
    const { data: components, error: componentsError } = await db
      .from('components')
      .select('id, recipe_id, dish_id, scale_factor')
      .in('dish_id', dishIds)
      .not('recipe_id', 'is', null)

    if (componentsError) {
      throw new Error(`Failed to load dish components: ${componentsError.message}`)
    }

    const recipeIds = (components ?? [])
      .map((c: any) => c.recipe_id)
      .filter((id: string | null) => id != null)

    if (recipeIds.length > 0) {
      for (const component of components ?? []) {
        if (component.dish_id) recipeLinkedDishIds.add(component.dish_id)
      }

      const { data: recipeIngredients, error: ingredientsError } = await db
        .from('recipe_ingredients')
        .select('recipe_id, quantity, unit, ingredient:ingredients(name)')
        .in('recipe_id', recipeIds)

      if (ingredientsError) {
        throw new Error(`Failed to load recipe ingredients: ${ingredientsError.message}`)
      }

      for (const ri of recipeIngredients ?? []) {
        const ingredientName = (ri.ingredient as any)?.name
        if (!ingredientName) continue

        const key = `${ingredientName.toLowerCase()}|${ri.unit ?? ''}`

        for (const comp of components ?? []) {
          if (comp.recipe_id !== ri.recipe_id) continue

          const fromMeals = entries
            .filter((entry) => entry.dish_id === comp.dish_id)
            .map((entry) => entry.title)
          const scaledQuantity =
            ri.quantity != null ? Number(ri.quantity) * Number(comp.scale_factor ?? 1) : null

          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)!
            existing.quantity =
              existing.quantity != null && scaledQuantity != null
                ? existing.quantity + scaledQuantity
                : (existing.quantity ?? scaledQuantity)
            for (const meal of fromMeals) {
              if (!existing.fromMeals.includes(meal)) existing.fromMeals.push(meal)
            }
          } else {
            ingredientMap.set(key, {
              name: ingredientName,
              quantity: scaledQuantity,
              unit: ri.unit,
              fromMeals,
            })
          }
        }
      }
    }
  }

  // Group unlinked meals by title
  for (const entry of entries) {
    if (entry.dish_id && recipeLinkedDishIds.has(entry.dish_id)) continue
    const key = entry.title.toLowerCase().trim()
    if (unlinkedMap.has(key)) {
      unlinkedMap.get(key)!.count++
    } else {
      unlinkedMap.set(key, {
        title: entry.title,
        date: entry.meal_date,
        mealType: entry.meal_type,
        count: 1,
      })
    }
  }

  // Max head count across the week
  const headCounts = entries.map((e) => e.head_count).filter((h): h is number => h != null)
  const maxHeadCount = headCounts.length > 0 ? Math.max(...headCounts) : null

  return {
    weekLabel: `${validated.startDate} to ${validated.endDate}`,
    mealCount: entries.length,
    headCount: maxHeadCount,
    ingredients: [...ingredientMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    unlinkedMeals: [...unlinkedMap.values()],
    allergies: [...allergySet].sort(),
  }
}
