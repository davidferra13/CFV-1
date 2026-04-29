'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'
import { findDictionaryAliasSuggestions } from '@/lib/culinary-dictionary/queries'
import { normalizeIngredientName, type MatchSuggestion } from './ingredient-matching-utils'
import type {
  CostingRepairGroup,
  CostingRepairIngredient,
  CostingRepairSummary,
  IngredientHealthStats,
  IngredientHealthSummary,
  PendingMatch,
  UnresolvedIngredient,
} from './ingredient-health-types'

// ============================================
// MAIN ACTION
// ============================================

/**
 * Get full ingredient health summary for a chef.
 * Returns normalization stats, pending auto-matches needing review,
 * and completely unmatched ingredients with suggestions.
 */
export async function getIngredientHealthAction(): Promise<IngredientHealthSummary> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const stalePriceDays = 30

  // Single query to get all stats + pending matches + unmatched ingredients
  const [
    statsRows,
    pendingRows,
    unmatchedRows,
    missingPriceRows,
    stalePriceRows,
    missingDensityRows,
    missingYieldRows,
  ] = await Promise.all([
    // Stats: count by alias status
    pgClient`
      SELECT
        COUNT(DISTINCT i.id)::int AS total,
        COUNT(DISTINCT CASE
          WHEN ia.system_ingredient_id IS NOT NULL AND ia.confirmed_at IS NOT NULL AND ia.match_method != 'dismissed'
          THEN i.id
        END)::int AS confirmed,
        COUNT(DISTINCT CASE
          WHEN ia.system_ingredient_id IS NOT NULL AND ia.confirmed_at IS NULL AND ia.match_method != 'dismissed'
          THEN i.id
        END)::int AS pending,
        COUNT(DISTINCT CASE
          WHEN ia.id IS NULL
          THEN i.id
        END)::int AS unmatched,
        COUNT(DISTINCT CASE
          WHEN ia.match_method = 'dismissed'
          THEN i.id
        END)::int AS dismissed
      FROM ingredients i
      LEFT JOIN ingredient_aliases ia ON ia.ingredient_id = i.id AND ia.tenant_id = i.tenant_id
      WHERE i.tenant_id = ${tenantId}
        AND i.archived = false
    `,

    // Pending auto-matches: have alias but not confirmed
    pgClient`
      SELECT
        i.id AS ingredient_id,
        i.name AS ingredient_name,
        i.category,
        ia.system_ingredient_id,
        si.name AS system_ingredient_name,
        ia.similarity_score,
        ia.match_method
      FROM ingredients i
      JOIN ingredient_aliases ia ON ia.ingredient_id = i.id AND ia.tenant_id = i.tenant_id
      JOIN system_ingredients si ON si.id = ia.system_ingredient_id
      WHERE i.tenant_id = ${tenantId}
        AND i.archived = false
        AND ia.confirmed_at IS NULL
        AND ia.system_ingredient_id IS NOT NULL
        AND ia.match_method != 'dismissed'
      ORDER BY ia.similarity_score DESC
      LIMIT 100
    `,

    // Completely unmatched: no alias record at all
    pgClient`
      SELECT i.id, i.name, i.category
      FROM ingredients i
      LEFT JOIN ingredient_aliases ia ON ia.ingredient_id = i.id AND ia.tenant_id = i.tenant_id
      WHERE i.tenant_id = ${tenantId}
        AND i.archived = false
        AND ia.id IS NULL
      ORDER BY i.name
      LIMIT 50
    `,

    pgClient`
      SELECT
        COUNT(*) OVER()::int AS total_count,
        i.id AS ingredient_id,
        i.name AS ingredient_name,
        i.category,
        COALESCE(i.default_unit, i.price_unit, 'unit') AS unit
      FROM ingredients i
      WHERE i.tenant_id = ${tenantId}
        AND i.archived = false
        AND (
          COALESCE(i.cost_per_unit_cents, i.last_price_cents, i.average_price_cents) IS NULL
          OR COALESCE(i.cost_per_unit_cents, i.last_price_cents, i.average_price_cents) <= 0
        )
      ORDER BY i.name
      LIMIT 6
    `,

    pgClient`
      SELECT
        COUNT(*) OVER()::int AS total_count,
        i.id AS ingredient_id,
        i.name AS ingredient_name,
        i.category,
        i.last_price_date,
        CASE
          WHEN i.last_price_date IS NULL THEN NULL
          ELSE (CURRENT_DATE - i.last_price_date)::int
        END AS days_since_price
      FROM ingredients i
      WHERE i.tenant_id = ${tenantId}
        AND i.archived = false
        AND COALESCE(i.cost_per_unit_cents, i.last_price_cents, i.average_price_cents) IS NOT NULL
        AND COALESCE(i.cost_per_unit_cents, i.last_price_cents, i.average_price_cents) > 0
        AND (
          i.last_price_date IS NULL
          OR i.last_price_date < CURRENT_DATE - (${stalePriceDays}::int * INTERVAL '1 day')
        )
      ORDER BY i.last_price_date ASC NULLS FIRST, i.name
      LIMIT 6
    `,

    pgClient`
      WITH density_blockers AS (
        SELECT DISTINCT
          i.id AS ingredient_id,
          i.name AS ingredient_name,
          i.category,
          ri.unit AS recipe_unit,
          COALESCE(NULLIF(i.price_unit, ''), NULLIF(i.default_unit, ''), 'unit') AS cost_unit
        FROM recipe_ingredients ri
        JOIN recipes r ON r.id = ri.recipe_id
        JOIN ingredients i ON i.id = ri.ingredient_id AND i.tenant_id = r.tenant_id
        WHERE r.tenant_id = ${tenantId}
          AND i.tenant_id = ${tenantId}
          AND r.archived = false
          AND i.archived = false
          AND i.weight_to_volume_ratio IS NULL
          AND (
            (
              lower(trim(ri.unit)) IN ('cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons', 'ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters', 'qt', 'quart', 'quarts', 'gal', 'gallon', 'gallons', 'fl oz', 'fluid ounce', 'fluid ounces')
              AND lower(trim(COALESCE(NULLIF(i.price_unit, ''), NULLIF(i.default_unit, ''), 'unit'))) IN ('oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds', 'g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms')
            )
            OR
            (
              lower(trim(ri.unit)) IN ('oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds', 'g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms')
              AND lower(trim(COALESCE(NULLIF(i.price_unit, ''), NULLIF(i.default_unit, ''), 'unit'))) IN ('cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons', 'ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters', 'qt', 'quart', 'quarts', 'gal', 'gallon', 'gallons', 'fl oz', 'fluid ounce', 'fluid ounces')
            )
          )
      )
      SELECT
        COUNT(*) OVER()::int AS total_count,
        ingredient_id,
        ingredient_name,
        category,
        recipe_unit,
        cost_unit
      FROM density_blockers
      ORDER BY ingredient_name
      LIMIT 6
    `,

    pgClient`
      WITH yield_blockers AS (
        SELECT DISTINCT
          i.id AS ingredient_id,
          i.name AS ingredient_name,
          i.category
        FROM recipe_ingredients ri
        JOIN recipes r ON r.id = ri.recipe_id
        JOIN ingredients i ON i.id = ri.ingredient_id AND i.tenant_id = r.tenant_id
        WHERE r.tenant_id = ${tenantId}
          AND i.tenant_id = ${tenantId}
          AND r.archived = false
          AND i.archived = false
          AND ri.yield_pct IS NULL
          AND i.default_yield_pct IS NULL
      )
      SELECT
        COUNT(*) OVER()::int AS total_count,
        ingredient_id,
        ingredient_name,
        category
      FROM yield_blockers
      ORDER BY ingredient_name
      LIMIT 6
    `,
  ])

  const stats: IngredientHealthStats = {
    total: statsRows[0]?.total ?? 0,
    confirmed: statsRows[0]?.confirmed ?? 0,
    pending: statsRows[0]?.pending ?? 0,
    unmatched: statsRows[0]?.unmatched ?? 0,
    dismissed: statsRows[0]?.dismissed ?? 0,
    coveragePct: null,
  }

  // Coverage = (confirmed + dismissed) / total
  // Dismissed counts as "resolved" because the chef made a decision
  if (stats.total > 0) {
    stats.coveragePct = Math.round(((stats.confirmed + stats.dismissed) / stats.total) * 100)
  }

  const pendingMatches: PendingMatch[] = (pendingRows ?? []).map((row: any) => ({
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient_name,
    category: row.category,
    systemIngredientId: row.system_ingredient_id,
    systemIngredientName: row.system_ingredient_name,
    similarityScore: parseFloat(row.similarity_score) || 0,
    matchMethod: row.match_method,
  }))

  // For completely unmatched ingredients, fetch suggestions via pg_trgm
  const unresolvedIngredients: UnresolvedIngredient[] = []
  for (const row of (unmatchedRows ?? []).slice(0, 30)) {
    const normalized = normalizeIngredientName(row.name)
    let suggestions: MatchSuggestion[] = []

    try {
      const matchRows = await pgClient`
        SELECT id, name, category,
               extensions.similarity(lower(name), ${normalized}) AS score
        FROM system_ingredients
        WHERE extensions.similarity(lower(name), ${normalized}) > 0.3
          AND is_active = true
        ORDER BY score DESC
        LIMIT 5
      `
      suggestions = (matchRows ?? []).map((m: any) => ({
        systemIngredientId: m.id,
        name: m.name,
        score: parseFloat(m.score),
        category: m.category,
        source: 'trigram',
      }))
    } catch {
      // pg_trgm might not be available
    }

    if (suggestions.length === 0) {
      const dictionaryAliases = await findDictionaryAliasSuggestions(normalized, 2).catch(() => [])
      for (const alias of dictionaryAliases) {
        try {
          const dictionaryRows = await pgClient`
            SELECT id, name, category,
                   extensions.similarity(lower(name), ${normalizeIngredientName(alias.canonicalName)}) AS score
            FROM system_ingredients
            WHERE extensions.similarity(lower(name), ${normalizeIngredientName(alias.canonicalName)}) > 0.3
              AND is_active = true
            ORDER BY score DESC
            LIMIT 2
          `
          suggestions.push(
            ...(dictionaryRows ?? []).map((m: any) => ({
              systemIngredientId: m.id,
              name: m.name,
              score: Math.min(parseFloat(m.score), alias.confidence),
              category: m.category,
              source: 'dictionary' as const,
              dictionaryTerm: alias.canonicalName,
            }))
          )
        } catch {
          // Dictionary suggestions are advisory only.
        }
      }
    }

    unresolvedIngredients.push({
      id: row.id,
      name: row.name,
      category: row.category,
      suggestions,
    })
  }

  const missingPrices = buildCostingRepairGroup(missingPriceRows, (row) => ({
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient_name,
    category: row.category,
    detail: `No saved cost for ${row.unit ?? 'unit'}`,
  }))

  const stalePrices = {
    ...buildCostingRepairGroup(stalePriceRows, (row) => ({
      ingredientId: row.ingredient_id,
      ingredientName: row.ingredient_name,
      category: row.category,
      detail:
        row.days_since_price == null
          ? 'Price exists without a date'
          : `Last priced ${row.days_since_price} days ago`,
    })),
    staleAfterDays: stalePriceDays,
  }

  const missingDensity = buildCostingRepairGroup(missingDensityRows, (row) => ({
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient_name,
    category: row.category,
    detail: `Needed to convert ${row.recipe_unit} to ${row.cost_unit}`,
  }))

  const missingDefaultYield = buildCostingRepairGroup(missingYieldRows, (row) => ({
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient_name,
    category: row.category,
    detail: 'Recipe and ingredient yield are both unset',
  }))

  const costingRepair: CostingRepairSummary = {
    missingPrices,
    stalePrices,
    missingDensity,
    missingDefaultYield,
    totalBlockers:
      missingPrices.count + stalePrices.count + missingDensity.count + missingDefaultYield.count,
  }

  return { stats, pendingMatches, unresolvedIngredients, costingRepair }
}

function buildCostingRepairGroup<T extends { total_count?: number | string | null }>(
  rows: T[] | undefined,
  mapRow: (row: T) => CostingRepairIngredient
): CostingRepairGroup {
  const safeRows = rows ?? []

  return {
    count: safeRows.length > 0 ? Number(safeRows[0]?.total_count ?? safeRows.length) : 0,
    ingredients: safeRows.map(mapRow),
  }
}

// ============================================
// BATCH ACTIONS
// ============================================

/**
 * Confirm all pending auto-matches above a confidence threshold.
 * Returns count of confirmed matches.
 */
export async function batchConfirmPendingAction(
  ingredientIds: string[]
): Promise<{ confirmed: number; errors: number }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  if (ingredientIds.length === 0) return { confirmed: 0, errors: 0 }

  let confirmed = 0
  let errors = 0

  // Confirm in batches of 50
  for (let i = 0; i < ingredientIds.length; i += 50) {
    const batch = ingredientIds.slice(i, i + 50)
    try {
      const result = await pgClient`
        UPDATE ingredient_aliases
        SET confirmed_at = now()
        WHERE tenant_id = ${tenantId}
          AND ingredient_id = ANY(${batch})
          AND confirmed_at IS NULL
          AND system_ingredient_id IS NOT NULL
          AND match_method != 'dismissed'
      `
      confirmed += result.count ?? 0
    } catch {
      errors += batch.length
    }
  }

  // Trigger cost refresh for confirmed ingredients
  if (confirmed > 0) {
    try {
      const { refreshIngredientCostsAction } = await import('@/lib/pricing/cost-refresh-actions')
      await refreshIngredientCostsAction(ingredientIds)
    } catch (err) {
      console.error('[batchConfirmPending] Cost refresh failed (non-blocking):', err)
    }
  }

  return { confirmed, errors }
}
