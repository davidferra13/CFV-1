'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type IngredientPairing = {
  ingredientA: string
  ingredientB: string
  recipeCount: number
}

export async function getTopIngredientPairings(limit: number = 10): Promise<IngredientPairing[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    // Get all non-archived recipe IDs for this tenant
    const { data: recipes } = await db
      .from('recipes')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .is('archived_at', null)

    if (!recipes || recipes.length === 0) return []
    const recipeIds = recipes.map((r: any) => r.id)

    // Get all recipe_ingredients rows for those recipes
    const { data: riRows } = await db
      .from('recipe_ingredients')
      .select('recipe_id, ingredient_id')
      .in('recipe_id', recipeIds)

    if (!riRows || riRows.length === 0) return []

    // Get ingredient names
    const ingredientIds = [...new Set(riRows.map((r: any) => r.ingredient_id))]
    const { data: ingredients } = await db
      .from('ingredients')
      .select('id, name')
      .in('id', ingredientIds)

    if (!ingredients) return []
    const nameMap = new Map<string, string>(ingredients.map((i: any) => [i.id, i.name]))

    // Group ingredients by recipe
    const recipeIngMap = new Map<string, string[]>()
    for (const row of riRows) {
      const list = recipeIngMap.get(row.recipe_id) ?? []
      list.push(row.ingredient_id)
      recipeIngMap.set(row.recipe_id, list)
    }

    // Build co-occurrence counts (sort IDs to avoid A+B / B+A dupes)
    const pairCounts = new Map<string, number>()
    for (const [, ingIds] of recipeIngMap) {
      const sorted = [...ingIds].sort()
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const key = `${sorted[i]}|${sorted[j]}`
          pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
        }
      }
    }

    // Filter >= 2, sort descending, take top N
    const pairs = [...pairCounts.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, count]) => {
        const [idA, idB] = key.split('|')
        return {
          ingredientA: nameMap.get(idA) ?? 'Unknown',
          ingredientB: nameMap.get(idB) ?? 'Unknown',
          recipeCount: count,
        }
      })

    return pairs
  } catch (err) {
    console.error('[getTopIngredientPairings]', err)
    return []
  }
}
