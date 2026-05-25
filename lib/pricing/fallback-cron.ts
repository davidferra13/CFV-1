import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { isHermesAlive } from './hermes-heartbeat'
import { logHermesAction } from './hermes-actions'
import { runAutoExpansion } from './auto-expansion-engine'
import { matchNakedIngredients } from './fuzzy-match-engine'
import { runTrendAnalysis } from './trend-intelligence'

export type FallbackTask = 'freshness' | 'alert' | 'census' | 'ratchet' | 'measure'

interface FallbackResult {
  skipped: boolean
  reason?: string
  task?: string
  durationMs?: number
  result?: unknown
}

export async function runFallbackTask(task: FallbackTask): Promise<FallbackResult> {
  if (await isHermesAlive()) {
    return { skipped: true, reason: 'hermes_alive' }
  }

  const start = Date.now()

  switch (task) {
    case 'freshness': {
      const staleItems = (await db.execute(sql`
        SELECT id FROM ingredient_price_history
        WHERE purchase_date < NOW() - INTERVAL '7 days'
        ORDER BY purchase_date ASC NULLS FIRST
        LIMIT 100
      `)) as unknown as Array<{ id: string }>

      await logHermesAction({
        skill: 'pie-acquire',
        source: 'fallback',
        action: `Flagged ${staleItems.length} stale items for refresh (round-robin)`,
        itemsAffected: staleItems.length,
        durationMs: Date.now() - start,
      })

      return {
        skipped: false,
        task: 'freshness',
        durationMs: Date.now() - start,
        result: { flagged: staleItems.length },
      }
    }

    case 'alert': {
      const alerts = await runTrendAnalysis()

      await logHermesAction({
        skill: 'pie-alert',
        source: 'fallback',
        action: 'Threshold alert scan (no investigation)',
        durationMs: Date.now() - start,
        result: 'success',
      })

      return { skipped: false, task: 'alert', durationMs: Date.now() - start, result: alerts }
    }

    case 'census': {
      const matched = await matchNakedIngredients({ limit: 100 })

      await logHermesAction({
        skill: 'pie-census',
        source: 'fallback',
        action: 'Exact-match census pass (no fuzzy)',
        itemsAffected: (matched as any)?.matched ?? 0,
        durationMs: Date.now() - start,
      })

      return { skipped: false, task: 'census', durationMs: Date.now() - start, result: matched }
    }

    case 'ratchet': {
      const expanded = await runAutoExpansion()

      await logHermesAction({
        skill: 'pie-ratchet',
        source: 'fallback',
        action: 'Fix largest coverage gap by count',
        itemsAffected: (expanded as any)?.expanded ?? 0,
        durationMs: Date.now() - start,
      })

      return { skipped: false, task: 'ratchet', durationMs: Date.now() - start, result: expanded }
    }

    case 'measure': {
      const coverage = (await db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM ingredient_census) AS total_census,
          (SELECT COUNT(DISTINCT canonical_ingredient_id) FROM ingredient_price_history) AS with_price
      `)) as unknown as Array<{ total_census: number; with_price: number }>

      const row = coverage[0]
      const pct = row ? Math.round((row.with_price / Math.max(row.total_census, 1)) * 100) : 0

      await logHermesAction({
        skill: 'pie-measure',
        source: 'fallback',
        action: `Snapshot: ${pct}% coverage (${row?.with_price}/${row?.total_census})`,
        durationMs: Date.now() - start,
      })

      return {
        skipped: false,
        task: 'measure',
        durationMs: Date.now() - start,
        result: { coveragePct: pct },
      }
    }
  }
}
