import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

// ---------------------------------------------------------------------------
// OpenClaw Price Sync Cron
// Pulls latest prices from the Raspberry Pi's OpenClaw database and updates
// ChefFlow ingredient prices. Runs nightly via Pi cron at 11 PM.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    // Dynamic import to avoid loading openclaw module at build time
    const { syncPricesToChefFlowInternal, getOpenClawStatsInternal } =
      await import('@/lib/openclaw/sync')

    // Check if Pi is reachable first
    const stats = await getOpenClawStatsInternal()
    if (!stats) {
      return NextResponse.json(
        {
          success: false,
          error: 'OpenClaw Pi unreachable',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }

    // Run the sync (retail tier by default)
    const result = await syncPricesToChefFlowInternal({ tier: 'retail' })

    return NextResponse.json({
      success: result.success,
      matched: result.matched,
      updated: result.updated,
      skipped: result.skipped,
      notFound: result.notFound,
      piStats: {
        sources: stats.sources,
        prices: stats.currentPrices,
        lastScrape: stats.lastScrapeAt,
      },
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
