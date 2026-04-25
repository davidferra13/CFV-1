import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import {
  OPENCLAW_REQUIRED_HEALTH_STAGES,
  buildOpenClawHealthContract,
  getOpenClawHealthContract,
  getOpenClawRuntimeHealth,
} from '@/lib/openclaw/health-contract'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function buildCanonicalFailureContract(err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown canonical health failure'

  return buildOpenClawHealthContract({
    generatedAt: new Date().toISOString(),
    stages: [],
    sourceReadErrors: [
      {
        source: 'getOpenClawHealthContract',
        message,
        stageIds: OPENCLAW_REQUIRED_HEALTH_STAGES.map((stage) => stage.id),
      },
    ],
  })
}

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req.headers.get('authorization'))
  if (authError) return authError

  try {
    const [healthResult, canonicalResult] = await Promise.allSettled([
      getOpenClawRuntimeHealth(),
      getOpenClawHealthContract(),
    ])

    if (healthResult.status === 'rejected') {
      throw healthResult.reason
    }

    const health = healthResult.value
    const canonical =
      canonicalResult.status === 'fulfilled'
        ? canonicalResult.value
        : buildCanonicalFailureContract(canonicalResult.reason)

    return NextResponse.json({
      bridge: health.bridge,
      canonical: canonical,
      canonicalContradictions: canonical.contradictions,
      canonicalStatus: canonical.overall,
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
