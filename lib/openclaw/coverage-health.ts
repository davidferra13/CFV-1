'use server'

/**
 * Coverage Health Report
 * Computes data completeness metrics for the ingredient database.
 * Answers: "What % of ingredients have current prices? Which categories
 * are bare? What's the confidence distribution?"
 */

import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export interface CoverageHealthReport {
  overall: {
    totalIngredients: number
    withCurrentPrice: number
    withAnyPrice: number
    withImage: number
    withNutrition: number
    coveragePct: number
  }
  byCategory: Array<{
    category: string
    total: number
    covered: number
    pct: number
  }>
  scraperStatus: Array<{
    source: string
    lastSyncAt: string | null
    priceCount: number
    avgAgeDays: number
  }>
  confidenceDistribution: {
    high: number
    medium: number
    low: number
    stale: number
  }
  gaps: string[]
}

/**
 * Get full coverage health report. Admin sees global data.
 * Non-admin chefs see only their own ingredient coverage (tenant-scoped).
 */
export async function getCoverageHealth(): Promise<CoverageHealthReport> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const emptyReport: CoverageHealthReport = {
    overall: {
      totalIngredients: 0,
      withCurrentPrice: 0,
      withAnyPrice: 0,
      withImage: 0,
      withNutrition: 0,
      coveragePct: 0,
    },
    byCategory: [],
    scraperStatus: [],
    confidenceDistribution: { high: 0, medium: 0, low: 0, stale: 0 },
    gaps: [],
  }

  try {
    // Overall stats
    const overallRows = (await db.execute(sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (
          WHERE last_price_cents IS NOT NULL
            AND last_price_date > CURRENT_DATE - 7
        ) as with_current_price,
        COUNT(*) FILTER (WHERE last_price_cents IS NOT NULL) as with_any_price,
        COUNT(*) FILTER (
          WHERE image_url IS NOT NULL AND image_url != '' AND image_url != 'none'
        ) as with_image,
        COUNT(*) FILTER (WHERE system_ingredient_id IS NOT NULL) as with_nutrition
      FROM ingredients
      WHERE tenant_id = ${tenantId}
        AND archived = false
    `)) as unknown as Array<{
      total: string
      with_current_price: string
      with_any_price: string
      with_image: string
      with_nutrition: string
    }>

    const overall = overallRows[0]
    const totalIngredients = parseInt(overall?.total || '0')

    if (totalIngredients === 0) return emptyReport

    const withCurrentPrice = parseInt(overall?.with_current_price || '0')

    // By category
    const categoryRows = (await db.execute(sql`
      SELECT
        category,
        COUNT(*) as total,
        COUNT(*) FILTER (
          WHERE last_price_cents IS NOT NULL
            AND last_price_date > CURRENT_DATE - 7
        ) as covered
      FROM ingredients
      WHERE tenant_id = ${tenantId}
        AND archived = false
      GROUP BY category
      ORDER BY COUNT(*) DESC
    `)) as unknown as Array<{ category: string; total: string; covered: string }>

    // Scraper status
    const scraperRows = (await db.execute(sql`
      SELECT
        source,
        MAX(purchase_date) as last_sync_at,
        COUNT(*) as price_count,
        ROUND(AVG(EXTRACT(EPOCH FROM (now() - purchase_date::timestamp)) / 86400))::int as avg_age_days
      FROM ingredient_price_history
      WHERE tenant_id = ${tenantId}
        AND source LIKE 'openclaw_%'
      GROUP BY source
      ORDER BY MAX(purchase_date) DESC
    `)) as unknown as Array<{
      source: string
      last_sync_at: string | null
      price_count: string
      avg_age_days: string
    }>

    // Confidence distribution (based on last_price_confidence)
    const confRows = (await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE last_price_confidence > 0.7) as high,
        COUNT(*) FILTER (WHERE last_price_confidence BETWEEN 0.4 AND 0.7) as medium,
        COUNT(*) FILTER (WHERE last_price_confidence BETWEEN 0.2 AND 0.4) as low,
        COUNT(*) FILTER (WHERE last_price_confidence < 0.2 OR last_price_confidence IS NULL) as stale
      FROM ingredients
      WHERE tenant_id = ${tenantId}
        AND archived = false
        AND last_price_cents IS NOT NULL
    `)) as unknown as Array<{ high: string; medium: string; low: string; stale: string }>

    // Top gaps (ingredients with no price data)
    const gapRows = (await db.execute(sql`
      SELECT name
      FROM ingredients
      WHERE tenant_id = ${tenantId}
        AND archived = false
        AND last_price_cents IS NULL
      ORDER BY name
      LIMIT 20
    `)) as unknown as Array<{ name: string }>

    return {
      overall: {
        totalIngredients,
        withCurrentPrice,
        withAnyPrice: parseInt(overall?.with_any_price || '0'),
        withImage: parseInt(overall?.with_image || '0'),
        withNutrition: parseInt(overall?.with_nutrition || '0'),
        coveragePct:
          totalIngredients > 0 ? Math.round((withCurrentPrice / totalIngredients) * 100) : 0,
      },
      byCategory: categoryRows.map((r) => ({
        category: r.category,
        total: parseInt(r.total),
        covered: parseInt(r.covered),
        pct:
          parseInt(r.total) > 0 ? Math.round((parseInt(r.covered) / parseInt(r.total)) * 100) : 0,
      })),
      scraperStatus: scraperRows.map((r) => ({
        source: r.source,
        lastSyncAt: r.last_sync_at,
        priceCount: parseInt(r.price_count),
        avgAgeDays: parseInt(r.avg_age_days || '0'),
      })),
      confidenceDistribution: {
        high: parseInt(confRows[0]?.high || '0'),
        medium: parseInt(confRows[0]?.medium || '0'),
        low: parseInt(confRows[0]?.low || '0'),
        stale: parseInt(confRows[0]?.stale || '0'),
      },
      gaps: gapRows.map((r) => r.name),
    }
  } catch (err) {
    console.error('[coverage-health] Error:', err)
    return emptyReport
  }
}
