import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

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
    // Delegate to the unified sync receiver with price-intel as the cartridge
    const { syncCartridgeInternal } = await import('@/lib/openclaw/sync-receiver')
    const result = await syncCartridgeInternal('price-intel')

    // Also grab Pi stats for the legacy response format
    const { getOpenClawStatsInternal } = await import('@/lib/openclaw/sync')
    const stats = await getOpenClawStatsInternal()

    return NextResponse.json({
      success: result.success,
      matched: result.matched,
      updated: result.updated,
      skipped: result.skipped,
      notFound: result.errors,
      piStats: stats
        ? {
            sources: stats.sources,
            prices: stats.currentPrices,
            lastScrape: stats.lastScrapeAt,
          }
        : null,
      timestamp: new Date().toISOString(),
    })
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
