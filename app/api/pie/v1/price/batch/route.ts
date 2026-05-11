import { NextRequest, NextResponse } from 'next/server'
import { lookupPricesBatch, type PriceLookupQuery } from '@/lib/pricing/universal-price-lookup'
import { checkPieRateLimit, rateLimitHeaders } from '@/lib/pricing/pie-rate-limiter'
import {
  buildPriceStateReliability,
  priceStateReliabilityApiShape,
} from '@/lib/pricing/price-state-reliability'
import { getLocationOrDetect } from '@/lib/location/account-location'

export const dynamic = 'force-dynamic'

/**
 * POST /api/pie/v1/price/batch
 *
 * Batch price lookup. Body: { ingredients: string[], zip?: string, radius?: number }
 * Returns array of price results in same order as input.
 * Max 50 ingredients per request.
 * Each batch request counts as 1 request toward rate limit.
 */
export async function POST(request: NextRequest) {
  const rateLimit = await checkPieRateLimit()
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retry_after_ms: rateLimit.resetAt - Date.now() },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    )
  }

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

  let resolvedZip = body.zip || undefined
  if (!resolvedZip) {
    const { location } = await getLocationOrDetect()
    resolvedZip = location?.zip || undefined
  }

  const queries: PriceLookupQuery[] = body.ingredients.map((ing) => ({
    ingredient: ing.trim(),
    zipCode: resolvedZip,
    radiusMiles: body.radius || undefined,
  }))

  try {
    const results = await lookupPricesBatch(queries)
    const reliabilityByTierAndScore = new Map<
      string,
      Awaited<ReturnType<typeof buildPriceStateReliability>>
    >()
    for (const result of results) {
      const key = `${result.resolution_tier}:${result.confidence_score}`
      if (!reliabilityByTierAndScore.has(key)) {
        reliabilityByTierAndScore.set(
          key,
          await buildPriceStateReliability({
            zipCode: resolvedZip,
            resolutionTier: result.resolution_tier,
            confidenceScore: result.confidence_score,
          })
        )
      }
    }

    const response = {
      count: results.length,
      zip: resolvedZip || null,
      results: results.map((r) => {
        const stateReliability = reliabilityByTierAndScore.get(
          `${r.resolution_tier}:${r.confidence_score}`
        )!
        return {
          ingredient: r.ingredient_name,
          ingredient_id: r.ingredient_id,
          matched: r.matched,
          price_cents: r.price_cents,
          price_per_unit_cents: r.price_per_unit_cents,
          unit: r.unit,
          confidence_score: r.confidence_score,
          effective_confidence_score: stateReliability.effectiveConfidenceScore,
          resolution_tier: r.resolution_tier,
          data_points: r.data_points,
          last_updated: r.last_updated,
          location_scope: r.location.scope,
          state_reliability: priceStateReliabilityApiShape(stateReliability),
        }
      }),
      latency_ms: Date.now() - start,
    }

    return NextResponse.json(response, { headers: rateLimitHeaders(rateLimit) })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: 'Internal error', detail: e instanceof Error ? e.message : 'unknown' },
      { status: 500, headers: rateLimitHeaders(rateLimit) }
    )
  }
}
