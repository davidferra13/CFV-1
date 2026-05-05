import { NextRequest, NextResponse } from 'next/server'
import { lookupPrice } from '@/lib/pricing/universal-price-lookup'

export const dynamic = 'force-dynamic'

/**
 * GET /api/pie/v1/price?ingredient=chicken+thighs&zip=01835&radius=50
 *
 * Public PIE price lookup. Returns best price for any ingredient,
 * optionally localized to a ZIP code.
 */
export async function GET(request: NextRequest) {
  const start = Date.now()
  const { searchParams } = request.nextUrl

  const ingredient = searchParams.get('ingredient')
  if (!ingredient || ingredient.trim().length === 0) {
    return NextResponse.json({ error: 'Missing required parameter: ingredient' }, { status: 400 })
  }

  const zipCode = searchParams.get('zip') || undefined
  const radiusMiles = searchParams.get('radius')
    ? parseInt(searchParams.get('radius')!, 10)
    : undefined

  try {
    const result = await lookupPrice({
      ingredient: ingredient.trim(),
      zipCode,
      radiusMiles,
    })

    const response = {
      ingredient: result.ingredient_name,
      ingredient_id: result.ingredient_id,
      matched: result.matched,
      match_method: result.match_method,
      match_confidence: result.match_confidence,
      suggestion: result.suggestion,

      price_cents: result.price_cents,
      price_per_unit_cents: result.price_per_unit_cents,
      unit: result.unit,
      price_type: result.price_type,

      confidence: mapConfidenceLevel(result.confidence_score),
      confidence_score: result.confidence_score,
      resolution_tier: result.resolution_tier,
      data_points: result.data_points,
      last_updated: result.last_updated,

      range: result.range,
      location: result.location,
      sources: result.sources,

      yield: result.yield,

      latency_ms: Date.now() - start,
    }

    if (!result.matched) {
      return NextResponse.json(response, { status: 404 })
    }

    return NextResponse.json(response)
  } catch (e: unknown) {
    return NextResponse.json(
      { error: 'Internal error', detail: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}

function mapConfidenceLevel(score: number): 'high' | 'medium' | 'low' | 'none' {
  if (score >= 0.7) return 'high'
  if (score >= 0.4) return 'medium'
  if (score > 0) return 'low'
  return 'none'
}
