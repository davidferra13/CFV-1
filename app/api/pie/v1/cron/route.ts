import { NextRequest, NextResponse } from 'next/server'
import { isHermesAlive } from '@/lib/pricing/hermes-heartbeat'
import { runFallbackTask, type FallbackTask } from '@/lib/pricing/fallback-cron'
import { runAutoExpansion } from '@/lib/pricing/auto-expansion-engine'
import { pullBlsPrices } from '@/lib/pricing/government-feed'
import { matchNakedIngredients } from '@/lib/pricing/fuzzy-match-engine'
import { runTrendAnalysis } from '@/lib/pricing/trend-intelligence'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/pie/v1/cron?task=expand|government|fuzzy|trends|fallback|all
 *
 * When Hermes is alive: runs requested task directly (Hermes calls these).
 * When Hermes is down: fallback mode activates automatically.
 *
 * New task: "fallback" runs the heartbeat-gated fallback operations.
 * Hermes gateway calls specific tasks; external cron calls "fallback".
 */
export async function POST(request: NextRequest) {
  const start = Date.now()

  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || process.env.PIE_CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const task = searchParams.get('task') || 'all'
  const results: Record<string, unknown> = {}

  try {
    if (task === 'fallback') {
      const hermesAlive = await isHermesAlive()
      if (hermesAlive) {
        return NextResponse.json({
          success: true,
          task: 'fallback',
          skipped: true,
          reason: 'hermes_alive',
          durationMs: Date.now() - start,
        })
      }

      const fallbackTasks: FallbackTask[] = ['freshness', 'alert', 'ratchet', 'measure']
      for (const ft of fallbackTasks) {
        results[ft] = await runFallbackTask(ft)
      }

      return NextResponse.json({
        success: true,
        task: 'fallback',
        mode: 'fallback',
        durationMs: Date.now() - start,
        results,
      })
    }

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
