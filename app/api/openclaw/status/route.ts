import { NextResponse } from 'next/server'
import { getOpenClawRuntimeHealth } from '@/lib/openclaw/health-contract'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/openclaw/status
 *
 * Public status endpoint for OpenClaw-backed pricing intelligence.
 * Coverage and sync health now come from the shared runtime contract so
 * this route no longer invents a separate health story.
 */
export async function GET() {
  try {
    const health = await getOpenClawRuntimeHealth()

    return NextResponse.json({
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
