import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

/**
 * GET /api/cron/pie-auto-expansion
 *
 * Runs the PIE auto-expansion engine to fill coverage gaps.
 * Consumes expansion targets from the gap detector and dispatches
 * scrape jobs to the Pi.
 *
 * Recommended schedule: every 6 hours (1 hour after gap detection)
 * Authorization: Bearer CRON_SECRET
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('pie-auto-expansion', async () => {
      const { runAutoExpansion } = await import('@/lib/pricing/auto-expansion-engine')
      return runAutoExpansion()
    })

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[cron/pie-auto-expansion] Error:', err instanceof Error ? err.message : err)
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
