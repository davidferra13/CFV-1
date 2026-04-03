import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

// ---------------------------------------------------------------------------
// OpenClaw Price Sync Cron (LEGACY - kept for backwards compatibility)
//
// This endpoint is called by price-intel's sync-to-chefflow.mjs nightly script.
// It now delegates to the unified sync receiver via the cartridge registry.
//
// New cartridges should use: POST /api/cron/openclaw-sync?cartridge=<name>
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('price-sync', async () => {
      const { syncCartridgeInternal } = await import('@/lib/openclaw/sync-receiver')
      const syncResult = await syncCartridgeInternal('price-intel')

      const { getOpenClawStatsInternal } = await import('@/lib/openclaw/sync')
      const stats = await getOpenClawStatsInternal()

      return {
        success: syncResult.success,
        matched: syncResult.matched,
        updated: syncResult.updated,
        skipped: syncResult.skipped,
        notFound: syncResult.errors,
        piStats: stats
          ? {
              sources: stats.sources,
              prices: stats.currentPrices,
              lastScrape: stats.lastScrapeAt,
            }
          : null,
        timestamp: new Date().toISOString(),
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[price-sync cron] Error:', message)
    return NextResponse.json(
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
