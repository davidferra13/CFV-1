import { NextRequest, NextResponse } from 'next/server'
import { lookupPrice } from '@/lib/pricing/universal-price-lookup'
import { checkPieRateLimit, rateLimitHeaders } from '@/lib/pricing/pie-rate-limiter'
import {
  buildPriceStateReliability,
  priceStateReliabilityApiShape,
} from '@/lib/pricing/price-state-reliability'
import { priceProofApiShape } from '@/lib/pricing/buyable-price-contract'
import { getLocationOrDetect } from '@/lib/location/account-location'

export const dynamic = 'force-dynamic'

/**
 * GET /api/pie/v1/price?ingredient=chicken+thighs&zip=01835&radius=50
 *
 * Public PIE price lookup. Returns best price for any ingredient,
 * optionally localized to a ZIP code.
 *
 * Rate limits: anonymous 60/min, authenticated 600/min, pro 6000/min.
 * Auth: Bearer token or x-api-key header.
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await checkPieRateLimit()
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retry_after_ms: rateLimit.resetAt - Date.now() },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    )
  }

  const start = Date.now()
  const { searchParams } = request.nextUrl

  const ingredient = searchParams.get('ingredient')
  if (!ingredient || ingredient.trim().length === 0) {
    return NextResponse.json({ error: 'Missing required parameter: ingredient' }, { status: 400 })
  }

  let zipCode = searchParams.get('zip') || undefined
  if (!zipCode) {
    const { location } = await getLocationOrDetect()
    zipCode = location?.zip || undefined
  }
  const radiusMiles = searchParams.get('radius')
    ? parseInt(searchParams.get('radius')!, 10)
    : undefined

  try {
    const result = await lookupPrice({
      ingredient: ingredient.trim(),
      zipCode,
      radiusMiles,
    })
    const stateReliability = await buildPriceStateReliability({
      zipCode,
      resolutionTier: result.resolution_tier,
      confidenceScore: result.confidence_score,
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
      effective_confidence_score: stateReliability.effectiveConfidenceScore,
      resolution_tier: result.resolution_tier,
      data_points: result.data_points,
      last_updated: result.last_updated,
      state_reliability: priceStateReliabilityApiShape(stateReliability),
      price_proof: priceProofApiShape(result.buyable_price),
      buyable_price: result.buyable_price,

      range: result.range,
      location: result.location,
      sources: result.sources,

      yield: result.yield,

      latency_ms: Date.now() - start,
    }

    // PIE Law 9: ALWAYS return a price, even if match confidence is low.
    // Callers use confidence_score and resolution_tier to judge quality.
    // Never 404 a price request - synthetic floor guarantees a number.
    return NextResponse.json(response, { headers: rateLimitHeaders(rateLimit) })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: 'Internal error', detail: e instanceof Error ? e.message : 'unknown' },
      { status: 500, headers: rateLimitHeaders(rateLimit) }
    )
  }
}

function mapConfidenceLevel(score: number): 'high' | 'medium' | 'low' | 'none' {
  if (score >= 0.7) return 'high'
  if (score >= 0.4) return 'medium'
  if (score > 0) return 'low'
  return 'none'
}
