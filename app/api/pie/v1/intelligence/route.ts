import { NextRequest, NextResponse } from 'next/server'
import {
  detectCoverageGaps,
  getGapsByPriority,
  getStateCoverageSummary,
} from '@/lib/pricing/coverage-gap-detector'
import { runAutoExpansion, getExpansionHistory } from '@/lib/pricing/auto-expansion-engine'
import {
  runTrendAnalysis,
  getActiveVolatilityAlerts,
  getCategoryTrendSummary,
} from '@/lib/pricing/trend-intelligence'
import { runAccelerator } from '@/lib/pricing/compound-learning-accelerator'
import { runWholesaleAnalysis } from '@/lib/pricing/wholesale-intelligence'
import { runMarketPositioning } from '@/lib/pricing/market-positioning'
import { runSupplyRiskAnalysis, getTopSupplyRisks } from '@/lib/pricing/predictive-supply'
import { pullBlsPrices } from '@/lib/pricing/government-feed'
import { matchNakedIngredients } from '@/lib/pricing/fuzzy-match-engine'
import { getAccuracyStats } from '@/lib/pricing/receipt-price-bridge'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for full pipeline

/**
 * POST /api/pie/v1/intelligence
 *
 * PIE Intelligence Pipeline Orchestrator.
 * Runs all intelligence layers in sequence. Called by cron every 6 hours.
 *
 * Query params:
 *   ?layer=gaps|expansion|trends|learning|wholesale|market|supply|all
 *   ?dry=true (skip writes, return what would happen)
 */
export async function POST(request: NextRequest) {
  const start = Date.now()
  const { searchParams } = request.nextUrl

  // Auth: require internal cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || process.env.PIE_CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const layer = searchParams.get('layer') || 'all'
  const results: Record<string, unknown> = {}

  try {
    if (layer === 'all' || layer === 'gaps') {
      console.log('[pie-intelligence] Running coverage gap detection...')
      results.gaps = await detectCoverageGaps()
    }

    if (layer === 'all' || layer === 'expansion') {
      console.log('[pie-intelligence] Running auto-expansion...')
      results.expansion = await runAutoExpansion()
    }

    if (layer === 'all' || layer === 'trends') {
      console.log('[pie-intelligence] Running trend analysis...')
      results.trends = await runTrendAnalysis()
    }

    if (layer === 'all' || layer === 'learning') {
      console.log('[pie-intelligence] Running compound learning accelerator...')
      results.learning = await runAccelerator()
    }

    if (layer === 'all' || layer === 'wholesale') {
      console.log('[pie-intelligence] Running wholesale analysis...')
      results.wholesale = await runWholesaleAnalysis()
    }

    if (layer === 'all' || layer === 'market') {
      console.log('[pie-intelligence] Running market positioning...')
      results.market = await runMarketPositioning()
    }

    if (layer === 'all' || layer === 'supply') {
      console.log('[pie-intelligence] Running supply risk analysis...')
      results.supply = await runSupplyRiskAnalysis()
    }

    if (layer === 'all' || layer === 'government') {
      console.log('[pie-intelligence] Pulling government feed (BLS)...')
      results.government = await pullBlsPrices()
    }

    if (layer === 'all' || layer === 'fuzzy') {
      console.log('[pie-intelligence] Running fuzzy match on naked ingredients...')
      results.fuzzy = await matchNakedIngredients({ limit: 50 })
    }

    if (layer === 'accuracy') {
      console.log('[pie-intelligence] Computing accuracy from receipt signals...')
      results.accuracy = await getAccuracyStats()
    }

    const durationMs = Date.now() - start
    console.log(`[pie-intelligence] Pipeline complete in ${durationMs}ms`)

    return NextResponse.json({
      success: true,
      layer,
      durationMs,
      results,
    })
  } catch (error) {
    console.error('[pie-intelligence] Pipeline error:', error)
    return NextResponse.json(
      { error: 'Intelligence pipeline failed', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/pie/v1/intelligence?view=dashboard|gaps|alerts|supply
 *
 * Read-only intelligence dashboard data.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const view = searchParams.get('view') || 'dashboard'

  try {
    if (view === 'gaps') {
      const gaps = await getGapsByPriority(30)
      const statesSummary = await getStateCoverageSummary()
      return NextResponse.json({ gaps, statesSummary })
    }

    if (view === 'alerts') {
      const state = searchParams.get('state') || undefined
      const alerts = await getActiveVolatilityAlerts(state, 30)
      return NextResponse.json({ alerts })
    }

    if (view === 'supply') {
      const risks = await getTopSupplyRisks(30)
      return NextResponse.json({ risks })
    }

    // Default: dashboard overview
    const [gaps, trends, alerts, supply, expansion, accuracy] = await Promise.all([
      getGapsByPriority(5),
      getCategoryTrendSummary(),
      getActiveVolatilityAlerts(undefined, 5),
      getTopSupplyRisks(5),
      getExpansionHistory(5),
      getAccuracyStats({ days: 30 }).catch(() => null),
    ])

    return NextResponse.json({
      coverage: { topGaps: gaps },
      trends: { categories: trends },
      alerts: { active: alerts },
      supply: { topRisks: supply },
      expansion: { recent: expansion },
      accuracy: accuracy || { totalComparisons: 0, accuracyPct: 0 },
    })
  } catch (error) {
    console.error('[pie-intelligence] Dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to load intelligence data', details: String(error) },
      { status: 500 }
    )
  }
}
