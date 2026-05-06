import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { getSeasonalPatterns } from '@/lib/pricing/trend-intelligence'
import { getSeasonalTips } from '@/lib/pricing/seasonal-analysis'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

const AUTH_ERROR = { error: 'Authentication required' } as const

/**
 * GET /api/pricing/seasonal
 *
 * Returns seasonal price patterns for the authenticated chef's ingredients.
 *
 * Query params:
 *   - mode: "patterns" (default) | "tips"
 *     - patterns: full seasonal pattern data (monthly indices, peaks, troughs)
 *     - tips: actionable tips for current or target month
 *   - month: target month (1-12) for tips mode (defaults to current month)
 *   - category: optional category filter
 *   - limit: max results (default 50, max 200)
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'chef') {
    return NextResponse.json(AUTH_ERROR, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const mode = params.get('mode') || 'patterns'
  const category = params.get('category') || undefined
  const month = params.get('month') ? Number(params.get('month')) : undefined
  const limit = Math.min(Number(params.get('limit')) || 50, 200)

  try {
    if (mode === 'tips') {
      // Seasonal tips from chef's own price history (tenant-scoped)
      if (!user.tenantId) {
        return NextResponse.json({
          mode: 'tips',
          tips: [],
          message: 'No tenant context available',
          timestamp: new Date().toISOString(),
        })
      }

      const tips = await getSeasonalTips(user.tenantId, month)
      return NextResponse.json({
        mode: 'tips',
        month: month || new Date().getMonth() + 1,
        tips: tips.slice(0, limit),
        count: Math.min(tips.length, limit),
        timestamp: new Date().toISOString(),
      })
    }

    // Default mode: seasonal patterns from OpenClaw data
    const ingredients = (await db.execute(sql`
      SELECT DISTINCT ri.canonical_ingredient_id
      FROM recipe_ingredients ri
      JOIN recipes r ON r.id = ri.recipe_id
      WHERE r.tenant_id = ${user.tenantId}
        AND r.is_archived = false
        AND ri.canonical_ingredient_id IS NOT NULL
      LIMIT 200
    `)) as unknown as Array<{ canonical_ingredient_id: string }>

    if (ingredients.length === 0) {
      return NextResponse.json({
        mode: 'patterns',
        patterns: [],
        count: 0,
        message: 'No ingredients with canonical IDs found in your recipes',
        timestamp: new Date().toISOString(),
      })
    }

    const ids = ingredients.map((i) => i.canonical_ingredient_id)
    let patterns = await getSeasonalPatterns(ids)

    // Apply category filter
    if (category) {
      patterns = patterns.filter((p) => p.category === category)
    }

    // Sort by seasonal swing (most seasonal first)
    patterns.sort((a, b) => b.seasonalSwingPct - a.seasonalSwingPct)

    // Apply limit
    patterns = patterns.slice(0, limit)

    // Summary
    const inSeason = patterns.filter((p) => p.inSeason).length
    const outOfSeason = patterns.length - inSeason
    const avgSwing =
      patterns.length > 0
        ? Math.round(patterns.reduce((s, p) => s + p.seasonalSwingPct, 0) / patterns.length)
        : 0

    return NextResponse.json({
      mode: 'patterns',
      patterns,
      count: patterns.length,
      summary: {
        inSeason,
        outOfSeason,
        avgSeasonalSwingPct: avgSwing,
        currentMonth: new Date().getMonth() + 1,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[pricing/seasonal] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'Seasonal analysis failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}
