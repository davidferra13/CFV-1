// Completion Evaluator - Recipe
// NEW logic: evaluates recipe completeness from fields + ingredient pricing.
// This is the only evaluator with genuinely new evaluation logic (not wrapping existing).

import { pgClient } from '@/lib/db/index'
import type { CompletionRequirement } from '../types'
import { buildResult, type CompletionResult } from '../types'

interface RecipeRow {
  id: string
  name: string | null
  method: string | null
  yield_quantity: string | null
  yield_unit: string | null
  prep_time_minutes: string | null
  cook_time_minutes: string | null
  category: string | null
  dietary_tags: string[] | null
  peak_hours_min: number | null
  peak_hours_max: number | null
}

interface IngredientStats {
  total: string
  priced: string
  fresh: string
}

export async function evaluateRecipe(
  recipeId: string,
  tenantId: string
): Promise<CompletionResult | null> {
  const [recipe] = await pgClient<RecipeRow[]>`
    SELECT id, name, method, yield_quantity, yield_unit,
           prep_time_minutes, cook_time_minutes, category, dietary_tags,
           peak_hours_min, peak_hours_max
    FROM recipes
    WHERE id = ${recipeId} AND tenant_id = ${tenantId}
  `
  if (!recipe) return null

  // Batch ingredient stats in one query
  const [stats] = await pgClient<IngredientStats[]>`
    SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE i.last_price_cents IS NOT NULL)::text AS priced,
      COUNT(*) FILTER (
        WHERE i.last_price_date IS NOT NULL
          AND i.last_price_date >= (CURRENT_DATE - INTERVAL '90 days')
      )::text AS fresh
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = ${recipeId}
  `

  const total = Number(stats?.total || 0)
  const priced = Number(stats?.priced || 0)
  const fresh = Number(stats?.fresh || 0)
  const editUrl = `/recipes/${recipeId}/edit`

  const reqs: CompletionRequirement[] = [
    {
      key: 'name',
      label: 'Has name',
      met: !!recipe.name && recipe.name.trim().length > 0,
      blocking: true,
      weight: 5,
      category: 'culinary',
    },
    {
      key: 'method',
      label: 'Has instructions',
      met: !!recipe.method && recipe.method.trim().length > 0,
      blocking: false,
      weight: 18,
      category: 'culinary',
      actionUrl: editUrl,
      actionLabel: 'Add instructions',
    },
    {
      key: 'yield',
      label: 'Has yield (quantity + unit)',
      met:
        Number(recipe.yield_quantity) > 0 &&
        !!recipe.yield_unit &&
        recipe.yield_unit.trim().length > 0,
      blocking: false,
      weight: 14,
      category: 'culinary',
      actionUrl: editUrl,
      actionLabel: 'Set yield',
    },
    {
      key: 'has_ingredients',
      label: 'Has at least 1 ingredient',
      met: total > 0,
      blocking: false,
      weight: 14,
      category: 'culinary',
      actionUrl: editUrl,
      actionLabel: 'Add ingredients',
    },
    {
      key: 'all_priced',
      label: 'All ingredients priced',
      met: total > 0 && priced === total,
      blocking: false,
      weight: 14,
      category: 'financial',
      actionUrl: `/culinary/price-catalog`,
      actionLabel: 'Review prices',
    },
    {
      key: 'prices_fresh',
      label: 'No stale prices (< 90 days)',
      met: total > 0 && fresh === total,
      blocking: false,
      weight: 10,
      category: 'financial',
      actionUrl: `/culinary/price-catalog`,
      actionLabel: 'Update stale prices',
    },
    {
      key: 'timing',
      label: 'Has timing (prep or cook)',
      met: Number(recipe.prep_time_minutes) > 0 || Number(recipe.cook_time_minutes) > 0,
      blocking: false,
      weight: 10,
      category: 'culinary',
      actionUrl: editUrl,
      actionLabel: 'Set timing',
    },
    {
      key: 'category',
      label: 'Has category',
      met: !!recipe.category && recipe.category.trim().length > 0,
      blocking: false,
      weight: 5,
      category: 'culinary',
      actionUrl: editUrl,
      actionLabel: 'Set category',
    },
    {
      key: 'dietary_tags',
      label: 'Has dietary tags',
      met: Array.isArray(recipe.dietary_tags) && recipe.dietary_tags.length > 0,
      blocking: false,
      weight: 5,
      category: 'culinary',
      actionUrl: editUrl,
      actionLabel: 'Add dietary tags',
    },
    {
      key: 'peak_window',
      label: 'Has peak freshness window',
      met: recipe.peak_hours_min != null && recipe.peak_hours_max != null,
      blocking: false,
      weight: 5,
      category: 'culinary',
      actionUrl: editUrl,
      actionLabel: 'Set peak window',
    },
  ]

  return buildResult('recipe', recipeId, reqs, {
    entityLabel: recipe.name || 'Unnamed recipe',
  })
}
