import { NextRequest, NextResponse } from 'next/server'
import { runAutoExpansion } from '@/lib/pricing/auto-expansion-engine'
import { pullBlsPrices } from '@/lib/pricing/government-feed'
import { matchNakedIngredients } from '@/lib/pricing/fuzzy-match-engine'
import { runTrendAnalysis } from '@/lib/pricing/trend-intelligence'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/pie/v1/cron?task=expand|government|fuzzy|trends|all
 *
 * Lightweight cron entry points for individual PIE tasks.
 * Hermes calls these independently on different schedules:
 *   - expand: every 6 hours (auto-expansion to new states)
 *   - government: weekly (pull BLS prices)
 *   - fuzzy: daily (match naked ingredients)
 *   - trends: every 6 hours (trend/volatility analysis)
 *   - all: run everything sequentially
 */
export async function POST(request: NextRequest) {
  const start = Date.now()

  // Auth: require cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || process.env.PIE_CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const task = searchParams.get('task') || 'all'
  const results: Record<string, unknown> = {}

  try {
    if (task === 'all' || task === 'expand') {
      results.expansion = await runAutoExpansion()
    }

    if (task === 'all' || task === 'government') {
      results.government = await pullBlsPrices()
    }

    if (task === 'all' || task === 'fuzzy') {
      results.fuzzy = await matchNakedIngredients({ limit: 100 })
    }

    if (task === 'all' || task === 'trends') {
      results.trends = await runTrendAnalysis()
    }

    return NextResponse.json({
      success: true,
      task,
      durationMs: Date.now() - start,
      results,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Cron task failed', task, details: String(error) },
      { status: 500 }
    )
  }
}
