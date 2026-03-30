'use server'

/**
 * Ingredient Trend Forecasting (Phase J)
 * Simple linear regression on price history to predict next month's price.
 * Not AI, just math.
 *
 * "Eggs trending up 12% this month. Consider locking in a vendor price now."
 */

import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

interface Forecast {
  forecastCents: number
  direction: 'rising' | 'falling' | 'stable'
  changePct: number
}

// ---------------------------------------------------------------------------
// Linear regression
// ---------------------------------------------------------------------------

function forecastPrice(history: Array<{ date: string; priceCents: number }>): Forecast | null {
  if (history.length < 5) return null

  const n = history.length

  // Convert dates to numeric x values (days since first record)
  const firstDate = new Date(history[0].date).getTime()
  const xValues = history.map(
    (h) => (new Date(h.date).getTime() - firstDate) / (1000 * 60 * 60 * 24)
  )
  const yValues = history.map((h) => h.priceCents)

  // Least squares regression: y = mx + b
  const sumX = xValues.reduce((a, b) => a + b, 0)
  const sumY = yValues.reduce((a, b) => a + b, 0)
  const sumXY = xValues.reduce((s, x, i) => s + x * yValues[i], 0)
  const sumX2 = xValues.reduce((s, x) => s + x * x, 0)

  const denominator = n * sumX2 - sumX * sumX
  if (denominator === 0) return null // all same date

  const slope = (n * sumXY - sumX * sumY) / denominator
  const intercept = (sumY - slope * sumX) / n

  const lastX = xValues[xValues.length - 1]
  const currentPrice = yValues[yValues.length - 1]
  const forecastX = lastX + 30 // 30 days ahead
  const forecastCents = Math.round(slope * forecastX + intercept)
  const changePct = currentPrice > 0 ? ((forecastCents - currentPrice) / currentPrice) * 100 : 0

  // Clamp to +/- 99% to fit numeric(5,2) and reject wild outliers
  const clampedPct = Math.max(-99, Math.min(99, changePct))

  return {
    forecastCents: Math.max(0, forecastCents),
    direction: clampedPct > 2 ? 'rising' : clampedPct < -2 ? 'falling' : 'stable',
    changePct: Math.round(clampedPct * 100) / 100,
  }
}

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

/**
 * Run trend forecasting for all ingredients. Called as part of the polish job.
 */
export async function runTrendForecasting(options?: {
  dryRun?: boolean
}): Promise<{ forecasted: number; errors: string[] }> {
  const dryRun = options?.dryRun ?? false
  const errors: string[] = []
  let forecasted = 0

  try {
    // Get ingredients with 5+ price records in last 90 days
    const combos = (await db.execute(sql`
      SELECT
        ingredient_id,
        array_agg(
          json_build_object(
            'date', purchase_date::text,
            'priceCents', price_cents
          ) ORDER BY purchase_date ASC
        ) as history
      FROM ingredient_price_history
      WHERE price_cents IS NOT NULL
        AND price_cents > 0
        AND purchase_date > CURRENT_DATE - 90
      GROUP BY ingredient_id
      HAVING COUNT(*) >= 5
    `)) as unknown as Array<{
      ingredient_id: string
      history: string | Array<{ date: string; priceCents: number }>
    }>

    for (const combo of combos) {
      try {
        const history: Array<{ date: string; priceCents: number }> =
          typeof combo.history === 'string' ? JSON.parse(combo.history) : combo.history

        const forecast = forecastPrice(
          history.map((h) => ({
            date: h.date,
            priceCents: Number(h.priceCents),
          }))
        )

        if (!forecast) continue

        if (!dryRun) {
          await db.execute(sql`
            UPDATE ingredients
            SET
              price_forecast_30d_cents = ${forecast.forecastCents},
              price_forecast_direction = ${forecast.direction},
              price_forecast_pct = ${forecast.changePct},
              forecast_updated_at = now()
            WHERE id = ${combo.ingredient_id}
          `)
        }

        forecasted++
      } catch (err) {
        errors.push(
          `[forecast] ${combo.ingredient_id}: ${err instanceof Error ? err.message : 'unknown'}`
        )
      }
    }
  } catch (err) {
    errors.push(`[forecast] Query failed: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  console.log(`[forecast] Forecasted ${forecasted} ingredients, ${errors.length} errors`)
  return { forecasted, errors }
}
