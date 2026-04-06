'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'
import { normalizeIngredientName, type MatchSuggestion } from './ingredient-matching-utils'

// ============================================
// TYPES
// ============================================

export interface IngredientHealthStats {
  total: number
  confirmed: number
  pending: number
  unmatched: number
  dismissed: number
  coveragePct: number | null
}

export interface PendingMatch {
  ingredientId: string
  ingredientName: string
  category: string | null
  systemIngredientId: string
  systemIngredientName: string
  similarityScore: number
  matchMethod: string
}

export interface UnresolvedIngredient {
  id: string
  name: string
  category: string | null
  suggestions: MatchSuggestion[]
}

export interface IngredientHealthSummary {
  stats: IngredientHealthStats
  pendingMatches: PendingMatch[]
  unresolvedIngredients: UnresolvedIngredient[]
}

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

  // Single query to get all stats + pending matches + unmatched ingredients
  const [statsRows, pendingRows, unmatchedRows] = await Promise.all([
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
      }))
    } catch {
      // pg_trgm might not be available
    }

    unresolvedIngredients.push({
      id: row.id,
      name: row.name,
      category: row.category,
      suggestions,
    })
  }

  return { stats, pendingMatches, unresolvedIngredients }
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
