import { NextResponse } from 'next/server'
import {
  OPENCLAW_REQUIRED_HEALTH_STAGES,
  buildOpenClawHealthContract,
  getOpenClawHealthContract,
  getOpenClawRuntimeHealth,
} from '@/lib/openclaw/health-contract'
import { getCurrentUser } from '@/lib/auth/get-user'

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

/**
 * GET /api/openclaw/status
 *
 * Chef-only status endpoint for OpenClaw-backed pricing intelligence.
 * Coverage and sync health come from the shared runtime contract.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'chef') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
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
      canonical: canonical,
      status:
        health.overall.status === 'ok'
          ? 'operational'
          : health.overall.status === 'partial'
            ? 'partial'
            : health.overall.status === 'unknown'
              ? 'unknown'
              : 'degraded',
      timestamp: health.generatedAt,
      coverage: {
        chains: health.coverage.totalChains,
        total_prices: health.coverage.totalPrices,
        states_with_stores: health.coverage.statesWithStores,
        usda_baselines: health.coverage.usdaBaselines,
        farmers_markets: health.coverage.farmersMarkets,
        estimation_models: health.coverage.estimationModels,
        food_products: health.coverage.foodProducts,
      },
      health: {
        has_prices: health.coverage.totalPrices > 0,
        has_baselines: health.coverage.usdaBaselines > 0,
        has_estimation: health.coverage.estimationModels > 0,
        mirror_status: health.mirror.status,
        bridge_status: health.bridge.status,
        pi_status: health.pi.status,
        wrapper_status: health.wrapper.status,
        canonical_overall: canonical.overall,
        canonical_contradictions: canonical.contradictions.length,
        reason: health.overall.reason,
      },
      sync: {
        overall: health.overall,
        wrapper: health.wrapper,
        mirror: health.mirror,
        bridge: health.bridge,
        pi: health.pi,
        warnings: health.warnings,
      },
    })
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to retrieve pricing status',
      },
      { status: 500 }
    )
  }
}
