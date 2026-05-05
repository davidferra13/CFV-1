/**
 * Source Health Worker
 *
 * Checks freshness and data volume for each pricing data source.
 * Writes results to openclaw.source_health_log.
 * Surfaces degraded/stale/down sources for admin dashboard.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

interface SourceHealthResult {
  sourcesChecked: number
  healthy: number
  degraded: number
  stale: number
  down: number
  details: SourceStatus[]
}

interface SourceStatus {
  sourceName: string
  sourceType: string
  status: 'ok' | 'degraded' | 'stale' | 'down'
  recordCount: number
  freshestRecordAt: string | null
  staleDays: number | null
}

// Define known sources and their expected freshness thresholds (in days)
const SOURCE_DEFINITIONS: Array<{
  name: string
  type: 'scraper' | 'api' | 'government' | 'wholesale' | 'manual'
  sourceFilter: string
  staleDays: number // after this many days without new data, mark stale
  degradedDays: number // after this many days, mark degraded
}> = [
  {
    name: 'openclaw_scrape',
    type: 'scraper',
    sourceFilter: 'openclaw_scrape',
    staleDays: 14,
    degradedDays: 7,
  },
  {
    name: 'openclaw_flyer',
    type: 'scraper',
    sourceFilter: 'openclaw_flyer',
    staleDays: 14,
    degradedDays: 7,
  },
  {
    name: 'openclaw_instacart',
    type: 'scraper',
    sourceFilter: 'openclaw_instacart',
    staleDays: 7,
    degradedDays: 3,
  },
  {
    name: 'openclaw_government',
    type: 'government',
    sourceFilter: 'openclaw_government',
    staleDays: 90,
    degradedDays: 60,
  },
  {
    name: 'openclaw_wholesale',
    type: 'wholesale',
    sourceFilter: 'openclaw_wholesale',
    staleDays: 30,
    degradedDays: 14,
  },
  {
    name: 'chef_receipts',
    type: 'manual',
    sourceFilter: 'manual',
    staleDays: 90,
    degradedDays: 30,
  },
  {
    name: 'vendor_invoices',
    type: 'manual',
    sourceFilter: 'vendor_invoice',
    staleDays: 90,
    degradedDays: 30,
  },
  {
    name: 'grocery_entries',
    type: 'manual',
    sourceFilter: 'grocery_entry',
    staleDays: 90,
    degradedDays: 30,
  },
]

export async function runSourceHealthCheck(): Promise<SourceHealthResult> {
  const details: SourceStatus[] = []
  let healthy = 0
  let degraded = 0
  let stale = 0
  let down = 0

  for (const sourceDef of SOURCE_DEFINITIONS) {
    const rows = (await db.execute(sql`
      SELECT
        COUNT(*)::int AS record_count,
        MAX(purchase_date)::text AS freshest_at
      FROM ingredient_price_history
      WHERE source = ${sourceDef.sourceFilter}
    `)) as unknown as Array<{ record_count: number; freshest_at: string | null }>

    const row = rows[0]
    const recordCount = row?.record_count ?? 0
    const freshestAt = row?.freshest_at ?? null

    let staleDays: number | null = null
    let status: 'ok' | 'degraded' | 'stale' | 'down' = 'ok'

    if (!freshestAt || recordCount === 0) {
      status = 'down'
      staleDays = null
    } else {
      staleDays = Math.floor((Date.now() - new Date(freshestAt).getTime()) / (1000 * 60 * 60 * 24))
      if (staleDays > sourceDef.staleDays) {
        status = 'stale'
      } else if (staleDays > sourceDef.degradedDays) {
        status = 'degraded'
      }
    }

    // Write to source_health_log
    try {
      await db.execute(sql`
        INSERT INTO openclaw.source_health_log (
          source_name, source_type, status, records_returned,
          freshest_record_at
        ) VALUES (
          ${sourceDef.name}, ${sourceDef.type}, ${status}, ${recordCount},
          ${freshestAt ? sql`${freshestAt}::timestamptz` : sql`NULL`}
        )
      `)
    } catch {
      // source_health_log table may not exist yet; continue checking
    }

    details.push({
      sourceName: sourceDef.name,
      sourceType: sourceDef.type,
      status,
      recordCount,
      freshestRecordAt: freshestAt,
      staleDays,
    })

    switch (status) {
      case 'ok':
        healthy++
        break
      case 'degraded':
        degraded++
        break
      case 'stale':
        stale++
        break
      case 'down':
        down++
        break
    }
  }

  // Also check resolved_prices freshness
  try {
    const resolvedRows = (await db.execute(sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE freshest_observation > NOW() - INTERVAL '7 days')::int AS fresh,
        COUNT(*) FILTER (WHERE freshest_observation < NOW() - INTERVAL '30 days')::int AS stale_count
      FROM openclaw.resolved_prices
    `)) as unknown as Array<{ total: number; fresh: number; stale_count: number }>

    if (resolvedRows[0]) {
      const r = resolvedRows[0]
      const resolvedStatus = r.stale_count > r.total * 0.5 ? 'degraded' : 'ok'
      details.push({
        sourceName: 'resolved_prices',
        sourceType: 'api',
        status: resolvedStatus,
        recordCount: r.total,
        freshestRecordAt: null,
        staleDays: null,
      })
      if (resolvedStatus === 'ok') healthy++
      else degraded++
    }
  } catch {
    // resolved_prices may not exist
  }

  return {
    sourcesChecked: details.length,
    healthy,
    degraded,
    stale,
    down,
    details,
  }
}
