// Ingredient Price History Server Actions
// Records every price change with source tracking.
// Enables trend analysis, seasonal patterns, and vendor comparison.
// Formula > AI: All calculations are deterministic.

'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

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
  const supabase: any = createServerClient()

  // Insert price history entry
  const { data, error } = await supabase
    .from('ingredient_price_history')
    .insert({
      tenant_id: user.tenantId!,
      ingredient_id: ingredientId,
      price_cents: priceCents,
      unit,
      source,
      source_id: options?.sourceId ?? null,
      vendor_id: options?.vendorId ?? null,
      purchase_date: options?.recordedAt ?? new Date().toISOString().split('T')[0],
      notes: options?.notes ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to record price point: ${error.message}`)

  // Update ingredient's last known price (non-blocking)
  try {
    await supabase
      .from('ingredients')
      .update({
        last_price_cents: priceCents,
        last_price_date: options?.recordedAt ?? new Date().toISOString().split('T')[0],
      })
      .eq('id', ingredientId)
      .eq('tenant_id', user.tenantId!)
  } catch (err) {
    console.error('[non-blocking] Failed to update ingredient last price', err)
  }

  return { id: data.id }
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
  const supabase: any = createServerClient()

  let query = supabase
    .from('ingredient_price_history')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('ingredient_id', ingredientId)
    .order('purchase_date', { ascending: false })

  if (options?.months) {
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - options.months)
    query = query.gte('purchase_date', cutoff.toISOString().split('T')[0])
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch price history: ${error.message}`)

  return (data || []).map((row: any) => ({
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
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('ingredient_price_history')
    .select('price_cents')
    .eq('tenant_id', user.tenantId!)
    .eq('ingredient_id', ingredientId)
    .order('purchase_date', { ascending: false })
    .limit(10)

  if (error) throw new Error(`Failed to fetch price trend: ${error.message}`)

  const prices = (data || []).map((r: any) => r.price_cents as number)

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
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('ingredient_monthly_price_avg')
    .select('month, avg_price_cents, min_price_cents, max_price_cents, data_points')
    .eq('tenant_id', user.tenantId!)
    .eq('ingredient_id', ingredientId)
    .order('month', { ascending: true })

  if (error) throw new Error(`Failed to fetch seasonal pattern: ${error.message}`)

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
  const supabase: any = createServerClient()

  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  const cutoffYear = cutoff.getFullYear()
  const cutoffMonth = cutoff.getMonth() + 1

  const { data, error } = await supabase
    .from('ingredient_monthly_price_avg')
    .select('year, month, avg_price_cents, data_points')
    .eq('tenant_id', user.tenantId!)
    .eq('ingredient_id', ingredientId)
    .or(`year.gt.${cutoffYear},and(year.eq.${cutoffYear},month.gte.${cutoffMonth})`)
    .order('year', { ascending: true })
    .order('month', { ascending: true })

  if (error) throw new Error(`Failed to fetch monthly averages: ${error.message}`)

  return (data || []).map((row: any) => ({
    year: row.year,
    month: row.month,
    avgPriceCents: row.avg_price_cents,
    dataPoints: row.data_points,
  }))
}
