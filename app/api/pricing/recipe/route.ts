import { NextRequest, NextResponse } from 'next/server'
import { lookupPrice, lookupPricesBatch } from '@/lib/pricing/universal-price-lookup'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth/get-user'
import { resolveCurrentUserLocation } from '@/lib/location/account-location'

const AUTH_ERROR = { error: 'Authentication required' } as const

/**
 * GET /api/pricing/recipe?recipe_id=<uuid>&zip=<zip>
 *
 * Returns full recipe costing with per-ingredient breakdown.
 * Chef-only endpoint. Requires authenticated chef session.
 *
 * Also supports POST with JSON body for ad-hoc ingredient lists:
 * POST /api/pricing/recipe
 * { "zip": "02101", "ingredients": [{"name": "chicken breast", "amount": 2, "unit": "lb"}, ...] }
 */

interface RecipeIngredient {
  name: string
  amount: number
  unit: string
  ingredient_id?: string
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'chef') {
    return NextResponse.json(AUTH_ERROR, { status: 401 })
  }

  const recipeId = request.nextUrl.searchParams.get('recipe_id')
  let zip = request.nextUrl.searchParams.get('zip') || undefined
  if (!zip) {
    const acctLoc = await resolveCurrentUserLocation()
    zip = acctLoc?.zip || undefined
  }

  if (!recipeId) {
    return NextResponse.json({ error: 'Missing required parameter: recipe_id' }, { status: 400 })
  }

  try {
    // Fetch recipe ingredients
    const ingredients = (await db.execute(sql`
      SELECT
        ri.quantity, ri.unit, ri.yield_pct,
        i.name AS ingredient_name,
        i.id AS ingredient_id,
        i.default_unit
      FROM recipe_ingredients ri
      JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = ${recipeId}
      ORDER BY ri.sort_order ASC NULLS LAST
    `)) as unknown as Array<{
      quantity: number
      unit: string
      yield_pct: number | null
      ingredient_name: string
      ingredient_id: string
      default_unit: string
    }>

    if (ingredients.length === 0) {
      return NextResponse.json({ error: 'Recipe not found or has no ingredients' }, { status: 404 })
    }

    // Fetch recipe metadata
    const recipeRows = (await db.execute(sql`
      SELECT name, yield_quantity, yield_unit FROM recipes WHERE id = ${recipeId} LIMIT 1
    `)) as unknown as Array<{ name: string; yield_quantity: number; yield_unit: string }>
    const recipe = recipeRows[0]

    // Batch price lookup
    const queries = ingredients.map((ing) => ({
      ingredient: ing.ingredient_name,
      zipCode: zip,
    }))
    const prices = await lookupPricesBatch(queries)

    // Build per-ingredient breakdown
    // PIE Law 9: price_per_unit_cents is ALWAYS a number (synthetic floor guarantees this)
    const breakdown = ingredients.map((ing, idx) => {
      const price = prices[idx]
      const amount = Number(ing.quantity) || 1
      const yieldPct = ing.yield_pct ? Number(ing.yield_pct) / 100 : 1.0
      const adjustedAmount = yieldPct > 0 ? amount / yieldPct : amount
      const lineCostCents = Math.round(price.price_per_unit_cents * adjustedAmount)

      return {
        ingredient: ing.ingredient_name,
        ingredient_id: ing.ingredient_id,
        recipe_amount: `${amount} ${ing.unit || ing.default_unit || 'each'}`,
        price_per_unit: price.price_per_unit_cents,
        unit: price.unit,
        line_cost: lineCostCents,
        price_range: price.range,
        confidence: price.confidence_score,
        resolution_tier: price.resolution_tier,
        freshness: price.last_updated,
        sources: price.data_points,
        yield_adjusted: yieldPct < 1.0,
      }
    })

    const totalCost = breakdown.reduce((sum, item) => sum + item.line_cost, 0)
    const pricedCount = breakdown.length // PIE Law 9: all ingredients always have a price
    const avgConfidence =
      breakdown.length > 0
        ? Math.round(
            (breakdown.reduce((sum, item) => sum + item.confidence, 0) / breakdown.length) * 100
          ) / 100
        : 0

    const servings = Number(recipe?.yield_quantity) || 1
    const warnings = breakdown
      .filter((item) => item.confidence < 0.3)
      .map((item) => ({
        ingredient: item.ingredient,
        message: 'Rough estimate, limited local data',
      }))

    // Resolve region name for the ZIP
    let regionName: string | null = null
    if (zip) {
      const regionRows = (await db.execute(sql`
        SELECT pr.name FROM openclaw.pricing_regions pr
        JOIN openclaw.zip_centroids zc ON zc.pricing_region_id = pr.id
        WHERE zc.zip = ${zip}
        LIMIT 1
      `)) as unknown as Array<{ name: string }>
      regionName = regionRows[0]?.name || null
    }

    return NextResponse.json({
      recipe_id: recipeId,
      recipe_name: recipe?.name || 'Unknown Recipe',
      region: {
        name: regionName,
        zip: zip || null,
      },
      total_cost_cents: totalCost,
      cost_per_serving_cents: servings > 0 ? Math.round(totalCost / servings) : null,
      servings,
      ingredient_count: breakdown.length,
      priced_count: pricedCount,
      confidence_avg: avgConfidence,
      ingredients: breakdown,
      warnings,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[pricing/recipe] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'Recipe pricing failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pricing/recipe
 * Body: { zip: "02101", ingredients: [{ name: "chicken breast", amount: 2, unit: "lb" }, ...] }
 *
 * Ad-hoc recipe costing without a saved recipe.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'chef') {
    return NextResponse.json(AUTH_ERROR, { status: 401 })
  }

  try {
    const body = await request.json()
    let { zip } = body as { zip?: string }
    const { ingredients } = body as { ingredients: RecipeIngredient[] }

    if (!zip) {
      const acctLoc = await resolveCurrentUserLocation()
      zip = acctLoc?.zip || undefined
    }

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'Missing or empty ingredients array' }, { status: 400 })
    }

    if (ingredients.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 ingredients per request' }, { status: 400 })
    }

    const queries = ingredients.map((ing) => ({
      ingredient: ing.name,
      zipCode: zip,
    }))
    const prices = await lookupPricesBatch(queries)

    const breakdown = ingredients.map((ing, idx) => {
      const price = prices[idx]
      const amount = ing.amount || 1
      const lineCostCents = Math.round(price.price_per_unit_cents * amount)

      return {
        ingredient: ing.name,
        recipe_amount: `${amount} ${ing.unit || 'each'}`,
        price_per_unit: price.price_per_unit_cents,
        unit: price.unit,
        line_cost: lineCostCents,
        price_range: price.range,
        confidence: price.confidence_score,
        resolution_tier: price.resolution_tier,
        sources: price.data_points,
      }
    })

    const totalCost = breakdown.reduce((sum, item) => sum + item.line_cost, 0)
    const pricedCount = breakdown.length
    const avgConfidence =
      breakdown.length > 0
        ? Math.round(
            (breakdown.reduce((sum, item) => sum + item.confidence, 0) / breakdown.length) * 100
          ) / 100
        : 0

    // Resolve region
    let regionName: string | null = null
    if (zip) {
      try {
        const regionRows = (await db.execute(sql`
          SELECT pr.name FROM openclaw.pricing_regions pr
          JOIN openclaw.zip_centroids zc ON zc.pricing_region_id = pr.id
          WHERE zc.zip = ${zip} LIMIT 1
        `)) as unknown as Array<{ name: string }>
        regionName = regionRows[0]?.name || null
      } catch {
        /* table may not exist */
      }
    }

    return NextResponse.json({
      region: { name: regionName, zip: zip || null },
      total_cost_cents: totalCost,
      ingredient_count: breakdown.length,
      priced_count: pricedCount,
      confidence_avg: avgConfidence,
      ingredients: breakdown,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[pricing/recipe POST] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'Recipe pricing failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}
