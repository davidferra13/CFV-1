/**
 * Seasonal Price Analysis
 *
 * Analyzes historical price data to identify seasonal patterns.
 * Tells a chef "strawberries are cheapest in June" or "beef prices
 * spike in May before Memorial Day."
 *
 * Uses the idx_iph_seasonal index on ingredient_price_history
 * (indexed by tenant_id, ingredient_id, EXTRACT(month FROM purchase_date)).
 *
 * NOT a 'use server' file. Called by server actions or API routes.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export interface MonthlyPrice {
  month: number
  month_name: string
  avg_cents: number
  min_cents: number
  max_cents: number
  data_points: number
}

export interface SeasonalPattern {
  ingredient_name: string
  ingredient_id: string
  cheapest_month: number
  cheapest_month_name: string
  most_expensive_month: number
  most_expensive_month_name: string
  price_swing_pct: number
  monthly_prices: MonthlyPrice[]
  has_seasonal_pattern: boolean
}

const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export async function getSeasonalPattern(
  ingredientId: string,
  tenantId: string
): Promise<SeasonalPattern | null> {
  const rows = (await db.execute(sql`
    SELECT
      EXTRACT(month FROM purchase_date)::int AS month,
      ROUND(AVG(price_per_unit_cents))::int AS avg_cents,
      MIN(price_per_unit_cents)::int AS min_cents,
      MAX(price_per_unit_cents)::int AS max_cents,
      count(*)::int AS data_points
    FROM ingredient_price_history
    WHERE ingredient_id = ${ingredientId}
      AND tenant_id = ${tenantId}
      AND price_per_unit_cents > 0
      AND price_per_unit_cents < 50000
    GROUP BY EXTRACT(month FROM purchase_date)
    HAVING count(*) >= 2
    ORDER BY month
  `)) as unknown as Array<{
    month: number
    avg_cents: number
    min_cents: number
    max_cents: number
    data_points: number
  }>

  if (rows.length < 3) return null // need at least 3 months of data

  // Get ingredient name
  const nameRow = (await db.execute(sql`
    SELECT name FROM ingredients WHERE id = ${ingredientId}
    UNION ALL
    SELECT name FROM system_ingredients WHERE id = ${ingredientId}
    LIMIT 1
  `)) as unknown as Array<{ name: string }>

  const ingredientName = nameRow[0]?.name || 'Unknown'

  const monthly: MonthlyPrice[] = rows.map((r) => ({
    month: r.month,
    month_name: MONTH_NAMES[r.month] || '',
    avg_cents: r.avg_cents,
    min_cents: r.min_cents,
    max_cents: r.max_cents,
    data_points: r.data_points,
  }))

  // Find cheapest and most expensive months
  const sorted = [...monthly].sort((a, b) => a.avg_cents - b.avg_cents)
  const cheapest = sorted[0]
  const mostExpensive = sorted[sorted.length - 1]

  // Calculate swing
  const swingPct =
    mostExpensive.avg_cents > 0
      ? Math.round(((mostExpensive.avg_cents - cheapest.avg_cents) / cheapest.avg_cents) * 100)
      : 0

  // A pattern is "seasonal" if the swing is > 15%
  const hasPattern = swingPct > 15

  return {
    ingredient_name: ingredientName,
    ingredient_id: ingredientId,
    cheapest_month: cheapest.month,
    cheapest_month_name: cheapest.month_name,
    most_expensive_month: mostExpensive.month,
    most_expensive_month_name: mostExpensive.month_name,
    price_swing_pct: swingPct,
    monthly_prices: monthly,
    has_seasonal_pattern: hasPattern,
  }
}

/**
 * Get seasonal tips for an upcoming month.
 * "What's cheapest this month? What should I avoid?"
 */
export async function getSeasonalTips(
  tenantId: string,
  targetMonth?: number
): Promise<
  Array<{ ingredient_name: string; ingredient_id: string; tip: string; avg_cents: number }>
> {
  const month = targetMonth || new Date().getMonth() + 1

  const rows = (await db.execute(sql`
    WITH monthly AS (
      SELECT
        i.name AS ingredient_name,
        iph.ingredient_id,
        EXTRACT(month FROM iph.purchase_date)::int AS month,
        ROUND(AVG(iph.price_per_unit_cents))::int AS avg_cents
      FROM ingredient_price_history iph
      JOIN ingredients i ON i.id = iph.ingredient_id
      WHERE iph.tenant_id = ${tenantId}
        AND iph.price_per_unit_cents > 0
      GROUP BY i.name, iph.ingredient_id, EXTRACT(month FROM iph.purchase_date)
      HAVING count(*) >= 2
    ),
    ranked AS (
      SELECT *,
        avg_cents - MIN(avg_cents) OVER (PARTITION BY ingredient_id) AS diff_from_cheapest,
        ROUND(100.0 * (avg_cents - MIN(avg_cents) OVER (PARTITION BY ingredient_id))
          / NULLIF(MIN(avg_cents) OVER (PARTITION BY ingredient_id), 0)) AS pct_above_cheapest
      FROM monthly
    )
    SELECT ingredient_name, ingredient_id, avg_cents, pct_above_cheapest
    FROM ranked
    WHERE month = ${month}
      AND pct_above_cheapest IS NOT NULL
    ORDER BY pct_above_cheapest ASC
    LIMIT 20
  `)) as unknown as Array<{
    ingredient_name: string
    ingredient_id: string
    avg_cents: number
    pct_above_cheapest: number
  }>

  return rows.map((r) => ({
    ingredient_name: r.ingredient_name,
    ingredient_id: r.ingredient_id,
    avg_cents: r.avg_cents,
    tip:
      r.pct_above_cheapest <= 5
        ? `${r.ingredient_name} is at its cheapest right now`
        : r.pct_above_cheapest <= 15
          ? `${r.ingredient_name} is near its annual low`
          : r.pct_above_cheapest >= 30
            ? `${r.ingredient_name} is ${r.pct_above_cheapest}% above its cheapest month. Consider substitutes.`
            : `${r.ingredient_name} is ${r.pct_above_cheapest}% above its annual low`,
  }))
}
