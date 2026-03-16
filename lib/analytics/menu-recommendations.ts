'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RecipeHint {
  id: string
  name: string
  category: string
  timesCooked: number
  lastCookedAt: string | null
  dietaryTags: string[]
  reason: 'popular' | 'recent' | 'both'
}

export interface MenuRecommendationResult {
  status: 'ok' | 'insufficient_data'
  recipeCount: number
  hints: RecipeHint[]
  filteredOutCount: number
  allergenWarning: string[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const POPULAR_THRESHOLD = 3
const RECENT_DAYS = 30

// ─── Action ──────────────────────────────────────────────────────────────────

export async function getMenuRecommendations(params: {
  dietaryRestrictions?: string[]
  allergies?: string[]
  limit?: number
}): Promise<MenuRecommendationResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  const allergies = params.allergies ?? []
  const limit = params.limit ?? 20

  // Fetch all active (non-archived) recipes
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, name, category, times_cooked, last_cooked_at, dietary_tags')
    .eq('tenant_id', user.tenantId!)
    .eq('archived', false)
    .order('times_cooked', { ascending: false })

  if (error || !recipes || recipes.length === 0) {
    if (error) console.error('[getMenuRecommendations]', error)
    return empty(allergies)
  }

  // Fetch allergen flags for required ingredients (allergen_flags lives on ingredients table)
  const recipeIds = recipes.map((r) => r.id)
  const { data: recipeIngredients } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id, ingredient:ingredients(allergen_flags)')
    .in('recipe_id', recipeIds)
    .eq('is_optional', false)

  // Build recipe -> allergen set map
  const allergenMap = new Map<string, Set<string>>()
  for (const ri of recipeIngredients ?? []) {
    if (!ri.recipe_id) continue
    const ingredientData = ri.ingredient as unknown as { allergen_flags: string[] } | null
    const flags = ingredientData?.allergen_flags ?? []
    if (!allergenMap.has(ri.recipe_id)) allergenMap.set(ri.recipe_id, new Set())
    for (const flag of flags) allergenMap.get(ri.recipe_id)!.add(flag.toLowerCase())
  }

  // Normalize event allergens
  const eventAllergens = new Set(allergies.map((a) => a.toLowerCase()))

  // Hard filter by allergens
  let filteredOutCount = 0
  const safeRecipes = recipes.filter((r) => {
    if (eventAllergens.size === 0) return true
    const recipeAllergens = allergenMap.get(r.id) ?? new Set()
    const conflict = [...eventAllergens].some((a) => recipeAllergens.has(a))
    if (conflict) {
      filteredOutCount++
      return false
    }
    return true
  })

  if (safeRecipes.length === 0) {
    return empty(allergies, filteredOutCount, recipes.length)
  }

  // Score each recipe
  const now = Date.now()
  const recentMs = RECENT_DAYS * 86_400_000

  const scored = safeRecipes.map((r) => {
    const isPopular = (r.times_cooked ?? 0) >= POPULAR_THRESHOLD
    const isRecent = r.last_cooked_at
      ? now - new Date(r.last_cooked_at).getTime() < recentMs
      : false

    const score = isPopular && isRecent ? 3 : isPopular ? 2 : isRecent ? 1 : 0
    const reason: RecipeHint['reason'] =
      isPopular && isRecent ? 'both' : isPopular ? 'popular' : 'recent'

    return { ...r, score, reason }
  })

  scored.sort((a, b) => b.score - a.score || (b.times_cooked ?? 0) - (a.times_cooked ?? 0))

  const hints: RecipeHint[] = scored.slice(0, limit).map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category ?? 'other',
    timesCooked: r.times_cooked ?? 0,
    lastCookedAt: r.last_cooked_at ?? null,
    dietaryTags: (r.dietary_tags as string[] | null) ?? [],
    reason: r.reason,
  }))

  return {
    status: hints.length > 0 ? 'ok' : 'insufficient_data',
    recipeCount: recipes.length,
    hints,
    filteredOutCount,
    allergenWarning: allergies,
  }
}

function empty(
  allergenWarning: string[],
  filteredOutCount = 0,
  recipeCount = 0
): MenuRecommendationResult {
  return {
    status: 'insufficient_data',
    recipeCount,
    hints: [],
    filteredOutCount,
    allergenWarning,
  }
}
