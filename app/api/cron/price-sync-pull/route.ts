import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

// ---------------------------------------------------------------------------
// Self-Pull Price Sync
//
// ChefFlow initiates the sync by pulling from Pi's enriched API.
// This eliminates the dependency on Pi being able to reach ChefFlow's HTTP.
//
// Previously, Pi's sync-to-chefflow.mjs was the only trigger, which failed
// whenever ChefFlow's server was down ("ChefFlow HTTP down" since 2026-04-23).
//
// This route should be triggered by:
//   - Internal scheduler (setInterval in instrumentation.ts)
//   - External cron hitting this endpoint (Pi crontab as fallback)
//   - Manual trigger from admin UI
//
// Runs 4x/day minimum to satisfy PIE Law 4 (Freshness Guarantee).
// ---------------------------------------------------------------------------

export const maxDuration = 300 // 5 minutes max for large syncs

async function runPriceSyncPull(request: NextRequest) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('price-sync-pull', async () => {
      const { syncPricesToChefFlowInternal } = await import('@/lib/openclaw/sync')
      const syncResult = await syncPricesToChefFlowInternal()

      return {
        success: syncResult.success,
        matched: syncResult.matched,
        updated: syncResult.updated,
        skipped: syncResult.skipped,
        notFound: syncResult.notFound,
        quarantined: syncResult.quarantined ?? 0,
        error: syncResult.error ?? null,
        timestamp: new Date().toISOString(),
      }
    })

    const status = result.success === false ? 500 : 200
    return NextResponse.json(result, { status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[price-sync-pull] Cron failed:', message)
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

export async function GET(request: NextRequest) {
  return runPriceSyncPull(request)
}

export async function POST(request: NextRequest) {
  return runPriceSyncPull(request)
}
