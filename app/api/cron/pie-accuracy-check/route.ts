import { NextResponse } from 'next/server'
import {
  resolvePredictions,
  computeMonthlyAccuracy,
  getLearningStatus,
} from '@/lib/pricing/compound-learning'
import { getAccuracyStats } from '@/lib/pricing/receipt-price-bridge'
import { pgClient } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, unknown> = {}
  const start = Date.now()

  // Step 1: Resolve predictions against actual observed prices
  try {
    console.log('[pie-accuracy-check] Step 1: Resolving predictions...')
    results.predictionsResolved = await resolvePredictions()
  } catch (err) {
    console.error('[pie-accuracy-check] resolvePredictions failed:', err)
    results.predictionsResolved = { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  // Step 2: Roll up monthly accuracy stats
  try {
    console.log('[pie-accuracy-check] Step 2: Computing monthly accuracy...')
    results.monthlyRollupsUpdated = await computeMonthlyAccuracy()
  } catch (err) {
    console.error('[pie-accuracy-check] computeMonthlyAccuracy failed:', err)
    results.monthlyRollupsUpdated = { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  // Step 3: Receipt-vs-PIE accuracy stats
  try {
    console.log('[pie-accuracy-check] Step 3: Getting receipt accuracy stats...')
    results.receiptAccuracy = await getAccuracyStats({ days: 30 })
  } catch (err) {
    console.error('[pie-accuracy-check] getAccuracyStats failed:', err)
    results.receiptAccuracy = { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  // Step 4: Cross-validate Pi bridge prices (tier 2.7) against resolved_prices
  try {
    console.log('[pie-accuracy-check] Step 4: Cross-validating Pi bridge vs resolved prices...')
    const sql = pgClient
    const crossValidation = await sql`
      SELECT
        rp.canonical_ingredient_id,
        rp.price_cents AS resolved_cents,
        rp.computation_method AS resolved_method,
        pp.predicted_cents AS pi_bridge_cents,
        pp.derivation_method,
        ROUND(
          ABS(rp.price_cents::numeric - pp.predicted_cents::numeric)
          / GREATEST(rp.price_cents::numeric, 1) * 100,
          3
        ) AS deviation_pct
      FROM openclaw.resolved_prices rp
      INNER JOIN openclaw.price_predictions pp
        ON pp.canonical_ingredient_id = rp.canonical_ingredient_id
        AND (pp.pricing_region_id IS NULL OR pp.pricing_region_id = rp.pricing_region_id)
      WHERE rp.is_synthetic = false
        AND rp.confidence > 0.3
        AND pp.derivation_method LIKE '%pi_bridge%'
        AND pp.actual_cents IS NULL
        AND pp.predicted_at > NOW() - INTERVAL '30 days'
      ORDER BY deviation_pct DESC
      LIMIT 500
    `

    const deviations = crossValidation.map((r) => Number(r.deviation_pct))
    const totalPairs = crossValidation.length
    const within15 = deviations.filter((d) => d <= 15).length
    const avgDeviation =
      totalPairs > 0
        ? Math.round((deviations.reduce((a, b) => a + b, 0) / totalPairs) * 1000) / 1000
        : null

    results.piBridgeCrossValidation = {
      totalPairs,
      within15Pct: within15,
      accuracyPct: totalPairs > 0 ? Math.round((within15 / totalPairs) * 10000) / 100 : null,
      avgDeviationPct: avgDeviation,
      worstDeviations: crossValidation.slice(0, 10).map((r) => ({
        ingredientId: r.canonical_ingredient_id,
        resolvedCents: Number(r.resolved_cents),
        piBridgeCents: Number(r.pi_bridge_cents),
        deviationPct: Number(r.deviation_pct),
        resolvedMethod: r.resolved_method,
      })),
    }
  } catch (err) {
    console.error('[pie-accuracy-check] Pi bridge cross-validation failed:', err)
    results.piBridgeCrossValidation = {
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }

  // Step 5: Get overall learning status for the summary
  try {
    results.learningStatus = await getLearningStatus()
  } catch (err) {
    console.error('[pie-accuracy-check] getLearningStatus failed:', err)
    results.learningStatus = { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  results.durationMs = Date.now() - start

  console.log(
    `[pie-accuracy-check] Complete in ${results.durationMs}ms.`,
    `Predictions resolved: ${typeof results.predictionsResolved === 'number' ? results.predictionsResolved : 'error'}.`,
    `Monthly rollups: ${typeof results.monthlyRollupsUpdated === 'number' ? results.monthlyRollupsUpdated : 'error'}.`
  )

  return NextResponse.json({ success: true, ...results })
}
