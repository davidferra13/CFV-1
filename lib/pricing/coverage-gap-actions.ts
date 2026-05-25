'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  type FreshnessState,
  getCategoryFromIngredient,
  computeCategoryFreshness,
  getAgeDays,
} from './freshness'

export interface GapItem {
  ingredientId: string
  name: string
  category: string | null
  recipeCount: number
  lastPrice: number | null
  lastPriceAge: number | null
  freshnessState: FreshnessState
  suggestedAction: string
}

export interface CoverageGapDashboard {
  total: number
  covered: number
  coveragePct: number
  bySource: Record<string, number>
  byFreshness: Record<FreshnessState, number>
  gaps: GapItem[]
}

export async function getCoverageGapDashboard(): Promise<CoverageGapDashboard> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: activeIngredients } = await db
    .from('ingredients')
    .select(
      'id, name, category, cost_per_unit_cents, last_price_source, last_price_date, pinned_price_cents, pinned_price_expires_at'
    )
    .eq('tenant_id', tenantId)

  if (!activeIngredients || activeIngredients.length === 0) {
    return {
      total: 0,
      covered: 0,
      coveragePct: 0,
      bySource: {},
      byFreshness: { fresh: 0, aging: 0, stale: 0, expired: 0 },
      gaps: [],
    }
  }

  const { data: usageRows } = await db
    .from('recipe_ingredients')
    .select('ingredient_id')
    .eq('tenant_id', tenantId)

  const usageCount = new Map<string, number>()
  if (usageRows) {
    for (const row of usageRows) {
      const id = row.ingredient_id
      if (id) usageCount.set(id, (usageCount.get(id) || 0) + 1)
    }
  }

  const activeWithUsage = activeIngredients.filter((i: any) => usageCount.has(i.id))

  const total = activeWithUsage.length
  const bySource: Record<string, number> = {}
  const byFreshness: Record<FreshnessState, number> = { fresh: 0, aging: 0, stale: 0, expired: 0 }
  const gaps: GapItem[] = []
  let covered = 0

  for (const ing of activeWithUsage) {
    const cat = getCategoryFromIngredient(ing.category)
    const freshness = computeCategoryFreshness(ing.last_price_date, cat)
    byFreshness[freshness]++

    const hasPinnedPrice =
      ing.pinned_price_cents &&
      ing.pinned_price_cents > 0 &&
      (!ing.pinned_price_expires_at || new Date(ing.pinned_price_expires_at) > new Date())

    const hasValidPrice =
      (ing.cost_per_unit_cents && ing.cost_per_unit_cents > 0 && freshness !== 'expired') ||
      hasPinnedPrice

    if (hasValidPrice) {
      covered++
      const src = ing.last_price_source || 'unknown'
      bySource[src] = (bySource[src] || 0) + 1
    } else {
      const ageDays = getAgeDays(ing.last_price_date)
      let suggestedAction = 'Pin a price'
      if (ing.cost_per_unit_cents && freshness === 'expired') {
        suggestedAction = 'Verify and re-pin'
      } else if (!ing.cost_per_unit_cents) {
        suggestedAction = 'Log a receipt or pin a price'
      }

      gaps.push({
        ingredientId: ing.id,
        name: ing.name,
        category: ing.category,
        recipeCount: usageCount.get(ing.id) || 0,
        lastPrice: ing.cost_per_unit_cents || null,
        lastPriceAge: ing.last_price_date ? ageDays : null,
        freshnessState: freshness,
        suggestedAction,
      })
    }
  }

  gaps.sort((a, b) => b.recipeCount - a.recipeCount)

  return {
    total,
    covered,
    coveragePct: total > 0 ? Math.round((covered / total) * 100) : 0,
    bySource,
    byFreshness,
    gaps,
  }
}
