import { NextResponse } from 'next/server'
import { getLearningStatus } from '@/lib/pricing/compound-learning'
import { getAccuracyStats } from '@/lib/pricing/receipt-price-bridge'
import { runGroundTruthValidation } from '@/lib/pricing/ground-truth-validation'
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

  // Step 1: Run full ground truth validation pipeline
  // This resolves predictions, recomputes monthly accuracy, and generates real report
  try {
    console.log('[pie-accuracy-check] Step 1: Running ground truth validation...')
    const validation = await runGroundTruthValidation({ days: 30 })
    results.groundTruthValidation = {
      predictionsResolved: validation.predictionsResolved,
      monthlyRollupsUpdated: validation.monthlyRollupsUpdated,
      report: {
        totalComparisons: validation.report.totalComparisons,
        withinSlaPct: validation.report.withinSlaPct,
        meanAbsoluteErrorPct: validation.report.meanAbsoluteErrorPct,
        medianAbsoluteErrorPct: validation.report.medianAbsoluteErrorPct,
        p90ErrorPct: validation.report.p90ErrorPct,
        slaMet: validation.report.slaMet,
        slaTarget: validation.report.slaTarget,
        trendVsPriorMonth: validation.report.trendVsPriorMonth,
        tierCount: validation.report.byTier.length,
        categoryCount: validation.report.byCategory.length,
        worstOffenderCount: validation.report.worstOffenders.length,
      },
      durationMs: validation.durationMs,
    }
  } catch (err) {
    console.error('[pie-accuracy-check] Ground truth validation failed:', err)
    results.groundTruthValidation = { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  // Step 2: Receipt-vs-PIE accuracy stats (legacy, kept for backwards compatibility)
  try {
    console.log('[pie-accuracy-check] Step 2: Getting receipt accuracy stats...')
    results.receiptAccuracy = await getAccuracyStats({ days: 30 })
  } catch (err) {
    console.error('[pie-accuracy-check] getAccuracyStats failed:', err)
    results.receiptAccuracy = { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  // Step 4: Get overall learning status for the summary
  try {
    results.learningStatus = await getLearningStatus()
  } catch (err) {
    console.error('[pie-accuracy-check] getLearningStatus failed:', err)
    results.learningStatus = { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  // Step 5: Ground truth coverage diagnostic
  try {
    const sql = pgClient
    const [coverage] = await sql`
      SELECT
        (SELECT COUNT(*) FROM pie_ground_truth) as ground_truth_total,
        (SELECT COUNT(*) FROM pie_ground_truth WHERE created_at > NOW() - INTERVAL '30 days') as ground_truth_30d,
        (SELECT COUNT(*) FROM pie_prediction_resolutions WHERE source IN ('receipt', 'receipt_ground_truth')) as receipt_resolutions,
        (SELECT COUNT(*) FROM openclaw.price_predictions WHERE actual_cents IS NULL) as unresolved_predictions
    `
    results.coverage = {
      groundTruthTotal: parseInt(coverage.ground_truth_total) || 0,
      groundTruth30d: parseInt(coverage.ground_truth_30d) || 0,
      receiptResolutions: parseInt(coverage.receipt_resolutions) || 0,
      unresolvedPredictions: parseInt(coverage.unresolved_predictions) || 0,
    }
  } catch (err) {
    results.coverage = { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  results.durationMs = Date.now() - start

  // Determine overall health
  const gtValidation = results.groundTruthValidation as Record<string, unknown> | undefined
  const slaMet = gtValidation?.report
    ? (gtValidation.report as Record<string, unknown>).slaMet === true
    : false
  const hasData = gtValidation?.report
    ? ((gtValidation.report as Record<string, unknown>).totalComparisons as number) > 0
    : false

  results.health = {
    slaMet,
    hasGroundTruthData: hasData,
    status: !hasData ? 'NO_GROUND_TRUTH' : slaMet ? 'HEALTHY' : 'SLA_BREACH',
  }

  console.log(
    `[pie-accuracy-check] Complete in ${results.durationMs}ms.`,
    `Health: ${(results.health as Record<string, unknown>).status}.`,
    hasData
      ? `Accuracy: ${(gtValidation!.report as Record<string, unknown>).withinSlaPct}% within 15%.`
      : 'No ground truth data yet.'
  )

  return NextResponse.json({ success: true, ...results })
}
