/**
 * PIE Intelligence Layer 2: Trend Intelligence
 *
 * Price trend forecasting, seasonal pattern detection, and volatility alerts.
 * Helps chefs plan menus and quotes with awareness of where prices are GOING,
 * not just where they ARE.
 *
 * Three core capabilities:
 *   1. Trend Detection - Is a price rising, falling, or stable?
 *   2. Seasonal Forecasting - What will this cost in 2 weeks / 1 month?
 *   3. Volatility Alerts - Which ingredients are unstable right now?
 *
 * NOT a 'use server' file. Called by cron and server actions.
 */

import { pgClient } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrendDirection = 'rising' | 'falling' | 'stable' | 'volatile' | 'insufficient_data'

export interface IngredientTrend {
  ingredientId: string
  ingredientName: string
  category: string
  state: string | null
  direction: TrendDirection
  /** Percentage change over analysis window */
  changePct: number
  /** Confidence in trend direction (0-1) */
  confidence: number
  /** Current price in cents */
  currentCents: number
  /** Price N days ago in cents */
  priorCents: number
  /** Standard deviation of recent prices (volatility measure) */
  volatility: number
  /** Number of observations used */
  observationCount: number
  /** Analysis window in days */
  windowDays: number
  /** Predicted price in 14 days (cents) */
  forecast14d: number | null
  /** Predicted price in 30 days (cents) */
  forecast30d: number | null
  analyzedAt: string
}

export interface SeasonalPattern {
  ingredientId: string
  ingredientName: string
  category: string
  /** Month (1-12) when price is historically lowest */
  cheapestMonth: number
  /** Month (1-12) when price is historically highest */
  expensiveMonth: number
  /** Typical seasonal swing as percentage */
  seasonalSwingPct: number
  /** Current month's typical index (100 = average, 80 = 20% below, 120 = 20% above) */
  currentSeasonalIndex: number
  /** Is the ingredient currently in season (below average)? */
  inSeason: boolean
  /** Monthly price indices (Jan=1 through Dec=12) */
  monthlyIndices: number[]
  confidence: number
}

export interface VolatilityAlert {
  ingredientId: string
  ingredientName: string
  category: string
  state: string | null
  alertType: 'spike' | 'crash' | 'unstable' | 'supply_risk'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  currentCents: number
  normalCents: number
  deviationPct: number
  detectedAt: string
  /** Suggested action for the chef */
  suggestion: string
}

export interface TrendRunResult {
  ingredientsAnalyzed: number
  trendsDetected: number
  seasonalPatternsUpdated: number
  volatilityAlertsGenerated: number
  durationMs: number
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TREND_CONFIG = {
  /** Minimum observations needed to compute a trend */
  minObservations: 5,
  /** Default analysis window in days */
  defaultWindowDays: 30,
  /** Threshold for "rising" classification (%) */
  risingThresholdPct: 5,
  /** Threshold for "falling" classification (%) */
  fallingThresholdPct: -5,
  /** Volatility threshold (coefficient of variation) for "volatile" */
  volatileThreshold: 0.25,
  /** Spike threshold for alerts (%) */
  spikeAlertPct: 30,
  /** Crash threshold for alerts (%) */
  crashAlertPct: -25,
}

// ---------------------------------------------------------------------------
// Trend Detection
// ---------------------------------------------------------------------------

/**
 * Compute trend for a single ingredient across a time window.
 * Uses linear regression on log-prices for robust trend detection.
 */
function computeTrend(
  prices: Array<{ cents: number; observedAt: Date }>,
  windowDays: number
): {
  direction: TrendDirection
  changePct: number
  confidence: number
  volatility: number
  forecast14d: number | null
  forecast30d: number | null
} {
  if (prices.length < TREND_CONFIG.minObservations) {
    return {
      direction: 'insufficient_data',
      changePct: 0,
      confidence: 0,
      volatility: 0,
      forecast14d: null,
      forecast30d: null,
    }
  }

  // Sort by date ascending
  const sorted = [...prices].sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime())

  // Linear regression on cents vs days-from-start
  const startTime = sorted[0].observedAt.getTime()
  const n = sorted.length
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0

  for (const p of sorted) {
    const x = (p.observedAt.getTime() - startTime) / 86400000 // days
    const y = p.cents
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
    sumY2 += y * y
  }

  const meanX = sumX / n
  const meanY = sumY / n
  const slope = (sumXY - n * meanX * meanY) / (sumX2 - n * meanX * meanX || 1)
  const intercept = meanY - slope * meanX

  // R-squared for confidence
  const ssRes = sorted.reduce((acc, p) => {
    const x = (p.observedAt.getTime() - startTime) / 86400000
    const predicted = slope * x + intercept
    return acc + (p.cents - predicted) ** 2
  }, 0)
  const ssTot = sorted.reduce((acc, p) => acc + (p.cents - meanY) ** 2, 0)
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0

  // Change percentage over window
  const startPrice = intercept
  const endPrice = slope * windowDays + intercept
  const changePct = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0

  // Volatility (coefficient of variation)
  const stdDev = Math.sqrt(sumY2 / n - meanY * meanY)
  const volatility = meanY > 0 ? stdDev / meanY : 0

  // Direction classification
  let direction: TrendDirection
  if (volatility > TREND_CONFIG.volatileThreshold) {
    direction = 'volatile'
  } else if (changePct > TREND_CONFIG.risingThresholdPct) {
    direction = 'rising'
  } else if (changePct < TREND_CONFIG.fallingThresholdPct) {
    direction = 'falling'
  } else {
    direction = 'stable'
  }

  // Simple linear forecast
  const lastDay = (sorted[sorted.length - 1].observedAt.getTime() - startTime) / 86400000
  const forecast14d = Math.max(1, Math.round(slope * (lastDay + 14) + intercept))
  const forecast30d = Math.max(1, Math.round(slope * (lastDay + 30) + intercept))

  return {
    direction,
    changePct: Math.round(changePct * 10) / 10,
    confidence: Math.max(0, Math.min(1, rSquared)),
    volatility: Math.round(volatility * 1000) / 1000,
    forecast14d,
    forecast30d,
  }
}

// ---------------------------------------------------------------------------
// Main trend analysis pipeline
// ---------------------------------------------------------------------------

export async function runTrendAnalysis(state?: string): Promise<TrendRunResult> {
  const start = Date.now()
  const sql = pgClient
  let ingredientsAnalyzed = 0
  let trendsDetected = 0
  let volatilityAlerts = 0

  // Get all ingredients with sufficient price history
  const stateFilter = state ? sql`AND iph.state = ${state}` : sql``

  const ingredients = await sql`
    SELECT
      iph.ingredient_id,
      ci.name AS ingredient_name,
      ci.category,
      iph.state,
      ARRAY_AGG(
        JSON_BUILD_OBJECT(
          'cents', iph.price_cents,
          'observed_at', iph.observed_at
        ) ORDER BY iph.observed_at
      ) AS price_history
    FROM openclaw.ingredient_price_history iph
    JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = iph.ingredient_id
    WHERE iph.observed_at > now() - interval '90 days'
      ${stateFilter}
    GROUP BY iph.ingredient_id, ci.name, ci.category, iph.state
    HAVING COUNT(*) >= ${TREND_CONFIG.minObservations}
  `

  // Process each ingredient
  const BATCH_SIZE = 200
  for (let i = 0; i < ingredients.length; i += BATCH_SIZE) {
    const batch = ingredients.slice(i, i + BATCH_SIZE)

    for (const row of batch) {
      const history = (row.price_history as Array<{ cents: number; observed_at: string }>).map(
        (h) => ({ cents: Number(h.cents), observedAt: new Date(h.observed_at) })
      )

      const trend = computeTrend(history, TREND_CONFIG.defaultWindowDays)
      ingredientsAnalyzed++

      if (trend.direction !== 'insufficient_data') {
        trendsDetected++

        const currentCents = history[history.length - 1].cents
        const priorCents = history[0].cents

        // Write trend to database
        await sql`
          INSERT INTO openclaw.ingredient_trends (
            ingredient_id, state, direction, change_pct, confidence,
            volatility, current_cents, prior_cents, observation_count,
            window_days, forecast_14d, forecast_30d, analyzed_at
          ) VALUES (
            ${row.ingredient_id}, ${row.state}, ${trend.direction},
            ${trend.changePct}, ${trend.confidence}, ${trend.volatility},
            ${currentCents}, ${priorCents}, ${history.length},
            ${TREND_CONFIG.defaultWindowDays},
            ${trend.forecast14d}, ${trend.forecast30d}, now()
          )
          ON CONFLICT (ingredient_id, state) DO UPDATE SET
            direction = EXCLUDED.direction,
            change_pct = EXCLUDED.change_pct,
            confidence = EXCLUDED.confidence,
            volatility = EXCLUDED.volatility,
            current_cents = EXCLUDED.current_cents,
            prior_cents = EXCLUDED.prior_cents,
            observation_count = EXCLUDED.observation_count,
            forecast_14d = EXCLUDED.forecast_14d,
            forecast_30d = EXCLUDED.forecast_30d,
            analyzed_at = now()
        `

        // Generate volatility alerts
        if (
          trend.direction === 'volatile' ||
          Math.abs(trend.changePct) > TREND_CONFIG.spikeAlertPct
        ) {
          const alertType =
            trend.changePct > TREND_CONFIG.spikeAlertPct
              ? 'spike'
              : trend.changePct < TREND_CONFIG.crashAlertPct
                ? 'crash'
                : 'unstable'

          const severity =
            Math.abs(trend.changePct) > 50
              ? 'critical'
              : Math.abs(trend.changePct) > 30
                ? 'high'
                : Math.abs(trend.changePct) > 15
                  ? 'medium'
                  : 'low'

          const suggestion =
            alertType === 'spike'
              ? `Consider substitutes or buying ahead. ${row.ingredient_name} up ${trend.changePct}% in 30 days.`
              : alertType === 'crash'
                ? `Good time to stock up on ${row.ingredient_name}. Down ${Math.abs(trend.changePct)}% in 30 days.`
                : `${row.ingredient_name} prices are unpredictable. Lock in pricing for upcoming events.`

          await sql`
            INSERT INTO openclaw.volatility_alerts (
              ingredient_id, ingredient_name, category, state,
              alert_type, severity, message, current_cents, normal_cents,
              deviation_pct, suggestion, detected_at, is_active
            ) VALUES (
              ${row.ingredient_id}, ${row.ingredient_name}, ${row.category},
              ${row.state}, ${alertType}, ${severity},
              ${`${row.ingredient_name}: ${trend.changePct}% change over 30 days`},
              ${currentCents}, ${priorCents},
              ${trend.changePct}, ${suggestion}, now(), true
            )
            ON CONFLICT (ingredient_id, state, alert_type) DO UPDATE SET
              severity = EXCLUDED.severity,
              message = EXCLUDED.message,
              current_cents = EXCLUDED.current_cents,
              deviation_pct = EXCLUDED.deviation_pct,
              suggestion = EXCLUDED.suggestion,
              detected_at = now(),
              is_active = true
          `
          volatilityAlerts++
        }
      }
    }
  }

  // Update seasonal patterns
  const seasonalUpdated = await updateSeasonalPatterns()

  return {
    ingredientsAnalyzed,
    trendsDetected,
    seasonalPatternsUpdated: seasonalUpdated,
    volatilityAlertsGenerated: volatilityAlerts,
    durationMs: Date.now() - start,
  }
}

// ---------------------------------------------------------------------------
// Seasonal Pattern Detection
// ---------------------------------------------------------------------------

async function updateSeasonalPatterns(): Promise<number> {
  const sql = pgClient
  let updated = 0

  // Need at least 6 months of data to detect seasonality
  const ingredients = await sql`
    SELECT
      iph.ingredient_id,
      ci.name AS ingredient_name,
      ci.category,
      EXTRACT(MONTH FROM iph.observed_at)::int AS month,
      AVG(iph.price_cents)::int AS avg_cents
    FROM openclaw.ingredient_price_history iph
    JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = iph.ingredient_id
    WHERE iph.observed_at > now() - interval '18 months'
    GROUP BY iph.ingredient_id, ci.name, ci.category, EXTRACT(MONTH FROM iph.observed_at)
    HAVING COUNT(DISTINCT DATE_TRUNC('month', iph.observed_at)) >= 6
  `

  // Group by ingredient
  const byIngredient = new Map<
    string,
    Array<{ month: number; avgCents: number; name: string; category: string }>
  >()
  for (const row of ingredients) {
    const id = row.ingredient_id as string
    if (!byIngredient.has(id)) byIngredient.set(id, [])
    byIngredient.get(id)!.push({
      month: Number(row.month),
      avgCents: Number(row.avg_cents),
      name: row.ingredient_name as string,
      category: row.category as string,
    })
  }

  for (const [ingredientId, monthlyData] of Array.from(byIngredient.entries())) {
    if (monthlyData.length < 6) continue

    // Compute monthly indices (100 = annual average)
    const annualAvg = monthlyData.reduce((s, m) => s + m.avgCents, 0) / monthlyData.length
    if (annualAvg <= 0) continue

    const monthlyIndices: number[] = new Array(12).fill(100)
    for (const m of monthlyData) {
      monthlyIndices[m.month - 1] = Math.round((m.avgCents / annualAvg) * 100)
    }

    const cheapestMonth = monthlyIndices.indexOf(Math.min(...monthlyIndices)) + 1
    const expensiveMonth = monthlyIndices.indexOf(Math.max(...monthlyIndices)) + 1
    const seasonalSwing = Math.max(...monthlyIndices) - Math.min(...monthlyIndices)

    const currentMonth = new Date().getMonth() // 0-indexed
    const currentIndex = monthlyIndices[currentMonth]
    const inSeason = currentIndex < 100

    // Only store if there's meaningful seasonality (>10% swing)
    if (seasonalSwing > 10) {
      await sql`
        INSERT INTO openclaw.seasonal_patterns (
          ingredient_id, ingredient_name, category,
          cheapest_month, expensive_month, seasonal_swing_pct,
          current_seasonal_index, in_season, monthly_indices,
          confidence, updated_at
        ) VALUES (
          ${ingredientId}, ${monthlyData[0].name}, ${monthlyData[0].category},
          ${cheapestMonth}, ${expensiveMonth}, ${seasonalSwing},
          ${currentIndex}, ${inSeason}, ${monthlyIndices},
          ${Math.min(1, monthlyData.length / 12)}, now()
        )
        ON CONFLICT (ingredient_id) DO UPDATE SET
          cheapest_month = EXCLUDED.cheapest_month,
          expensive_month = EXCLUDED.expensive_month,
          seasonal_swing_pct = EXCLUDED.seasonal_swing_pct,
          current_seasonal_index = EXCLUDED.current_seasonal_index,
          in_season = EXCLUDED.in_season,
          monthly_indices = EXCLUDED.monthly_indices,
          confidence = EXCLUDED.confidence,
          updated_at = now()
      `
      updated++
    }
  }

  return updated
}

// ---------------------------------------------------------------------------
// Query API (for chef-facing features)
// ---------------------------------------------------------------------------

/** Get trends for a list of ingredients (used in menu/event costing) */
export async function getTrendsForIngredients(
  ingredientIds: string[],
  state?: string
): Promise<IngredientTrend[]> {
  if (ingredientIds.length === 0) return []
  const sql = pgClient

  const stateFilter = state ? sql`AND state = ${state}` : sql`AND state IS NULL`

  const rows = await sql`
    SELECT
      ingredient_id, state, direction, change_pct, confidence,
      volatility, current_cents, prior_cents, observation_count,
      window_days, forecast_14d, forecast_30d, analyzed_at
    FROM openclaw.ingredient_trends
    WHERE ingredient_id = ANY(${ingredientIds})
      ${stateFilter}
  `

  // Enrich with names
  const nameMap = new Map<string, { name: string; category: string }>()
  if (rows.length > 0) {
    const ids = rows.map((r) => r.ingredient_id as string)
    const names = await sql`
      SELECT ingredient_id, name, category
      FROM openclaw.canonical_ingredients
      WHERE ingredient_id = ANY(${ids})
    `
    for (const n of names) {
      nameMap.set(n.ingredient_id as string, {
        name: n.name as string,
        category: n.category as string,
      })
    }
  }

  return rows.map((r) => ({
    ingredientId: r.ingredient_id as string,
    ingredientName: nameMap.get(r.ingredient_id as string)?.name || 'Unknown',
    category: nameMap.get(r.ingredient_id as string)?.category || 'unknown',
    state: r.state as string | null,
    direction: r.direction as TrendDirection,
    changePct: Number(r.change_pct),
    confidence: Number(r.confidence),
    currentCents: Number(r.current_cents),
    priorCents: Number(r.prior_cents),
    volatility: Number(r.volatility),
    observationCount: Number(r.observation_count),
    windowDays: Number(r.window_days),
    forecast14d: r.forecast_14d != null ? Number(r.forecast_14d) : null,
    forecast30d: r.forecast_30d != null ? Number(r.forecast_30d) : null,
    analyzedAt: (r.analyzed_at as Date).toISOString(),
  }))
}

/** Get active volatility alerts (for chef dashboard) */
export async function getActiveVolatilityAlerts(
  state?: string,
  limit = 20
): Promise<VolatilityAlert[]> {
  const sql = pgClient
  const stateFilter = state ? sql`AND state = ${state}` : sql``

  const rows = await sql`
    SELECT *
    FROM openclaw.volatility_alerts
    WHERE is_active = true
      ${stateFilter}
    ORDER BY
      CASE severity
        WHEN 'critical' THEN 0
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        ELSE 3
      END,
      ABS(deviation_pct) DESC
    LIMIT ${limit}
  `

  return rows.map((r) => ({
    ingredientId: r.ingredient_id as string,
    ingredientName: r.ingredient_name as string,
    category: r.category as string,
    state: r.state as string | null,
    alertType: r.alert_type as VolatilityAlert['alertType'],
    severity: r.severity as VolatilityAlert['severity'],
    message: r.message as string,
    currentCents: Number(r.current_cents),
    normalCents: Number(r.normal_cents),
    deviationPct: Number(r.deviation_pct),
    detectedAt: (r.detected_at as Date).toISOString(),
    suggestion: r.suggestion as string,
  }))
}

/** Get seasonal patterns for ingredients (for menu planning) */
export async function getSeasonalPatterns(ingredientIds: string[]): Promise<SeasonalPattern[]> {
  if (ingredientIds.length === 0) return []
  const sql = pgClient

  const rows = await sql`
    SELECT *
    FROM openclaw.seasonal_patterns
    WHERE ingredient_id = ANY(${ingredientIds})
  `

  return rows.map((r) => ({
    ingredientId: r.ingredient_id as string,
    ingredientName: r.ingredient_name as string,
    category: r.category as string,
    cheapestMonth: Number(r.cheapest_month),
    expensiveMonth: Number(r.expensive_month),
    seasonalSwingPct: Number(r.seasonal_swing_pct),
    currentSeasonalIndex: Number(r.current_seasonal_index),
    inSeason: r.in_season as boolean,
    monthlyIndices: r.monthly_indices as number[],
    confidence: Number(r.confidence),
  }))
}

/** Get category-level trend summary (for dashboard overview) */
export async function getCategoryTrendSummary(): Promise<
  Array<{
    category: string
    avgChangePct: number
    risingCount: number
    fallingCount: number
    stableCount: number
    volatileCount: number
    topRiser: string | null
    topFaller: string | null
  }>
> {
  const sql = pgClient

  const rows = await sql`
    SELECT
      ci.category,
      ROUND(AVG(it.change_pct)::numeric, 1) AS avg_change_pct,
      COUNT(*) FILTER (WHERE it.direction = 'rising') AS rising_count,
      COUNT(*) FILTER (WHERE it.direction = 'falling') AS falling_count,
      COUNT(*) FILTER (WHERE it.direction = 'stable') AS stable_count,
      COUNT(*) FILTER (WHERE it.direction = 'volatile') AS volatile_count,
      (
        SELECT ci2.name FROM openclaw.ingredient_trends it2
        JOIN openclaw.canonical_ingredients ci2 ON ci2.ingredient_id = it2.ingredient_id
        WHERE ci2.category = ci.category AND it2.direction = 'rising'
        ORDER BY it2.change_pct DESC LIMIT 1
      ) AS top_riser,
      (
        SELECT ci3.name FROM openclaw.ingredient_trends it3
        JOIN openclaw.canonical_ingredients ci3 ON ci3.ingredient_id = it3.ingredient_id
        WHERE ci3.category = ci.category AND it3.direction = 'falling'
        ORDER BY it3.change_pct ASC LIMIT 1
      ) AS top_faller
    FROM openclaw.ingredient_trends it
    JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = it.ingredient_id
    WHERE it.analyzed_at > now() - interval '7 days'
    GROUP BY ci.category
    ORDER BY ABS(AVG(it.change_pct)) DESC
  `

  return rows.map((r) => ({
    category: r.category as string,
    avgChangePct: Number(r.avg_change_pct),
    risingCount: Number(r.rising_count),
    fallingCount: Number(r.falling_count),
    stableCount: Number(r.stable_count),
    volatileCount: Number(r.volatile_count),
    topRiser: r.top_riser as string | null,
    topFaller: r.top_faller as string | null,
  }))
}

/** Dismiss a volatility alert */
export async function dismissAlert(ingredientId: string, state: string | null): Promise<void> {
  const sql = pgClient
  await sql`
    UPDATE openclaw.volatility_alerts
    SET is_active = false, dismissed_at = now()
    WHERE ingredient_id = ${ingredientId}
      AND (state = ${state} OR (state IS NULL AND ${state} IS NULL))
  `
}
