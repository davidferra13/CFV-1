// Completion Evaluator - Menu
// Wraps getMenuHealthData() + recursive recipe evaluation.
// Batch queries per level to avoid N+1.

import { pgClient } from '@/lib/db/index'
import { getMenuHealthData } from '@/lib/menus/actions'
import { evaluateRecipe } from './recipe'
import type { CompletionRequirement } from '../types'
import { buildResult, type CompletionResult } from '../types'

interface ComponentRow {
  recipe_id: string | null
  recipe_name: string | null
}

export async function evaluateMenu(
  menuId: string,
  tenantId: string,
  opts?: { shallow?: boolean }
): Promise<CompletionResult | null> {
  let health
  try {
    health = await getMenuHealthData(menuId)
  } catch {
    return null
  }

  // Fetch all components with recipe linkage in one batch
  const components = await pgClient<ComponentRow[]>`
    SELECT c.recipe_id, r.name AS recipe_name
    FROM dishes d
    JOIN components c ON c.dish_id = d.id
    LEFT JOIN recipes r ON r.id = c.recipe_id
    WHERE d.menu_id = ${menuId}
  `

  const totalComponents = components.length
  const withRecipes = components.filter((c) => c.recipe_id !== null)
  const allHaveRecipes = totalComponents > 0 && withRecipes.length === totalComponents

  // Check for dishes with zero components
  const [emptyDishCheck] = await pgClient<{ empty_count: string }[]>`
    SELECT COUNT(*)::text AS empty_count
    FROM dishes d
    WHERE d.menu_id = ${menuId}
      AND NOT EXISTS (
        SELECT 1 FROM components c WHERE c.dish_id = d.id
      )
  `
  const allDishesHaveComponents =
    health.dishCount > 0 && Number(emptyDishCheck?.empty_count || 0) === 0

  // Batch recipe evaluation (only if not shallow)
  let recipeResults: CompletionResult[] = []
  let allRecipesComplete = true
  if (!opts?.shallow && withRecipes.length > 0) {
    const uniqueRecipeIds = [...new Set(withRecipes.map((c) => c.recipe_id!))]
    const results = await Promise.all(uniqueRecipeIds.map((rid) => evaluateRecipe(rid, tenantId)))
    recipeResults = results.filter((r): r is CompletionResult => r !== null)
    allRecipesComplete = recipeResults.every((r) => r.score >= 80)
  } else if (opts?.shallow) {
    // Shallow: check via recipe_cost_summary view
    const [costCheck] = await pgClient<{ all_good: string }[]>`
      SELECT COUNT(*) FILTER (WHERE rcs.has_all_prices = false)::text AS all_good
      FROM components c
      JOIN dishes d ON d.id = c.dish_id
      JOIN recipe_cost_summary rcs ON rcs.recipe_id = c.recipe_id
      WHERE d.menu_id = ${menuId} AND c.recipe_id IS NOT NULL
    `
    allRecipesComplete = Number(costCheck?.all_good || 0) === 0
  }

  const menuUrl = `/menus/${menuId}`

  const reqs: CompletionRequirement[] = [
    {
      key: 'has_dishes',
      label: 'Has at least 1 dish',
      met: health.dishCount > 0,
      blocking: true,
      weight: 10,
      category: 'culinary',
      actionUrl: menuUrl,
      actionLabel: 'Add dishes',
    },
    {
      key: 'all_dishes_have_components',
      label: 'All dishes have components',
      met: allDishesHaveComponents,
      blocking: false,
      weight: 10,
      category: 'culinary',
      actionUrl: menuUrl,
      actionLabel: 'Add components to dishes',
    },
    {
      key: 'all_components_reciped',
      label: 'All components have recipes',
      met: allHaveRecipes,
      blocking: false,
      weight: 15,
      category: 'culinary',
      actionUrl: menuUrl,
      actionLabel: 'Link recipes',
    },
    {
      key: 'recipes_complete',
      label: 'All recipes complete (score >= 80)',
      met: allRecipesComplete,
      blocking: false,
      weight: 15,
      category: 'culinary',
    },
    {
      key: 'all_priced',
      label: 'All ingredients priced',
      met: health.dishesWithGaps === 0 && health.dishCount > 0,
      blocking: false,
      weight: 15,
      category: 'financial',
      actionUrl: `/culinary/price-catalog`,
      actionLabel: 'Review prices',
    },
    {
      key: 'allergens_reviewed',
      label: 'Allergens reviewed',
      met: health.allergenReviewed,
      blocking: false,
      weight: 10,
      category: 'safety',
      actionUrl: menuUrl,
      actionLabel: 'Review allergens',
    },
    {
      key: 'not_draft',
      label: 'Menu not in draft',
      met: health.menuStatus !== 'draft',
      blocking: false,
      weight: 5,
      category: 'logistics',
    },
    {
      key: 'linked_to_event',
      label: 'Linked to event',
      met: health.hasEvent,
      blocking: false,
      weight: 5,
      category: 'logistics',
    },
    {
      key: 'client_approved',
      label: 'Client approved',
      met: health.approvalStatus === 'approved',
      blocking: false,
      weight: 15,
      category: 'communication',
    },
  ]

  return buildResult('menu', menuId, reqs, {
    entityLabel: `Menu (${health.dishCount} dishes)`,
    children: recipeResults.length > 0 ? recipeResults : undefined,
  })
}
