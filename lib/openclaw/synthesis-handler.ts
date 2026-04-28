/**
 * Synthesis Intelligence Handler
 * Pulls synthesized data from Pi's OpenClaw dashboard (port 8090)
 * and upserts into ChefFlow's openclaw schema tables.
 *
 * Registered as the 'synthesis-intel' cartridge in sync-receiver.ts.
 * Called nightly at 11:30pm (after Pi's synthesizers finish).
 */

'use server'

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import type { CartridgeSyncResult } from './cartridge-registry'

const PI_SYNTHESIS_API =
  process.env.PI_SYNTHESIS_URL || 'http://10.0.0.177:8090'

interface SynthesisExport {
  anomaly_alerts?: any[]
  seasonal_scores?: any[]
  store_rankings?: any[]
  price_velocity?: any[]
  recall_alerts?: any[]
  category_benchmarks?: any[]
  substitutions?: any[]
  local_markets?: any[]
  _meta?: { exported_at: string; counts: Record<string, number> }
  [key: string]: any
}

async function fetchSynthesisExport(): Promise<SynthesisExport | null> {
  try {
    const res = await fetch(
      `${PI_SYNTHESIS_API}/api/synthesis/export?tables=all`,
      { signal: AbortSignal.timeout(120000), cache: 'no-store' }
    )
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error(
      `[synthesis] Pi API unreachable: ${err instanceof Error ? err.message : 'unknown'}`
    )
    return null
  }
}

// --- Table handlers ---

async function upsertAnomalyAlerts(data: any[]): Promise<number> {
  if (!data?.length) return 0
  await db.execute(
    sql`DELETE FROM openclaw.anomaly_alerts WHERE expires_at < NOW()`
  )
  let count = 0
  for (const row of data) {
    try {
      await db.execute(sql`
        INSERT INTO openclaw.anomaly_alerts
          (ingredient_name, category, severity, direction, magnitude_pct, affected_stores, message, expires_at)
        VALUES
          (${row.ingredient_name}, ${row.category}, ${row.severity}, ${row.direction},
           ${row.magnitude_pct}, ${row.affected_stores || '[]'}, ${row.message},
           ${row.expires_at || null})
        ON CONFLICT DO NOTHING
      `)
      count++
    } catch (err) {
      console.warn(`[synthesis] anomaly insert failed: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }
  return count
}

async function upsertSeasonalScores(data: any[]): Promise<number> {
  if (!data?.length) return 0
  let count = 0
  for (const row of data) {
    try {
      await db.execute(sql`
        INSERT INTO openclaw.seasonal_scores
          (ingredient_name, month, availability_score, price_percentile, value_score, status, region)
        VALUES
          (${row.ingredient_name}, ${row.month}, ${row.availability_score},
           ${row.price_percentile}, ${row.value_score}, ${row.status}, ${row.region || 'northeast'})
        ON CONFLICT (ingredient_name, month, region) DO UPDATE SET
          availability_score = EXCLUDED.availability_score,
          price_percentile = EXCLUDED.price_percentile,
          value_score = EXCLUDED.value_score,
          status = EXCLUDED.status,
          updated_at = NOW()
      `)
      count++
    } catch (err) {
      console.warn(`[synthesis] seasonal insert failed: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }
  return count
}

async function upsertStoreRankings(data: any[]): Promise<number> {
  if (!data?.length) return 0
  await db.execute(sql`TRUNCATE openclaw.store_rankings`)
  let count = 0
  for (const row of data) {
    try {
      await db.execute(sql`
        INSERT INTO openclaw.store_rankings
          (ingredient_name, store_name, chain_slug, avg_price_cents, vs_market_pct, rank, sample_size, category)
        VALUES
          (${row.ingredient_name}, ${row.store_name}, ${row.chain_slug || null},
           ${row.avg_price_cents}, ${row.vs_market_pct}, ${row.rank},
           ${row.sample_size || 0}, ${row.category || null})
      `)
      count++
    } catch (err) {
      console.warn(`[synthesis] store_ranking insert failed: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }
  return count
}

async function upsertPriceVelocity(data: any[]): Promise<number> {
  if (!data?.length) return 0
  let count = 0
  for (const row of data) {
    try {
      await db.execute(sql`
        INSERT INTO openclaw.price_velocity
          (ingredient_name, stability_score, status, trend_direction, volatility_30d,
           change_count_7d, change_count_30d, trend_acceleration)
        VALUES
          (${row.ingredient_name}, ${row.stability_score}, ${row.status},
           ${row.trend_direction}, ${row.volatility_30d},
           ${row.change_count_7d || 0}, ${row.change_count_30d || 0},
           ${row.trend_acceleration || 0})
        ON CONFLICT (ingredient_name) DO UPDATE SET
          stability_score = EXCLUDED.stability_score,
          status = EXCLUDED.status,
          trend_direction = EXCLUDED.trend_direction,
          volatility_30d = EXCLUDED.volatility_30d,
          change_count_7d = EXCLUDED.change_count_7d,
          change_count_30d = EXCLUDED.change_count_30d,
          trend_acceleration = EXCLUDED.trend_acceleration,
          updated_at = NOW()
      `)
      count++
    } catch (err) {
      console.warn(`[synthesis] velocity insert failed: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }
  return count
}

async function upsertRecallAlerts(data: any[]): Promise<number> {
  if (!data?.length) return 0
  let count = 0
  for (const row of data) {
    try {
      await db.execute(sql`
        INSERT INTO openclaw.recall_alerts
          (ingredient_name, brand, severity, recall_class, reason, affected_products, expires_at)
        VALUES
          (${row.ingredient_name}, ${row.brand || null}, ${row.severity},
           ${row.recall_class || null}, ${row.reason},
           ${row.affected_products || '{}'}, ${row.expires_at || null})
      `)
      count++
    } catch (err) {
      console.warn(`[synthesis] recall insert failed: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }
  return count
}

async function upsertCategoryBenchmarks(data: any[]): Promise<number> {
  if (!data?.length) return 0
  let count = 0
  for (const row of data) {
    try {
      await db.execute(sql`
        INSERT INTO openclaw.category_benchmarks
          (category, median_price_cents, p25_price_cents, p75_price_cents,
           trend_direction, trend_pct, vs_30d_pct, sample_size, dinner_index_cents)
        VALUES
          (${row.category}, ${row.median_price_cents}, ${row.p25_price_cents},
           ${row.p75_price_cents}, ${row.trend_direction}, ${row.trend_pct},
           ${row.vs_30d_pct}, ${row.sample_size || 0}, ${row.dinner_index_cents || null})
        ON CONFLICT (category) DO UPDATE SET
          median_price_cents = EXCLUDED.median_price_cents,
          p25_price_cents = EXCLUDED.p25_price_cents,
          p75_price_cents = EXCLUDED.p75_price_cents,
          trend_direction = EXCLUDED.trend_direction,
          trend_pct = EXCLUDED.trend_pct,
          vs_30d_pct = EXCLUDED.vs_30d_pct,
          sample_size = EXCLUDED.sample_size,
          dinner_index_cents = EXCLUDED.dinner_index_cents,
          updated_at = NOW()
      `)
      count++
    } catch (err) {
      console.warn(`[synthesis] benchmark insert failed: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }
  return count
}

async function upsertSubstitutions(data: any[]): Promise<number> {
  if (!data?.length) return 0
  await db.execute(sql`TRUNCATE openclaw.substitutions`)
  let count = 0
  for (const row of data) {
    try {
      await db.execute(sql`
        INSERT INTO openclaw.substitutions
          (ingredient_name, substitute_name, category, price_delta_pct,
           seasonal_match, confidence, reason)
        VALUES
          (${row.ingredient_name}, ${row.substitute_name}, ${row.category},
           ${row.price_delta_pct}, ${row.seasonal_match === 1}, ${row.confidence},
           ${row.reason || null})
      `)
      count++
    } catch (err) {
      console.warn(`[synthesis] substitution insert failed: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }
  return count
}

async function upsertLocalMarkets(data: any[]): Promise<number> {
  if (!data?.length) return 0
  await db.execute(sql`TRUNCATE openclaw.local_markets`)
  let count = 0
  for (const row of data) {
    try {
      await db.execute(sql`
        INSERT INTO openclaw.local_markets
          (market_name, lat, lng, open_season, open_days, product_count, is_open_this_week)
        VALUES
          (${row.market_name}, ${row.lat || null}, ${row.lng || null},
           ${row.open_season || null}, ${row.open_days || null},
           ${row.product_count || 0}, ${row.is_open_this_week === 1})
      `)
      count++
    } catch (err) {
      console.warn(`[synthesis] market insert failed: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }
  return count
}

const HANDLERS: Record<string, (data: any[]) => Promise<number>> = {
  anomaly_alerts: upsertAnomalyAlerts,
  seasonal_scores: upsertSeasonalScores,
  store_rankings: upsertStoreRankings,
  price_velocity: upsertPriceVelocity,
  recall_alerts: upsertRecallAlerts,
  category_benchmarks: upsertCategoryBenchmarks,
  substitutions: upsertSubstitutions,
  local_markets: upsertLocalMarkets,
}

// Pi export uses different keys than ChefFlow table names
const EXPORT_KEY_MAP: Record<string, string> = {
  anomalies: 'anomaly_alerts',
  seasonal: 'seasonal_scores',
  store_rankings: 'store_rankings',
  velocity: 'price_velocity',
  recalls: 'recall_alerts',
  benchmarks: 'category_benchmarks',
  substitutions: 'substitutions',
  markets: 'local_markets',
}

/**
 * Pull all synthesis data from Pi and upsert into ChefFlow.
 * Returns CartridgeSyncResult for the cartridge registry.
 */
export async function handleSynthesisSync(
  _data: unknown
): Promise<CartridgeSyncResult> {
  console.log('[synthesis] Starting synthesis intelligence sync...')

  const piData = await fetchSynthesisExport()
  if (!piData) {
    return {
      success: false,
      cartridge: 'synthesis-intel',
      matched: 0,
      updated: 0,
      skipped: 0,
      errors: 1,
      errorDetails: ['Pi synthesis API unreachable (port 8090)'],
    }
  }

  if (piData._meta) {
    console.log(`[synthesis] Pi export time: ${piData._meta.exported_at}`)
    console.log(`[synthesis] Pi counts:`, piData._meta.counts)
  }

  let totalUpdated = 0
  let totalSkipped = 0
  const errors: string[] = []

  for (const [exportKey, handlerKey] of Object.entries(EXPORT_KEY_MAP)) {
    const handler = HANDLERS[handlerKey]
    if (!handler) continue

    const tableData = piData[exportKey]
    if (!tableData || !Array.isArray(tableData)) {
      if (tableData?.error) {
        errors.push(`${handlerKey}: ${tableData.error}`)
      }
      totalSkipped++
      continue
    }

    try {
      const count = await handler(tableData)
      totalUpdated += count
      console.log(`[synthesis] ${handlerKey}: ${count} rows`)
    } catch (err) {
      const msg = `${handlerKey}: ${err instanceof Error ? err.message : 'unknown'}`
      console.error(`[synthesis] ${msg}`)
      errors.push(msg)
    }
  }

  // Write sync audit log
  try {
    await db.execute(sql`
      INSERT INTO openclaw.sync_audit_log
        (sync_type, started_at, completed_at, records_processed, records_accepted, records_quarantined, records_skipped, metadata)
      VALUES (
        'synthesis_sync', ${new Date().toISOString()}, ${new Date().toISOString()},
        ${totalUpdated + totalSkipped}, ${totalUpdated}, 0, ${totalSkipped},
        ${JSON.stringify({ errors, piMeta: piData._meta })}::jsonb
      )
    `)
  } catch (err) {
    console.error('[synthesis] Audit log write failed (non-blocking):', err)
  }

  // Bust caches that might show synthesis data
  try {
    revalidateTag('synthesis-data')
    revalidateTag('ingredient-prices')
    revalidateTag('sale-calendar')
  } catch {
    // non-blocking
  }

  console.log(
    `[synthesis] Complete: ${totalUpdated} rows synced, ${errors.length} errors`
  )

  return {
    success: errors.length === 0,
    cartridge: 'synthesis-intel',
    matched: totalUpdated,
    updated: totalUpdated,
    skipped: totalSkipped,
    errors: errors.length,
    errorDetails: errors.length > 0 ? errors : undefined,
  }
}
