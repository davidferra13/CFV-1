'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import pluralize from 'pluralize'

// ============================================
// NAME NORMALIZATION (deterministic, no AI)
// ============================================

const ABBREVIATIONS: Record<string, string> = {
  evoo: 'extra virgin olive oil',
  'ap flour': 'all purpose flour',
  'a.p. flour': 'all purpose flour',
  ap: 'all purpose',
  tbsp: 'tablespoon',
  tsp: 'teaspoon',
  pkg: 'package',
  pkt: 'packet',
  lg: 'large',
  sm: 'small',
  med: 'medium',
  oz: 'ounce',
  lb: 'pound',
  lbs: 'pound',
  qt: 'quart',
  pt: 'pint',
  gal: 'gallon',
}

const ARTICLES = new Set(['a', 'an', 'the', 'of'])

/**
 * Normalize an ingredient name for matching.
 * Deterministic, no AI. Formula > AI.
 */
export function normalizeIngredientName(name: string): string {
  let result = name.trim().toLowerCase()

  // Remove parentheses but keep contents as separate tokens
  result = result.replace(/[()]/g, ' ')

  // Remove common punctuation
  result = result.replace(/[,.'"/]/g, ' ')

  // Collapse hyphens to spaces
  result = result.replace(/-/g, ' ')

  // Collapse multiple spaces
  result = result.replace(/\s+/g, ' ').trim()

  // Expand abbreviations (check multi-word first, then single-word)
  for (const [abbr, expanded] of Object.entries(ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${abbr.replace(/\./g, '\\.')}\\b`, 'gi')
    result = result.replace(regex, expanded)
  }

  // Strip articles
  const tokens = result.split(' ').filter((t) => !ARTICLES.has(t))

  // Depluralize each token using the pluralize library
  const singularTokens = tokens.map((t) => {
    // Skip very short words and words that are already abbreviations
    if (t.length <= 2) return t
    return pluralize.singular(t)
  })

  return singularTokens.join(' ').replace(/\s+/g, ' ').trim()
}

// ============================================
// INGREDIENT MATCHING (pg_trgm)
// ============================================

export interface MatchSuggestion {
  systemIngredientId: string
  name: string
  score: number
  category: string
}

export interface SuggestMatchesResult {
  suggestions: MatchSuggestion[]
  currentAlias: { name: string; confirmedAt: string } | null
}

/**
 * Suggest canonical ingredient matches using pg_trgm similarity.
 */
export async function suggestMatchesAction(ingredientId: string): Promise<SuggestMatchesResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Check for existing alias
  const { data: existingAlias } = await db
    .from('ingredient_aliases')
    .select('system_ingredient_id, confirmed_at, match_method')
    .eq('tenant_id', user.tenantId!)
    .eq('ingredient_id', ingredientId)
    .single()

  let currentAlias: SuggestMatchesResult['currentAlias'] = null
  if (existingAlias?.system_ingredient_id) {
    const { data: si } = await db
      .from('system_ingredients')
      .select('name')
      .eq('id', existingAlias.system_ingredient_id)
      .single()
    if (si) {
      currentAlias = { name: si.name, confirmedAt: existingAlias.confirmed_at }
    }
  } else if (existingAlias?.match_method === 'dismissed') {
    return { suggestions: [], currentAlias: null }
  }

  // Get ingredient name
  const { data: ingredient } = await db
    .from('ingredients')
    .select('name')
    .eq('id', ingredientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!ingredient) return { suggestions: [], currentAlias }

  const normalized = normalizeIngredientName(ingredient.name)
  const suggestions = await suggestIngredientMatches(db, normalized)

  return { suggestions, currentAlias }
}

/**
 * Internal: query system_ingredients using pg_trgm similarity.
 */
async function suggestIngredientMatches(
  db: any,
  normalizedName: string
): Promise<MatchSuggestion[]> {
  try {
    // Use raw SQL for pg_trgm similarity (extensions schema)
    const { data } = await db.rpc('raw_sql', {
      query: `
        SELECT id, name, category,
               extensions.similarity(lower(name), $1) AS score
        FROM system_ingredients
        WHERE extensions.similarity(lower(name), $1) > 0.3
          AND is_active = true
        ORDER BY score DESC
        LIMIT 5
      `,
      params: [normalizedName],
    })

    if (!data) return []

    return data.map((row: any) => ({
      systemIngredientId: row.id,
      name: row.name,
      score: parseFloat(row.score),
      category: row.category,
    }))
  } catch (err) {
    console.error('[suggestIngredientMatches] Error:', err)
    return []
  }
}

// ============================================
// CONFIRM / DISMISS MATCH
// ============================================

/**
 * Confirm an ingredient-to-canonical match.
 * Copies density data from system_ingredient if missing on chef's ingredient.
 */
export async function confirmMatchAction(
  ingredientId: string,
  systemIngredientId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get system ingredient data for density copy
  const { data: si } = await db
    .from('system_ingredients')
    .select('weight_to_volume_ratio, cup_weight_grams, common_prep_actions')
    .eq('id', systemIngredientId)
    .single()

  if (!si) return { success: false, error: 'System ingredient not found' }

  // Upsert alias (UNIQUE on tenant_id + ingredient_id)
  const { error: aliasError } = await db.rpc('raw_sql', {
    query: `
      INSERT INTO ingredient_aliases (tenant_id, ingredient_id, system_ingredient_id, match_method, confirmed_at)
      VALUES ($1, $2, $3, 'trigram', now())
      ON CONFLICT (tenant_id, ingredient_id)
      DO UPDATE SET system_ingredient_id = $3, match_method = 'trigram', confirmed_at = now()
    `,
    params: [user.tenantId!, ingredientId, systemIngredientId],
  })

  if (aliasError) {
    console.error('[confirmMatch] Alias upsert failed:', aliasError)
    return { success: false, error: 'Failed to save match' }
  }

  // Copy density data to chef's ingredient if missing
  const { data: ingredient } = await db
    .from('ingredients')
    .select('weight_to_volume_ratio')
    .eq('id', ingredientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (ingredient && !ingredient.weight_to_volume_ratio && si.weight_to_volume_ratio) {
    await db
      .from('ingredients')
      .update({ weight_to_volume_ratio: si.weight_to_volume_ratio } as any)
      .eq('id', ingredientId)
      .eq('tenant_id', user.tenantId!)
  }

  // Trigger cost refresh for this ingredient
  try {
    const { refreshIngredientCostsAction } = await import('@/lib/pricing/cost-refresh-actions')
    await refreshIngredientCostsAction([ingredientId])
  } catch (err) {
    console.error('[confirmMatch] Cost refresh failed (non-blocking):', err)
  }

  revalidatePath('/culinary/costing')
  return { success: true }
}

/**
 * Dismiss all suggestions for an ingredient (don't ask again).
 */
export async function dismissMatchAction(ingredientId: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db.rpc('raw_sql', {
    query: `
      INSERT INTO ingredient_aliases (tenant_id, ingredient_id, system_ingredient_id, match_method, confirmed_at)
      VALUES ($1, $2, NULL, 'dismissed', now())
      ON CONFLICT (tenant_id, ingredient_id)
      DO UPDATE SET system_ingredient_id = NULL, match_method = 'dismissed', confirmed_at = now()
    `,
    params: [user.tenantId!, ingredientId],
  })

  if (error) {
    console.error('[dismissMatch] Error:', error)
    return { success: false }
  }

  revalidatePath('/culinary/costing')
  return { success: true }
}

// ============================================
// GET UNMATCHED INGREDIENTS
// ============================================

export interface UnmatchedIngredient {
  id: string
  name: string
  category: string | null
  suggestions: MatchSuggestion[]
}

/**
 * Get all ingredients that don't have a confirmed or dismissed alias.
 */
export async function getUnmatchedIngredientsAction(): Promise<UnmatchedIngredient[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all ingredient IDs that have aliases (confirmed or dismissed)
  const { data: aliasRows } = await db
    .from('ingredient_aliases')
    .select('ingredient_id')
    .eq('tenant_id', user.tenantId!)

  const aliasedIds = new Set((aliasRows ?? []).map((r: any) => r.ingredient_id))

  // Get active ingredients used in recipes
  const { data: riRows } = await db.from('recipe_ingredients').select('ingredient_id')

  const recipeIngredientIds = new Set((riRows ?? []).map((r: any) => r.ingredient_id))

  // Get ingredient details for unmatched ones
  const { data: ingredients } = await db
    .from('ingredients')
    .select('id, name, category')
    .eq('tenant_id', user.tenantId!)
    .eq('archived', false)

  if (!ingredients) return []

  const unmatched = ingredients.filter(
    (ing: any) => recipeIngredientIds.has(ing.id) && !aliasedIds.has(ing.id)
  )

  // Get suggestions for each (limit to first 20 for perf)
  const results: UnmatchedIngredient[] = []
  for (const ing of unmatched.slice(0, 50)) {
    const normalized = normalizeIngredientName(ing.name)
    const suggestions = await suggestIngredientMatches(db, normalized)
    results.push({
      id: ing.id,
      name: ing.name,
      category: ing.category,
      suggestions,
    })
  }

  return results
}
