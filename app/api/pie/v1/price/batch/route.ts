import { NextRequest, NextResponse } from 'next/server'
import { lookupPricesBatch, type PriceLookupQuery } from '@/lib/pricing/universal-price-lookup'

export const dynamic = 'force-dynamic'

/**
 * POST /api/pie/v1/price/batch
 *
 * Batch price lookup. Body: { ingredients: string[], zip?: string, radius?: number }
 * Returns array of price results in same order as input.
 * Max 50 ingredients per request.
 */
export async function POST(request: NextRequest) {
  const start = Date.now()

  let body: { ingredients?: string[]; zip?: string; radius?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.ingredients || !Array.isArray(body.ingredients) || body.ingredients.length === 0) {
    return NextResponse.json(
      { error: 'Missing required field: ingredients (array of strings)' },
      { status: 400 }
    )
  }

  if (body.ingredients.length > 50) {
    return NextResponse.json({ error: 'Max 50 ingredients per batch request' }, { status: 400 })
  }

  const queries: PriceLookupQuery[] = body.ingredients.map((ing) => ({
    ingredient: ing.trim(),
    zipCode: body.zip || undefined,
    radiusMiles: body.radius || undefined,
  }))

  try {
    const results = await lookupPricesBatch(queries)

    const response = {
      count: results.length,
      zip: body.zip || null,
      results: results.map((r) => ({
        ingredient: r.ingredient_name,
        ingredient_id: r.ingredient_id,
        matched: r.matched,
        price_cents: r.price_cents,
        price_per_unit_cents: r.price_per_unit_cents,
        unit: r.unit,
        confidence_score: r.confidence_score,
        resolution_tier: r.resolution_tier,
        data_points: r.data_points,
        last_updated: r.last_updated,
        location_scope: r.location.scope,
      })),
      latency_ms: Date.now() - start,
    }

    return NextResponse.json(response)
  } catch (e: unknown) {
    return NextResponse.json(
      { error: 'Internal error', detail: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}
