import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { getOpenClawRuntimeHealth } from '@/lib/openclaw/health-contract'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req.headers.get('authorization'))
  if (authError) return authError

  try {
    const health = await getOpenClawRuntimeHealth()

    return NextResponse.json({
      bridge: health.bridge,
      coverage: health.coverage,
      ingredientsUpdated: health.bridge.ingredientsUpdatedToday,
      lastSync: health.bridge.lastPriceHistoryAt,
      mirror: health.mirror,
      overall: health.overall,
      pi: health.pi,
      priceHistoryRows: health.bridge.priceHistoryRows,
      status: health.overall.status,
      timestamp: health.generatedAt,
      warnings: health.warnings,
      wrapper: health.wrapper,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[sentinel/sync-status] Query failed:', message)
    return NextResponse.json({ error: 'Failed to query sync status' }, { status: 500 })
  }
}
