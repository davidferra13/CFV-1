import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

/**
 * GET /api/cron/pie-coverage-gaps
 *
 * Runs the PIE coverage gap detector to identify underserved regions.
 * Produces prioritized expansion targets for the auto-expansion engine.
 *
 * Phase 0 gate: ensures all 50 states have pricing_region rows first,
 * then seeds expansion_targets for states with OSM stores but no/low coverage.
 *
 * Recommended schedule: every 6 hours
 * Authorization: Bearer CRON_SECRET
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('pie-coverage-gaps', async () => {
      // Step 0: Ensure all 50 states have pricing_region rows so gap
      // detector can see them (idempotent, fast if already done)
      const { ensureAllStateRegions, seedExpansionTargetsForAllStates } =
        await import('@/lib/pricing/ensure-all-state-regions')
      const regionResult = await ensureAllStateRegions()
      const seedResult = await seedExpansionTargetsForAllStates()

      // Step 1: Run full gap detection (now sees all 50 states)
      const { detectCoverageGaps } = await import('@/lib/pricing/coverage-gap-detector')
      const gapResult = await detectCoverageGaps()

      return {
        ...gapResult,
        regionsEnsured: regionResult,
        expansionSeeded: seedResult,
      }
    })

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[cron/pie-coverage-gaps] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'unknown',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
