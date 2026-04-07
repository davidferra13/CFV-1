import { NextResponse } from 'next/server'
import { getCoverageSummary } from '@/lib/pricing/coverage-report'

/**
 * GET /api/openclaw/status
 *
 * Public health endpoint for the pricing intelligence system.
 * Returns coverage metrics, data freshness, and system health.
 * Used by app.cheflowhq.com and cheflowhq.com.
 */
export async function GET() {
  try {
    const summary = await getCoverageSummary()

    return NextResponse.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      coverage: {
        chains: summary.total_chains,
        total_prices: summary.total_prices,
        states_with_stores: summary.states_with_stores,
        usda_baselines: summary.usda_baselines,
        farmers_markets: summary.farmers_markets,
        estimation_models: summary.estimation_models,
      },
      health: {
        has_prices: summary.total_prices > 0,
        has_baselines: summary.usda_baselines > 0,
        has_estimation: summary.estimation_models > 0,
      },
    })
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to retrieve coverage data',
      },
      { status: 500 }
    )
  }
}
