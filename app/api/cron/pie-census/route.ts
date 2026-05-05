/**
 * PIE Census & Compliance Cron
 *
 * Runs the full PIE law enforcement pipeline:
 *   1. Build/refresh the Census (Law 8)
 *   2. Run synthetic pricing for gaps (Law 9)
 *   3. Enforce freshness (Law 4)
 *   4. Run compound learning (Law 7)
 *   5. Run anomaly detection (Law 5)
 *   6. Generate compliance report (all 10 laws)
 *
 * Designed to run on a schedule (e.g. every 6 hours).
 */

import { NextResponse } from 'next/server'
import { buildCensus, getCensusStats } from '@/lib/pricing/census'
import { runSyntheticEngine } from '@/lib/pricing/synthetic-engine'
import { enforcesFreshness } from '@/lib/pricing/freshness-enforcer'
import { runCompoundLearning } from '@/lib/pricing/compound-learning'
import { runAnomalyDetection } from '@/lib/pricing/anomaly-detector'
import { getPieCompliance } from '@/lib/pricing/pie-compliance'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 min max

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, unknown> = {}

  try {
    // Step 1: Build/refresh Census
    console.log('[pie-census] Step 1: Building census...')
    results.census = await buildCensus()

    // Step 2: Run synthetic pricing for gaps
    console.log('[pie-census] Step 2: Running synthetic engine...')
    results.synthetic = await runSyntheticEngine()

    // Step 3: Enforce freshness
    console.log('[pie-census] Step 3: Enforcing freshness...')
    results.freshness = await enforcesFreshness()

    // Step 4: Compound learning (Law 7)
    console.log('[pie-census] Step 4: Running compound learning...')
    results.learning = await runCompoundLearning()

    // Step 5: Anomaly detection (Law 5)
    console.log('[pie-census] Step 5: Running anomaly detection...')
    results.anomalies = await runAnomalyDetection()

    // Step 6: Compliance report
    console.log('[pie-census] Step 6: Generating compliance report...')
    results.compliance = await getPieCompliance()

    // Step 7: Census stats
    results.censusStats = await getCensusStats()

    return NextResponse.json({ success: true, ...results })
  } catch (err) {
    console.error('[pie-census] Failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error', partial: results },
      { status: 500 }
    )
  }
}
