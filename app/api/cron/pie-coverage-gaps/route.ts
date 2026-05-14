import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

/**
 * GET /api/cron/pie-coverage-gaps
 *
 * Runs the PIE coverage gap detector to identify underserved regions.
 * Produces prioritized expansion targets for the auto-expansion engine.
 *
 * Recommended schedule: every 6 hours
 * Authorization: Bearer CRON_SECRET
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('pie-coverage-gaps', async () => {
      const { detectCoverageGaps } = await import('@/lib/pricing/coverage-gap-detector')
      return detectCoverageGaps()
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
