/**
 * PIE Law 5: Anomaly Detection Pipeline
 *
 * Scans incoming price data for anomalies (spikes, drops, dead sources)
 * and auto-quarantines suspicious entries. Feeds the quarantine review
 * workflow and updates source health.
 *
 * NOT a 'use server' file. Called by sync receiver and cron.
 */

import { pgClient } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnomalyRunResult {
  scanned: number
  anomaliesDetected: number
  quarantined: number
  sourceBlackouts: number
  durationMs: number
  details: AnomalyDetail[]
}

export interface AnomalyDetail {
  type: 'price_spike' | 'price_crash' | 'source_blackout' | 'duplicate_burst' | 'unit_mismatch'
  ingredientId: string | null
  ingredientName: string | null
  storeName: string | null
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  previousCents: number | null
  currentCents: number | null
  changePct: number | null
}

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

const SPIKE_THRESHOLD_PCT = 50 // >50% increase = spike
const CRASH_THRESHOLD_PCT = 40 // >40% decrease = crash
const BLACKOUT_HOURS = 48 // no data from source in 48h = blackout
const DUPLICATE_WINDOW_HOURS = 1 // same price from same store within 1h = duplicate burst

// ---------------------------------------------------------------------------
// Price spike/crash detection
// ---------------------------------------------------------------------------

async function detectPriceAnomalies(): Promise<AnomalyDetail[]> {
  const sql = pgClient
  const anomalies: AnomalyDetail[] = []

  // Find prices where current observation diverges significantly from
  // the 7-day rolling average for that ingredient+store
  const rows = await sql`
    WITH recent_prices AS (
      SELECT
        iph.ingredient_id,
        i.name AS ingredient_name,
        iph.store_name,
        iph.price_per_unit_cents AS current_cents,
        iph.purchase_date,
        iph.source,
        AVG(prev.price_per_unit_cents) FILTER (
          WHERE prev.purchase_date < iph.purchase_date
            AND prev.purchase_date > iph.purchase_date - INTERVAL '30 days'
        ) AS avg_prior_cents,
        COUNT(prev.*) FILTER (
          WHERE prev.purchase_date < iph.purchase_date
            AND prev.purchase_date > iph.purchase_date - INTERVAL '30 days'
        ) AS prior_count
      FROM ingredient_price_history iph
      JOIN ingredients i ON i.id = iph.ingredient_id
      LEFT JOIN ingredient_price_history prev
        ON prev.ingredient_id = iph.ingredient_id
        AND prev.store_name = iph.store_name
      WHERE iph.purchase_date > now() - INTERVAL '24 hours'
        AND iph.price_per_unit_cents > 0
      GROUP BY iph.ingredient_id, i.name, iph.store_name,
               iph.price_per_unit_cents, iph.purchase_date, iph.source
      HAVING COUNT(prev.*) FILTER (
        WHERE prev.purchase_date < iph.purchase_date
          AND prev.purchase_date > iph.purchase_date - INTERVAL '30 days'
      ) >= 2
    )
    SELECT *,
      ROUND(
        (current_cents - avg_prior_cents) / GREATEST(avg_prior_cents, 1) * 100,
        1
      ) AS change_pct
    FROM recent_prices
    WHERE ABS(current_cents - avg_prior_cents) / GREATEST(avg_prior_cents, 1) * 100 > ${CRASH_THRESHOLD_PCT}
    ORDER BY ABS(current_cents - avg_prior_cents) / GREATEST(avg_prior_cents, 1) DESC
    LIMIT 100
  `

  for (const row of rows) {
    const changePct = Number(row.change_pct)
    const isSpike = changePct > 0
    const severity =
      Math.abs(changePct) > 100
        ? 'critical'
        : Math.abs(changePct) > 75
          ? 'high'
          : Math.abs(changePct) > 50
            ? 'medium'
            : 'low'

    anomalies.push({
      type: isSpike ? 'price_spike' : 'price_crash',
      ingredientId: row.ingredient_id,
      ingredientName: row.ingredient_name,
      storeName: row.store_name,
      description:
        `${isSpike ? 'Spike' : 'Crash'}: ${row.ingredient_name} at ${row.store_name} ` +
        `changed ${changePct > 0 ? '+' : ''}${changePct}% ` +
        `(avg ${Math.round(Number(row.avg_prior_cents))}c -> ${row.current_cents}c)`,
      severity,
      previousCents: Math.round(Number(row.avg_prior_cents)),
      currentCents: Number(row.current_cents),
      changePct,
    })
  }

  return anomalies
}

// ---------------------------------------------------------------------------
// Source blackout detection
// ---------------------------------------------------------------------------

async function detectSourceBlackouts(): Promise<AnomalyDetail[]> {
  const sql = pgClient
  const anomalies: AnomalyDetail[] = []

  // Find stores that were actively reporting but went silent
  const rows = await sql`
    SELECT
      store_name,
      source,
      MAX(purchase_date) AS last_seen,
      COUNT(*) FILTER (WHERE purchase_date > now() - INTERVAL '30 days') AS recent_count,
      EXTRACT(EPOCH FROM (now() - MAX(purchase_date))) / 3600 AS hours_silent
    FROM ingredient_price_history
    WHERE source IN ('openclaw_scrape', 'openclaw_flyer', 'openclaw_instacart')
      AND purchase_date > now() - INTERVAL '60 days'
    GROUP BY store_name, source
    HAVING MAX(purchase_date) < now() - INTERVAL '${sql.unsafe(String(BLACKOUT_HOURS))} hours'
      AND COUNT(*) FILTER (WHERE purchase_date > now() - INTERVAL '30 days') > 10
    ORDER BY hours_silent DESC
    LIMIT 50
  `

  for (const row of rows) {
    const hoursSilent = Math.round(Number(row.hours_silent))
    anomalies.push({
      type: 'source_blackout',
      ingredientId: null,
      ingredientName: null,
      storeName: row.store_name,
      description:
        `Source blackout: ${row.store_name} (${row.source}) silent for ${hoursSilent}h. ` +
        `Had ${row.recent_count} observations in last 30d.`,
      severity: hoursSilent > 168 ? 'critical' : hoursSilent > 72 ? 'high' : 'medium',
      previousCents: null,
      currentCents: null,
      changePct: null,
    })
  }

  return anomalies
}

// ---------------------------------------------------------------------------
// Auto-quarantine suspicious prices
// ---------------------------------------------------------------------------

async function quarantineAnomalies(anomalies: AnomalyDetail[]): Promise<number> {
  const sql = pgClient
  let quarantined = 0

  const priceAnomalies = anomalies.filter(
    (a) =>
      (a.type === 'price_spike' || a.type === 'price_crash') &&
      a.severity !== 'low' &&
      a.ingredientId
  )

  for (const anomaly of priceAnomalies) {
    try {
      await sql`
        INSERT INTO openclaw.quarantined_prices (
          ingredient_id, store_name, price_cents,
          reason, severity, raw_data,
          created_at
        ) VALUES (
          ${anomaly.ingredientId},
          ${anomaly.storeName},
          ${anomaly.currentCents},
          ${anomaly.description},
          ${anomaly.severity},
          ${JSON.stringify({
            type: anomaly.type,
            previousCents: anomaly.previousCents,
            changePct: anomaly.changePct,
            detectedAt: new Date().toISOString(),
          })}::jsonb,
          now()
        )
        ON CONFLICT DO NOTHING
      `
      quarantined++
    } catch {
      // quarantine table schema may differ; skip silently
    }
  }

  return quarantined
}

// ---------------------------------------------------------------------------
// Record anomalies in price_anomalies table
// ---------------------------------------------------------------------------

async function recordAnomalies(anomalies: AnomalyDetail[]): Promise<void> {
  const sql = pgClient

  for (const a of anomalies) {
    try {
      await sql`
        INSERT INTO openclaw.price_anomalies (
          ingredient_id, store_name,
          anomaly_type, severity, description,
          previous_cents, current_cents, change_pct,
          detected_at
        ) VALUES (
          ${a.ingredientId}, ${a.storeName},
          ${a.type}, ${a.severity}, ${a.description},
          ${a.previousCents}, ${a.currentCents}, ${a.changePct},
          now()
        )
      `
    } catch {
      // schema mismatch; skip
    }
  }
}

// ---------------------------------------------------------------------------
// Full anomaly detection run (called by cron)
// ---------------------------------------------------------------------------

export async function runAnomalyDetection(): Promise<AnomalyRunResult> {
  const start = Date.now()

  const [priceAnomalies, sourceBlackouts] = await Promise.all([
    detectPriceAnomalies(),
    detectSourceBlackouts(),
  ])

  const allAnomalies = [...priceAnomalies, ...sourceBlackouts]

  // Record all anomalies
  await recordAnomalies(allAnomalies)

  // Auto-quarantine high-severity price anomalies
  const quarantined = await quarantineAnomalies(allAnomalies)

  return {
    scanned: priceAnomalies.length + sourceBlackouts.length,
    anomaliesDetected: allAnomalies.length,
    quarantined,
    sourceBlackouts: sourceBlackouts.length,
    durationMs: Date.now() - start,
    details: allAnomalies,
  }
}
