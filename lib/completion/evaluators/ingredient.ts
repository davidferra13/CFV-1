// Completion Evaluator - Ingredient
// Evaluates standalone ingredient completeness from field presence + pricing.

import { pgClient } from '@/lib/db/index'
import type { CompletionRequirement } from '../types'
import { buildResult, type CompletionResult } from '../types'

interface IngredientRow {
  id: string
  name: string | null
  category: string | null
  default_unit: string | null
  last_price_cents: string | null
  last_price_date: string | null
  allergen_flags: string[] | null
  dietary_tags: string[] | null
}

export async function evaluateIngredient(
  ingredientId: string,
  tenantId: string
): Promise<CompletionResult | null> {
  const [row] = await pgClient<IngredientRow[]>`
    SELECT id, name, category, default_unit,
           last_price_cents, last_price_date,
           allergen_flags, dietary_tags
    FROM ingredients
    WHERE id = ${ingredientId} AND tenant_id = ${tenantId}
  `
  if (!row) return null

  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const priceDate = row.last_price_date ? new Date(row.last_price_date) : null
  const priceFresh = priceDate ? priceDate >= ninetyDaysAgo : false

  const url = `/culinary/ingredients`

  const reqs: CompletionRequirement[] = [
    {
      key: 'name',
      label: 'Has name',
      met: !!row.name && row.name.trim().length > 0,
      blocking: true,
      weight: 10,
      category: 'culinary',
    },
    {
      key: 'category',
      label: 'Has category',
      met: !!row.category && row.category.trim().length > 0,
      blocking: false,
      weight: 10,
      category: 'culinary',
      actionUrl: url,
      actionLabel: 'Set category',
    },
    {
      key: 'default_unit',
      label: 'Has default unit',
      met: !!row.default_unit && row.default_unit.trim().length > 0,
      blocking: false,
      weight: 10,
      category: 'culinary',
      actionUrl: url,
      actionLabel: 'Set unit',
    },
    {
      key: 'has_price',
      label: 'Has price data',
      met: row.last_price_cents !== null,
      blocking: false,
      weight: 25,
      category: 'financial',
      actionUrl: `/culinary/price-catalog`,
      actionLabel: 'Add price',
    },
    {
      key: 'price_fresh',
      label: 'Price is fresh (< 90 days)',
      met: priceFresh,
      blocking: false,
      weight: 20,
      category: 'financial',
      actionUrl: `/culinary/price-catalog`,
      actionLabel: 'Update price',
    },
    {
      key: 'allergen_flags',
      label: 'Allergen flags reviewed',
      met: Array.isArray(row.allergen_flags),
      blocking: false,
      weight: 15,
      category: 'safety',
      actionUrl: url,
      actionLabel: 'Review allergens',
    },
    {
      key: 'dietary_tags',
      label: 'Has dietary tags',
      met: Array.isArray(row.dietary_tags) && row.dietary_tags.length > 0,
      blocking: false,
      weight: 10,
      category: 'culinary',
      actionUrl: url,
      actionLabel: 'Add dietary tags',
    },
  ]

  return buildResult('ingredient', ingredientId, reqs, {
    entityLabel: row.name || 'Unnamed ingredient',
  })
}
