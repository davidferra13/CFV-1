import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

/**
 * Source Health Check Cron
 *
 * Monitors the health and freshness of all pricing data sources.
 * Writes per-source status to openclaw.source_health_log.
 * Run every 6 hours or after sync cycles.
 *
 * Checks:
 *   - Freshest record age per source
 *   - Record count vs expected
 *   - Source uptime (can we reach it?)
 *   - Data staleness detection
 */
export async function POST(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('source-health', async () => {
      const { runSourceHealthCheck } = await import('@/lib/pricing/source-health-worker')
      return runSourceHealthCheck()
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  return POST(request)
}
