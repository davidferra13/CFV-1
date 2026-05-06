import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

/**
 * GET /api/cron/pie-trends
 *
 * Cron endpoint that runs the full PIE trend analysis pipeline:
 *   1. Computes trends for all ingredients with sufficient price history
 *   2. Updates seasonal patterns
 *   3. Generates volatility alerts
 *
 * Results are cached in openclaw.ingredient_trends, openclaw.seasonal_patterns,
 * and openclaw.volatility_alerts for fast reads via /api/pricing/trends and
 * /api/pricing/seasonal.
 *
 * Recommended schedule: daily (e.g. 3:00 AM)
 * Authorization: Bearer CRON_SECRET
 *
 * Optional query param:
 *   - state: limit analysis to a specific state (e.g. "MA")
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const url = new URL(request.url)
  const state = url.searchParams.get('state') || undefined

  try {
    const result = await runMonitoredCronJob('pie-trends', async () => {
      const { runTrendAnalysis } = await import('@/lib/pricing/trend-intelligence')
      return runTrendAnalysis(state)
    })

    return NextResponse.json({
      success: true,
      ...result,
      state: state || 'all',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[cron/pie-trends] Error:', err instanceof Error ? err.message : err)
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
