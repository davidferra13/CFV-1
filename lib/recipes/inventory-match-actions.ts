'use server'

// Inventory-to-Menu Match
// Given a chef's ingredient inventory, finds recipes ranked by how many
// of their ingredients the chef already has on hand.
// Formula > AI: pure set intersection, no LLM.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type RecipeMatch = {
  recipeId: string
  recipeName: string
  totalIngredients: number
  matchedIngredients: string[]
  missingIngredients: string[]
  matchPct: number
  servings: number | null
}

export type InventoryMatchResult = {
  success: boolean
  matches: RecipeMatch[]
  totalRecipes: number
  inventorySize: number
  error?: string
}

export async function getInventoryMatches(): Promise<InventoryMatchResult> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // 1. Get all chef's ingredients (the pantry)
  const { data: ingredients } = await db
    .from('ingredients')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('archived', false)

  if (!ingredients?.length) {
    return {
      success: true,
      matches: [],
      totalRecipes: 0,
      inventorySize: 0,
      error: 'No ingredients in your inventory yet',
    }
  }

  // Build normalized name set for matching
  const inventoryNames = new Set(ingredients.map((i: any) => i.name.toLowerCase().trim()))
  const inventoryIds = new Set(ingredients.map((i: any) => i.id))

  // 2. Get all recipes
  const { data: recipes } = await db
    .from('recipes')
    .select('id, name, servings')
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)

  if (!recipes?.length) {
    return {
      success: true,
      matches: [],
      totalRecipes: 0,
      inventorySize: inventoryNames.size,
      error: 'No recipes in your recipe book yet',
    }
  }

  // 3. Get all recipe_ingredients with ingredient names
  const recipeIds = recipes.map((r: any) => r.id)
  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, ingredient:ingredients(id, name)')
    .in('recipe_id', recipeIds)

  // Group by recipe
  const recipeIngMap = new Map<string, { id: string; name: string; ingredientId: string }[]>()
  for (const ri of recipeIngredients ?? []) {
    const ingName = (ri as any).ingredient?.name
    const ingId = (ri as any).ingredient?.id || ri.ingredient_id
    if (!ingName) continue
    if (!recipeIngMap.has(ri.recipe_id)) {
      recipeIngMap.set(ri.recipe_id, [])
    }
    recipeIngMap.get(ri.recipe_id)!.push({ id: ingId, name: ingName, ingredientId: ingId })
  }

  // 4. Score each recipe
  const matches: RecipeMatch[] = []

  for (const recipe of recipes) {
    const ings = recipeIngMap.get(recipe.id) || []
    if (ings.length === 0) continue // skip recipes with no ingredients

    const matched: string[] = []
    const missing: string[] = []

    for (const ing of ings) {
      if (inventoryIds.has(ing.ingredientId) || inventoryNames.has(ing.name.toLowerCase().trim())) {
        matched.push(ing.name)
      } else {
        missing.push(ing.name)
      }
    }

    const matchPct = Math.round((matched.length / ings.length) * 100)

    matches.push({
      recipeId: recipe.id,
      recipeName: recipe.name,
      totalIngredients: ings.length,
      matchedIngredients: matched,
      missingIngredients: missing,
      matchPct,
      servings: recipe.servings,
    })
  }

  // Sort: highest match % first, then by fewest missing
  matches.sort((a, b) => {
    if (b.matchPct !== a.matchPct) return b.matchPct - a.matchPct
    return a.missingIngredients.length - b.missingIngredients.length
  })

  return {
    success: true,
    matches,
    totalRecipes: recipes.length,
    inventorySize: inventoryNames.size,
  }
}
