'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  buildStockCoverageMap,
  consolidateIngredientRows,
  fetchCurrentStockRows,
  fetchIngredientPlanningMeta,
  getIngredientPlanningKey,
} from '@/lib/inventory/planning-support'
import type {
  ConstraintRecipeIngredientCoverage,
  ConstraintRecipePickerResult,
  ConstraintRecipePick,
} from './constraint-recipe-picker-types'

const ConstraintRecipePickerInputSchema = z.object({
  eventId: z.string().uuid().optional(),
  dietaryTags: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(12).optional(),
})

type ConstraintRecipePickerInput = z.infer<typeof ConstraintRecipePickerInputSchema>

function normalizeToken(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

function normalizeList(values: unknown[] | null | undefined): string[] {
  const seen = new Set<string>()
  for (const value of values ?? []) {
    const normalized = normalizeToken(value)
    if (normalized) seen.add(normalized)
  }
  return Array.from(seen)
}

function overlap(values: string[], required: Set<string>): string[] {
  return values.filter((value) => required.has(value))
}

function emptyResult(
  dietaryTags: string[],
  allergies: string[],
  filteredOutCount = 0
): ConstraintRecipePickerResult {
  return {
    status: 'empty',
    picks: [],
    dietaryTags,
    allergies,
    filteredOutCount,
  }
}

export async function getConstraintRecipePicks(
  input: ConstraintRecipePickerInput = {}
): Promise<ConstraintRecipePickerResult> {
  const user = await requireChef()
  const parsed = ConstraintRecipePickerInputSchema.parse(input)
  const db: any = createServerClient()
  const limit = parsed.limit ?? 6

  let dietaryTags = normalizeList(parsed.dietaryTags)
  let allergies = normalizeList(parsed.allergies)

  if (parsed.eventId) {
    const { data: event, error: eventError } = await db
      .from('events')
      .select('dietary_restrictions, allergies')
      .eq('id', parsed.eventId)
      .eq('tenant_id', user.tenantId!)
      .maybeSingle()

    if (eventError) throw new Error(`Failed to load event constraints: ${eventError.message}`)

    dietaryTags = normalizeList([...dietaryTags, ...((event?.dietary_restrictions as any[]) ?? [])])
    allergies = normalizeList([...allergies, ...((event?.allergies as any[]) ?? [])])
  }

  const { data: recipes, error: recipesError } = await db
    .from('recipes')
    .select('id, name, category, servings, dietary_tags, times_cooked, last_cooked_at')
    .eq('tenant_id', user.tenantId!)
    .eq('archived', false)
    .order('times_cooked', { ascending: false })
    .limit(80)

  if (recipesError) throw new Error(`Failed to load recipes: ${recipesError.message}`)
  if (!recipes?.length) return emptyResult(dietaryTags, allergies)

  const requiredDietaryTags = new Set(dietaryTags)
  const recipeIds = (recipes as any[]).map((recipe) => recipe.id)

  const { data: recipeIngredients, error: ingredientsError } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, quantity, unit, is_optional')
    .in('recipe_id', recipeIds)

  if (ingredientsError) {
    throw new Error(`Failed to load recipe ingredients: ${ingredientsError.message}`)
  }

  const ingredientIds = Array.from(
    new Set(
      ((recipeIngredients ?? []) as any[])
        .map((row) => row.ingredient_id)
        .filter((id): id is string => typeof id === 'string')
    )
  )

  const { data: ingredients, error: ingredientMetaError } = ingredientIds.length
    ? await db
        .from('ingredients')
        .select('id, name, allergen_flags')
        .eq('tenant_id', user.tenantId!)
        .in('id', ingredientIds)
    : { data: [], error: null }

  if (ingredientMetaError) {
    throw new Error(`Failed to load ingredient constraints: ${ingredientMetaError.message}`)
  }

  const ingredientById = new Map<string, { name: string; allergens: string[] }>()
  for (const ingredient of (ingredients ?? []) as any[]) {
    ingredientById.set(ingredient.id, {
      name: ingredient.name,
      allergens: normalizeList(ingredient.allergen_flags ?? []),
    })
  }

  const metaByIngredient = await fetchIngredientPlanningMeta(db, ingredientIds, user.tenantId!)
  const stockRows = await fetchCurrentStockRows(db, user.tenantId!, ingredientIds)
  const allergySet = new Set(allergies)
  const ingredientsByRecipe = new Map<string, any[]>()

  for (const row of (recipeIngredients ?? []) as any[]) {
    const ingredient = ingredientById.get(row.ingredient_id)
    if (!ingredient) continue
    const existing = ingredientsByRecipe.get(row.recipe_id) ?? []
    existing.push({ ...row, ingredient })
    ingredientsByRecipe.set(row.recipe_id, existing)
  }

  let filteredOutCount = 0
  const picks: ConstraintRecipePick[] = []

  for (const recipe of recipes as any[]) {
    const recipeDietaryTags = normalizeList(recipe.dietary_tags ?? [])
    const missingDietaryTags = [...requiredDietaryTags].filter(
      (tag) => !recipeDietaryTags.includes(tag)
    )

    if (missingDietaryTags.length > 0) {
      filteredOutCount++
      continue
    }

    const rows = ingredientsByRecipe.get(recipe.id) ?? []
    if (rows.length === 0) continue

    const allergyConflicts = Array.from(
      new Set(
        rows.flatMap((row) => [
          ...overlap(row.ingredient.allergens, allergySet),
          ...(allergySet.has(normalizeToken(row.ingredient.name) ?? '')
            ? [normalizeToken(row.ingredient.name) ?? '']
            : []),
        ])
      )
    ).filter(Boolean)

    if (allergyConflicts.length > 0) {
      filteredOutCount++
      continue
    }

    const requiredRows = rows.filter((row) => !row.is_optional)
    const needs = consolidateIngredientRows(
      requiredRows.map((row) => ({
        ingredientId: row.ingredient_id,
        ingredientName: row.ingredient.name,
        quantity: Number(row.quantity),
        unit: row.unit,
      })),
      metaByIngredient
    )
    const coverageMap = buildStockCoverageMap(needs, stockRows, metaByIngredient)
    const ingredientCoverage: ConstraintRecipeIngredientCoverage[] = needs.map((need) => {
      const coverage = coverageMap.get(getIngredientPlanningKey(need.ingredientId, need.unit))
      const onHandQty = coverage?.onHandQty ?? 0
      const status =
        onHandQty >= need.quantity ? 'ready' : onHandQty > 0 ? 'partial' : 'missing'

      return {
        ingredientId: need.ingredientId,
        ingredientName: need.ingredientName,
        neededQty: need.quantity,
        onHandQty,
        unit: need.unit,
        status,
      }
    })

    const readyCount = ingredientCoverage.filter((item) => item.status === 'ready').length
    const partialCount = ingredientCoverage.filter((item) => item.status === 'partial').length
    const missingCount = ingredientCoverage.filter((item) => item.status === 'missing').length
    const coveragePct =
      ingredientCoverage.length === 0
        ? 0
        : Math.round(((readyCount + partialCount * 0.5) / ingredientCoverage.length) * 100)

    picks.push({
      recipeId: recipe.id,
      recipeName: recipe.name,
      category: recipe.category ?? 'other',
      servings: recipe.servings ?? null,
      dietaryTags: recipeDietaryTags,
      timesCooked: recipe.times_cooked ?? 0,
      coveragePct,
      readyCount,
      partialCount,
      missingCount,
      allergyConflicts: [],
      ingredientCoverage,
    })
  }

  picks.sort((a, b) => {
    if (b.coveragePct !== a.coveragePct) return b.coveragePct - a.coveragePct
    if (a.missingCount !== b.missingCount) return a.missingCount - b.missingCount
    return b.timesCooked - a.timesCooked
  })

  return {
    status: picks.length > 0 ? 'ok' : 'empty',
    picks: picks.slice(0, limit),
    dietaryTags,
    allergies,
    filteredOutCount,
  }
}
