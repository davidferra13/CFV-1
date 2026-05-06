import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import {
  getTrendsForIngredients,
  getActiveVolatilityAlerts,
  getCategoryTrendSummary,
} from '@/lib/pricing/trend-intelligence'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

const AUTH_ERROR = { error: 'Authentication required' } as const

/**
 * GET /api/pricing/trends
 *
 * Returns trend intelligence for the authenticated chef's ingredients.
 *
 * Query params:
 *   - state: optional state filter (e.g. "MA")
 *   - category: optional category filter (e.g. "produce")
 *   - mode: "ingredients" (default) | "summary" | "alerts"
 *     - ingredients: trends for chef's actual recipe ingredients
 *     - summary: category-level trend overview
 *     - alerts: active volatility alerts
 *   - limit: max results (default 50, max 200)
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'chef') {
    return NextResponse.json(AUTH_ERROR, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const mode = params.get('mode') || 'ingredients'
  const state = params.get('state') || undefined
  const category = params.get('category') || undefined
  const limit = Math.min(Number(params.get('limit')) || 50, 200)

  try {
    if (mode === 'summary') {
      const summary = await getCategoryTrendSummary()
      return NextResponse.json({
        mode: 'summary',
        categories: category ? summary.filter((s) => s.category === category) : summary,
        timestamp: new Date().toISOString(),
      })
    }

    if (mode === 'alerts') {
      const alerts = await getActiveVolatilityAlerts(state, limit)
      return NextResponse.json({
        mode: 'alerts',
        alerts,
        count: alerts.length,
        timestamp: new Date().toISOString(),
      })
    }

    // Default mode: trends for chef's ingredients
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
        mode: 'ingredients',
        trends: [],
        count: 0,
        message: 'No ingredients with canonical IDs found in your recipes',
        timestamp: new Date().toISOString(),
      })
    }

    const ids = ingredients.map((i) => i.canonical_ingredient_id)
    let trends = await getTrendsForIngredients(ids, state)

    // Apply category filter if provided
    if (category) {
      trends = trends.filter((t) => t.category === category)
    }

    // Sort by absolute change (most movement first)
    trends.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))

    // Apply limit
    trends = trends.slice(0, limit)

    // Summary stats
    const rising = trends.filter((t) => t.direction === 'rising').length
    const falling = trends.filter((t) => t.direction === 'falling').length
    const volatile = trends.filter((t) => t.direction === 'volatile').length
    const stable = trends.filter((t) => t.direction === 'stable').length

    return NextResponse.json({
      mode: 'ingredients',
      trends,
      count: trends.length,
      summary: { rising, falling, volatile, stable },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[pricing/trends] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'Trend lookup failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}
