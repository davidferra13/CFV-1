'use server'

// Server actions for Chef Taste Memory & Preference Learning.
// Records preferences manually, derives affinities and patterns from recipe data.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  TastePreference,
  TasteProfile,
  FlavorAffinity,
  CookingStylePattern,
} from './taste-memory-types'

/**
 * Record or update a taste preference for an ingredient.
 * Upserts: if the ingredient already exists for this tenant, updates rating/notes and bumps frequency.
 */
export async function recordTastePreference(
  ingredient: string,
  rating: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  if (rating < 1 || rating > 5) {
    return { success: false, error: 'Rating must be between 1 and 5' }
  }
  const trimmed = ingredient.trim()
  if (!trimmed) {
    return { success: false, error: 'Ingredient name is required' }
  }

  const db: any = createServerClient()

  // Check if preference already exists
  const { data: existing } = await db
    .from('chef_taste_preferences')
    .select('id, frequency_count')
    .eq('tenant_id', tenantId)
    .eq('ingredient_name', trimmed.toLowerCase())
    .maybeSingle()

  if (existing) {
    // Update existing
    const { error } = await db
      .from('chef_taste_preferences')
      .update({
        rating,
        notes: notes ?? null,
        frequency_count: (existing.frequency_count || 1) + 1,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) return { success: false, error: error.message }
  } else {
    // Insert new
    const { error } = await db
      .from('chef_taste_preferences')
      .insert({
        tenant_id: tenantId,
        ingredient_name: trimmed.toLowerCase(),
        rating,
        notes: notes ?? null,
        frequency_count: 1,
        last_used_at: new Date().toISOString(),
      })

    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get the aggregate taste profile for the current chef.
 * Combines manual preferences, ingredient frequency, affinities, and style patterns.
 */
export async function getTasteProfile(): Promise<TasteProfile> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const [topIngredients, favoriteAffinities, stylePatterns, mostUsed] =
    await Promise.all([
      getTopIngredients(tenantId),
      getFlavorAffinities(10),
      getCookingStylePatterns(),
      getIngredientFrequency(10),
    ])

  return {
    topIngredients,
    favoriteAffinities,
    stylePatterns,
    mostUsed,
    totalEntries: topIngredients.length,
  }
}

/**
 * Get most common ingredient pairings from the chef's recipes.
 * Derived from recipe_ingredients: pairs that appear in the same recipe frequently.
 */
export async function getFlavorAffinities(
  limit: number = 20
): Promise<FlavorAffinity[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const db: any = createServerClient()

  // Self-join recipe_ingredients to find co-occurring ingredients in the same recipe.
  // Join to ingredients table for names, and to recipes for tenant scoping.
  const { data, error } = await db.rpc('get_flavor_affinities', {
    p_tenant_id: tenantId,
    p_limit: limit,
  })

  // If the RPC doesn't exist yet, fall back to a raw query approach
  if (error) {
    // Fallback: get all recipe ingredients for this tenant, compute in JS
    return computeAffinitiesInApp(tenantId, limit)
  }

  return (data || []).map((row: any) => ({
    ingredientA: row.ingredient_a,
    ingredientB: row.ingredient_b,
    coOccurrences: row.co_occurrences,
  }))
}

/**
 * Detect cooking style patterns from recipe/menu history.
 * Analyzes recipe categories, ingredient categories, and technique usage.
 */
export async function getCookingStylePatterns(): Promise<CookingStylePattern[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const db: any = createServerClient()
  const patterns: CookingStylePattern[] = []

  // 1. Cuisine/category tendencies from recipes
  const { data: recipeCats } = await db
    .from('recipes')
    .select('category')
    .eq('tenant_id', tenantId)

  if (recipeCats && recipeCats.length > 0) {
    const catCounts: Record<string, number> = {}
    for (const r of recipeCats) {
      if (r.category) {
        catCounts[r.category] = (catCounts[r.category] || 0) + 1
      }
    }
    const total = recipeCats.length
    for (const [cat, count] of Object.entries(catCounts)) {
      if (count >= 2) {
        patterns.push({
          patternType: 'cuisine_tendency',
          label: cat,
          confidence: count / total,
          supportCount: count,
        })
      }
    }
  }

  // 2. Ingredient category bias from ingredients used in recipes
  const { data: ingredientCats } = await db
    .from('ingredients')
    .select('category')
    .eq('tenant_id', tenantId)

  if (ingredientCats && ingredientCats.length > 0) {
    const catCounts: Record<string, number> = {}
    for (const i of ingredientCats) {
      if (i.category) {
        catCounts[i.category] = (catCounts[i.category] || 0) + 1
      }
    }
    const total = ingredientCats.length
    for (const [cat, count] of Object.entries(catCounts)) {
      if (count >= 3) {
        patterns.push({
          patternType: 'ingredient_category_bias',
          label: cat,
          confidence: count / total,
          supportCount: count,
        })
      }
    }
  }

  // Sort by confidence descending
  patterns.sort((a, b) => b.confidence - a.confidence)

  return patterns
}

/**
 * Get most-used ingredients across all recipes for the current chef.
 * Derived from recipe_ingredients joined to ingredients for names.
 */
export async function getIngredientFrequency(
  limit: number = 20
): Promise<Array<{ ingredientName: string; count: number }>> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const db: any = createServerClient()

  // Get all recipe ingredients with names for this tenant
  const { data: riData } = await db
    .from('recipe_ingredients')
    .select('ingredient_id, ingredients!inner(name, tenant_id)')
    .eq('ingredients.tenant_id', tenantId)

  if (!riData || riData.length === 0) return []

  const counts: Record<string, number> = {}
  for (const ri of riData) {
    const name = ri.ingredients?.name
    if (name) {
      counts[name] = (counts[name] || 0) + 1
    }
  }

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([ingredientName, count]) => ({ ingredientName, count }))
}

/**
 * Update notes on an existing taste preference.
 */
export async function updateTasteNote(
  preferenceId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  if (!preferenceId) {
    return { success: false, error: 'Preference ID is required' }
  }

  const db: any = createServerClient()

  const { error } = await db
    .from('chef_taste_preferences')
    .update({
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', preferenceId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Get top-rated preferences (rating >= 4) for a tenant */
async function getTopIngredients(tenantId: string): Promise<TastePreference[]> {
  const db: any = createServerClient()

  const { data } = await db
    .from('chef_taste_preferences')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('rating', 4)
    .order('rating', { ascending: false })
    .order('frequency_count', { ascending: false })
    .limit(20)

  if (!data) return []

  return data.map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    ingredientName: row.ingredient_name,
    rating: row.rating,
    notes: row.notes,
    frequencyCount: row.frequency_count,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

/**
 * Fallback: compute flavor affinities in JS when the RPC is unavailable.
 * Groups recipe_ingredients by recipe, finds co-occurring ingredient pairs.
 */
async function computeAffinitiesInApp(
  tenantId: string,
  limit: number
): Promise<FlavorAffinity[]> {
  const db: any = createServerClient()

  // Get recipe_ingredients with ingredient names for this tenant
  const { data } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredients!inner(name, tenant_id)')
    .eq('ingredients.tenant_id', tenantId)

  if (!data || data.length === 0) return []

  // Group by recipe
  const byRecipe: Record<string, string[]> = {}
  for (const ri of data) {
    const name = ri.ingredients?.name
    if (!name) continue
    if (!byRecipe[ri.recipe_id]) byRecipe[ri.recipe_id] = []
    byRecipe[ri.recipe_id].push(name)
  }

  // Count co-occurrences
  const pairCounts: Record<string, number> = {}
  for (const ingredients of Object.values(byRecipe)) {
    const sorted = [...new Set(ingredients)].sort()
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]}|||${sorted[j]}`
        pairCounts[key] = (pairCounts[key] || 0) + 1
      }
    }
  }

  return Object.entries(pairCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([key, coOccurrences]) => {
      const [ingredientA, ingredientB] = key.split('|||')
      return { ingredientA, ingredientB, coOccurrences }
    })
}
