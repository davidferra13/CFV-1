'use server'

/**
 * Sale Cycle Detection (Phase H)
 * Analyzes price history to detect repeating sale patterns per ingredient per store.
 * Pure math on existing data. No new scraping needed.
 *
 * Algorithm:
 * 1. For each ingredient+store combo with 3+ price records
 * 2. Find all price drops > 15% from previous record (= sale events)
 * 3. Calculate intervals between sale events
 * 4. If stddev of intervals < 30% of mean, it's a predictable cycle
 * 5. Predict next sale = last_sale_date + avg_cycle_days
 * 6. Confidence = 1 - (stddev / mean), clamped 0.3-0.95
 */

import { requireChef } from '@/lib/auth/get-user'
import { requireAdmin } from '@/lib/auth/admin'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

interface PriceRecord {
  date: string
  priceCents: number
  storeName: string
}

interface SaleCycle {
  avgCycleDays: number
  lastSaleDate: string
  predictedNextSale: string
  confidence: number
  avgSaleDiscountPct: number
  dataPoints: number
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function stddev(nums: number[]): number {
  if (nums.length < 2) return 0
  const mean = avg(nums)
  const variance = nums.reduce((s, n) => s + (n - mean) ** 2, 0) / (nums.length - 1)
  return Math.sqrt(variance)
}

function daysBetween(a: string, b: string): number {
  return Math.abs((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24))
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// ---------------------------------------------------------------------------
// Core detection
// ---------------------------------------------------------------------------

function detectSaleCycle(history: PriceRecord[]): SaleCycle | null {
  if (history.length < 3) return null

  // Sort by date ascending
  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Find price drops > 15% from the previous record
  const drops: Array<{ date: string; discountPct: number }> = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].priceCents
    const curr = sorted[i].priceCents
    if (prev > 0 && curr < prev) {
      const dropPct = ((prev - curr) / prev) * 100
      if (dropPct >= 15) {
        drops.push({ date: sorted[i].date, discountPct: dropPct })
      }
    }
  }

  if (drops.length < 3) return null // not enough sale events

  // Calculate intervals between drops
  const intervals: number[] = []
  for (let i = 1; i < drops.length; i++) {
    intervals.push(daysBetween(drops[i - 1].date, drops[i].date))
  }

  const meanInterval = avg(intervals)
  const sdInterval = stddev(intervals)

  // Too irregular if stddev > 30% of mean
  if (meanInterval <= 0 || sdInterval / meanInterval > 0.3) return null

  const lastDrop = drops[drops.length - 1]

  return {
    avgCycleDays: Math.round(meanInterval),
    lastSaleDate: lastDrop.date,
    predictedNextSale: addDays(lastDrop.date, Math.round(meanInterval)),
    confidence: Math.max(0.3, Math.min(0.95, 1 - sdInterval / meanInterval)),
    avgSaleDiscountPct: Math.round(avg(drops.map((d) => d.discountPct)) * 100) / 100,
    dataPoints: drops.length,
  }
}

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

/**
 * Run sale cycle detection for all ingredients. Admin only.
 * Called as part of the polish job.
 */
export async function runSaleCycleDetection(options?: {
  dryRun?: boolean
}): Promise<{ detected: number; errors: string[] }> {
  const dryRun = options?.dryRun ?? false
  const errors: string[] = []
  let detected = 0

  try {
    // Get all ingredient+store combos with 3+ price records
    const combos = (await db.execute(sql`
      SELECT
        ingredient_id,
        store_name,
        tenant_id,
        array_agg(
          json_build_object(
            'date', purchase_date::text,
            'priceCents', price_cents
          ) ORDER BY purchase_date ASC
        ) as history
      FROM ingredient_price_history
      WHERE price_cents IS NOT NULL
        AND price_cents > 0
        AND store_name IS NOT NULL
        AND purchase_date IS NOT NULL
      GROUP BY ingredient_id, store_name, tenant_id
      HAVING COUNT(*) >= 3
    `)) as unknown as Array<{
      ingredient_id: string
      store_name: string
      tenant_id: string
      history: string | Array<{ date: string; priceCents: number }>
    }>

    for (const combo of combos) {
      try {
        // Parse the JSON array
        const history: PriceRecord[] =
          typeof combo.history === 'string' ? JSON.parse(combo.history) : combo.history

        const cycle = detectSaleCycle(
          history.map((h) => ({
            date: h.date,
            priceCents: Number(h.priceCents),
            storeName: combo.store_name,
          }))
        )

        if (!cycle) continue

        if (!dryRun) {
          await db.execute(sql`
            INSERT INTO ingredient_sale_cycles (
              ingredient_id, tenant_id, store_name,
              avg_cycle_days, last_sale_date, predicted_next_sale,
              confidence, avg_sale_discount_pct, data_points,
              updated_at
            ) VALUES (
              ${combo.ingredient_id}, ${combo.tenant_id}, ${combo.store_name},
              ${cycle.avgCycleDays}, ${cycle.lastSaleDate}::date, ${cycle.predictedNextSale}::date,
              ${Math.round(cycle.confidence * 100) / 100}, ${cycle.avgSaleDiscountPct}, ${cycle.dataPoints},
              now()
            )
            ON CONFLICT (ingredient_id, tenant_id, store_name) DO UPDATE SET
              avg_cycle_days = EXCLUDED.avg_cycle_days,
              last_sale_date = EXCLUDED.last_sale_date,
              predicted_next_sale = EXCLUDED.predicted_next_sale,
              confidence = EXCLUDED.confidence,
              avg_sale_discount_pct = EXCLUDED.avg_sale_discount_pct,
              data_points = EXCLUDED.data_points,
              updated_at = now()
          `)
        }

        detected++
      } catch (err) {
        errors.push(
          `[sale-cycle] ${combo.ingredient_id}/${combo.store_name}: ${err instanceof Error ? err.message : 'unknown'}`
        )
      }
    }
  } catch (err) {
    errors.push(`[sale-cycle] Query failed: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  console.log(`[sale-cycle] Detected ${detected} predictable cycles, ${errors.length} errors`)
  return { detected, errors }
}

/**
 * Get sale predictions for a specific ingredient or all upcoming sales.
 */
export async function getSalePredictions(options?: { ingredientId?: string }): Promise<{
  predictions: Array<{
    ingredientId: string
    ingredientName: string
    storeName: string
    nextSaleDate: string
    confidence: number
    avgDiscount: number
    cycleDays: number
  }>
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const rows = (await db.execute(sql`
    SELECT
      sc.ingredient_id,
      i.name as ingredient_name,
      sc.store_name,
      sc.predicted_next_sale::text as next_sale_date,
      sc.confidence,
      sc.avg_sale_discount_pct,
      sc.avg_cycle_days
    FROM ingredient_sale_cycles sc
    JOIN ingredients i ON i.id = sc.ingredient_id
    WHERE sc.tenant_id = ${tenantId}
      AND sc.predicted_next_sale >= CURRENT_DATE
      AND sc.confidence >= 0.4
      ${options?.ingredientId ? sql`AND sc.ingredient_id = ${options.ingredientId}` : sql``}
    ORDER BY sc.predicted_next_sale ASC
    LIMIT 50
  `)) as unknown as Array<{
    ingredient_id: string
    ingredient_name: string
    store_name: string
    next_sale_date: string
    confidence: string
    avg_sale_discount_pct: string
    avg_cycle_days: string
  }>

  return {
    predictions: rows.map((r) => ({
      ingredientId: r.ingredient_id,
      ingredientName: r.ingredient_name,
      storeName: r.store_name,
      nextSaleDate: r.next_sale_date,
      confidence: parseFloat(r.confidence),
      avgDiscount: parseFloat(r.avg_sale_discount_pct),
      cycleDays: parseInt(r.avg_cycle_days),
    })),
  }
}
