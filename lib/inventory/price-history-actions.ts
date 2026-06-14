// Ingredient Price History Server Actions
// Records every price change with source tracking.
// Enables trend analysis, seasonal patterns, and vendor comparison.
// Formula > AI: All calculations are deterministic.

'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// ── Types ────────────────────────────────────────────────────────────────────

export type PriceSource = 'manual' | 'po_receipt' | 'vendor_invoice' | 'grocery_entry' | 'import'

export type PriceHistoryEntry = {
  id: string
  ingredientId: string
  priceCents: number
  unit: string
  source: PriceSource
  sourceId: string | null
  vendorId: string | null
  recordedAt: string
  notes: string | null
  createdAt: string
}

export type PriceTrend = {
  ingredientId: string
  direction: 'rising' | 'falling' | 'stable' | 'insufficient_data'
  currentPriceCents: number | null
  previousPriceCents: number | null
  changePercent: number | null
  dataPoints: number
}

export type SeasonalPattern = {
  month: number
  monthName: string
  avgPriceCents: number
  minPriceCents: number
  maxPriceCents: number
  dataPoints: number
}

export type MonthlyAverage = {
  year: number
  month: number
  avgPriceCents: number
  dataPoints: number
}

// ── Record a Price Point ─────────────────────────────────────────────────────

/**
 * Record a price observation for an ingredient.
 * Also updates ingredients.last_price_cents and last_price_date.
 * This is the single entry point for all price recordings.
 */
export async function recordPricePoint(
  ingredientId: string,
  priceCents: number,
  unit: string,
  source: PriceSource,
  options?: {
    sourceId?: string
    vendorId?: string
    recordedAt?: string
    notes?: string
  }
): Promise<{ id: string }> {
  const user = await requireChef()

  const today = new Date()
  const purchaseDate =
    options?.recordedAt ??
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const rows = (await db.execute(sql`
    INSERT INTO ingredient_price_history
      (tenant_id, ingredient_id, price_cents, unit, source, source_id, vendor_id, purchase_date, notes)
    VALUES
      (${user.tenantId!}::uuid, ${ingredientId}::uuid, ${priceCents}, ${unit}, ${source},
       ${options?.sourceId ?? null}::uuid, ${options?.vendorId ?? null}::uuid,
       ${purchaseDate}::date, ${options?.notes ?? null})
    RETURNING id
  `)) as unknown as Array<{ id: string }>

  if (!rows.length) throw new Error('Failed to record price point: no row returned')

  // Update ingredient's last known price (non-blocking)
  try {
    await db.execute(sql`
      UPDATE ingredients
      SET last_price_cents = ${priceCents},
          last_price_date = ${purchaseDate}::date
      WHERE id = ${ingredientId}::uuid
        AND tenant_id = ${user.tenantId!}::uuid
    `)
  } catch (err) {
    console.error('[non-blocking] Failed to update ingredient last price', err)
  }

  return { id: rows[0].id }
}

// ── Query Price History ──────────────────────────────────────────────────────

/**
 * Get price history for an ingredient, newest first.
 */
export async function getIngredientPriceHistory(
  ingredientId: string,
  options?: { months?: number; limit?: number }
): Promise<PriceHistoryEntry[]> {
  const user = await requireChef()

  let cutoffClause = sql``
  if (options?.months) {
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - options.months)
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`
    cutoffClause = sql`AND purchase_date >= ${cutoffStr}::date`
  }

  const limitClause = options?.limit ? sql`LIMIT ${options.limit}` : sql``

  const rows = (await db.execute(sql`
    SELECT id, ingredient_id, price_cents, unit, source, source_id, vendor_id,
           purchase_date::text AS purchase_date, notes, created_at::text AS created_at
    FROM ingredient_price_history
    WHERE tenant_id = ${user.tenantId!}::uuid
      AND ingredient_id = ${ingredientId}::uuid
      ${cutoffClause}
    ORDER BY purchase_date DESC
    ${limitClause}
  `)) as unknown as Array<{
    id: string
    ingredient_id: string
    price_cents: number
    unit: string
    source: string
    source_id: string | null
    vendor_id: string | null
    purchase_date: string
    notes: string | null
    created_at: string
  }>

  return rows.map((row) => ({
    id: row.id,
    ingredientId: row.ingredient_id,
    priceCents: row.price_cents,
    unit: row.unit,
    source: row.source as PriceSource,
    sourceId: row.source_id,
    vendorId: row.vendor_id,
    recordedAt: row.purchase_date,
    notes: row.notes,
    createdAt: row.created_at,
  }))
}

// ── Trend Analysis ───────────────────────────────────────────────────────────

/**
 * Compute price trend for an ingredient.
 * Compares the average of the last 5 prices to the 5 before that.
 */
export async function getIngredientPriceTrend(ingredientId: string): Promise<PriceTrend> {
  const user = await requireChef()

  const rows = (await db.execute(sql`
    SELECT price_cents
    FROM ingredient_price_history
    WHERE tenant_id = ${user.tenantId!}::uuid
      AND ingredient_id = ${ingredientId}::uuid
    ORDER BY purchase_date DESC
    LIMIT 10
  `)) as unknown as Array<{ price_cents: number }>

  const prices = rows.map((r) => r.price_cents)

  if (prices.length < 3) {
    return {
      ingredientId,
      direction: 'insufficient_data',
      currentPriceCents: prices[0] ?? null,
      previousPriceCents: null,
      changePercent: null,
      dataPoints: prices.length,
    }
  }

  const recentCount = Math.min(5, Math.floor(prices.length / 2))
  const recent = prices.slice(0, recentCount)
  const previous = prices.slice(recentCount, recentCount * 2)

  const recentAvg = recent.reduce((a: number, b: number) => a + b, 0) / recent.length
  const previousAvg = previous.reduce((a: number, b: number) => a + b, 0) / previous.length

  if (previousAvg === 0) {
    return {
      ingredientId,
      direction: 'stable',
      currentPriceCents: Math.round(recentAvg),
      previousPriceCents: 0,
      changePercent: 0,
      dataPoints: prices.length,
    }
  }

  const changePercent = Math.round(((recentAvg - previousAvg) / previousAvg) * 1000) / 10

  let direction: PriceTrend['direction']
  if (changePercent > 5) direction = 'rising'
  else if (changePercent < -5) direction = 'falling'
  else direction = 'stable'

  return {
    ingredientId,
    direction,
    currentPriceCents: Math.round(recentAvg),
    previousPriceCents: Math.round(previousAvg),
    changePercent,
    dataPoints: prices.length,
  }
}

// ── Seasonal Pattern Analysis ────────────────────────────────────────────────

/**
 * Get seasonal price patterns for an ingredient.
 * Groups prices by month-of-year across all years to show when prices are typically high/low.
 */
export async function getSeasonalPricePattern(ingredientId: string): Promise<SeasonalPattern[]> {
  const user = await requireChef()

  const rows = (await db.execute(sql`
    SELECT month, avg_price_cents, min_price_cents, max_price_cents, data_points
    FROM ingredient_monthly_price_avg
    WHERE tenant_id = ${user.tenantId!}::uuid
      AND ingredient_id = ${ingredientId}::uuid
    ORDER BY month ASC
  `)) as unknown as Array<{
    month: number
    avg_price_cents: number
    min_price_cents: number
    max_price_cents: number
    data_points: number
  }>

  const data = rows

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

  // Aggregate across years: group by month
  const byMonth = new Map<
    number,
    { prices: number[]; mins: number[]; maxes: number[]; count: number }
  >()

  for (const row of data || []) {
    const m = row.month as number
    const existing = byMonth.get(m) ?? { prices: [], mins: [], maxes: [], count: 0 }
    existing.prices.push(row.avg_price_cents as number)
    existing.mins.push(row.min_price_cents as number)
    existing.maxes.push(row.max_price_cents as number)
    existing.count += row.data_points as number
    byMonth.set(m, existing)
  }

  const patterns: SeasonalPattern[] = []
  for (let month = 1; month <= 12; month++) {
    const d = byMonth.get(month)
    if (!d || d.prices.length === 0) continue

    patterns.push({
      month,
      monthName: MONTH_NAMES[month],
      avgPriceCents: Math.round(d.prices.reduce((a, b) => a + b, 0) / d.prices.length),
      minPriceCents: Math.min(...d.mins),
      maxPriceCents: Math.max(...d.maxes),
      dataPoints: d.count,
    })
  }

  return patterns
}

// ── Monthly Averages (for time-series charts) ────────────────────────────────

/**
 * Get monthly average prices for an ingredient over the past N months.
 */
export async function getMonthlyPriceAverages(
  ingredientId: string,
  months: number = 12
): Promise<MonthlyAverage[]> {
  const user = await requireChef()

  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  const cutoffYear = cutoff.getFullYear()
  const cutoffMonth = cutoff.getMonth() + 1

  const rows = (await db.execute(sql`
    SELECT year, month, avg_price_cents, data_points
    FROM ingredient_monthly_price_avg
    WHERE tenant_id = ${user.tenantId!}::uuid
      AND ingredient_id = ${ingredientId}::uuid
      AND (year > ${cutoffYear} OR (year = ${cutoffYear} AND month >= ${cutoffMonth}))
    ORDER BY year ASC, month ASC
  `)) as unknown as Array<{
    year: number
    month: number
    avg_price_cents: number
    data_points: number
  }>

  return rows.map((row) => ({
    year: row.year,
    month: row.month,
    avgPriceCents: row.avg_price_cents,
    dataPoints: row.data_points,
  }))
}
