'use server'

/**
 * Per-Chef Coverage Scorecard
 * Tallies how the chef's ingredient library resolves across coverage levels.
 * Returns percentages so the UI can show "73% direct, 15% regional, 12% estimated".
 */

import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { resolvePricesBatch, type CoverageLevel } from './resolve-price'

export interface CoverageScore {
  totalIngredients: number
  directCount: number
  regionalCount: number
  estimatedCount: number
  directPct: number
  regionalPct: number
  estimatedPct: number
  /** Ingredients with effectiveConfidence < 0.15 (synthetic/unreliable) */
  syntheticCount: number
  /** Average effective confidence across all ingredients */
  avgConfidence: number
}

export async function getChefCoverageScore(): Promise<CoverageScore> {
  const chef = await requireChef()
  const tenantId = chef.tenantId ?? chef.entityId

  // Get all active ingredient IDs for this chef
  const rows = (await db.execute(
    sql`SELECT id FROM ingredients WHERE tenant_id = ${tenantId} AND archived = false`
  )) as unknown as { id: string }[]

  if (rows.length === 0) {
    return {
      totalIngredients: 0,
      directCount: 0,
      regionalCount: 0,
      estimatedCount: 0,
      directPct: 0,
      regionalPct: 0,
      estimatedPct: 0,
      syntheticCount: 0,
      avgConfidence: 0,
    }
  }

  const ingredientIds = rows.map((r) => r.id)
  const prices = await resolvePricesBatch(ingredientIds, tenantId)

  let directCount = 0
  let regionalCount = 0
  let estimatedCount = 0
  let syntheticCount = 0
  let totalConfidence = 0

  for (const price of prices.values()) {
    totalConfidence += price.effectiveConfidence
    if (price.effectiveConfidence < 0.15) syntheticCount++

    switch (price.coverageLevel) {
      case 'direct':
        directCount++
        break
      case 'regional':
        regionalCount++
        break
      case 'estimated':
        estimatedCount++
        break
    }
  }

  const total = rows.length
  return {
    totalIngredients: total,
    directCount,
    regionalCount,
    estimatedCount,
    directPct: Math.round((directCount / total) * 100),
    regionalPct: Math.round((regionalCount / total) * 100),
    estimatedPct: Math.round((estimatedCount / total) * 100),
    syntheticCount,
    avgConfidence: Math.round((totalConfidence / total) * 100) / 100,
  }
}
