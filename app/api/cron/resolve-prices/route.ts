import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

/**
 * Resolved Prices Refresh Cron
 *
 * Pre-computes per-ingredient, per-region prices into openclaw.resolved_prices.
 * Should run after each openclaw-sync cycle (4x/day) or on demand.
 *
 * Query params:
 *   ?region=<slug>  - process a single region (for testing/backfill)
 *   ?dry=1          - dry run, don't write to DB
 */
export async function POST(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const url = new URL(request.url)
  const regionSlug = url.searchParams.get('region') || undefined
  const dryRun = url.searchParams.get('dry') === '1'

  try {
    const result = await runMonitoredCronJob('resolve-prices', async () => {
      const { runResolvedPricesWorker } = await import('@/lib/openclaw/resolve-prices-worker')
      return runResolvedPricesWorker({ regionSlug, dryRun })
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[resolve-prices cron] Error:', message)
    return NextResponse.json(
      { success: false, error: message, timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  return POST(request)
}
