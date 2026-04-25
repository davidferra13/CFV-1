// Location Demand Forecasting Server Actions
// Predicts covers, revenue, and orders based on historical daily metrics.
// Uses simple moving average + day-of-week weighting (no external AI needed).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ─── Types ───────────────────────────────────────────────────────

export type DemandForecast = {
  id: string
  locationId: string
  forecastDate: string
  predictedCovers: number | null
  predictedRevenueCents: number | null
  predictedOrders: number | null
  confidenceScore: number | null
  factors: Record<string, unknown>
  actualCovers: number | null
  actualRevenueCents: number | null
  variancePct: number | null
}

// ─── Helpers ─────────────────────────────────────────────────────

function mapForecast(row: any): DemandForecast {
  return {
    id: row.id,
    locationId: row.location_id,
    forecastDate: row.forecast_date,
    predictedCovers: row.predicted_covers,
    predictedRevenueCents: row.predicted_revenue_cents ? Number(row.predicted_revenue_cents) : null,
    predictedOrders: row.predicted_orders,
    confidenceScore: row.confidence_score ? Number(row.confidence_score) : null,
    factors: row.factors ?? {},
    actualCovers: row.actual_covers,
    actualRevenueCents: row.actual_revenue_cents ? Number(row.actual_revenue_cents) : null,
    variancePct: row.variance_pct ? Number(row.variance_pct) : null,
  }
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00Z').getUTCDay()
}

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Generate demand forecasts for a location for the next N days.
 * Uses 8-week moving average weighted by day-of-week.
 * Formula > AI (CLAUDE.md rule 0b).
 */
export async function generateForecasts(
  locationId: string,
  daysAhead: number = 7
): Promise<{ success: boolean; forecasts: DemandForecast[]; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get last 8 weeks of daily metrics for this location
  const lookbackDays = 56
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - lookbackDays)

  const { data: historicalMetrics } = await db
    .from('location_daily_metrics')
    .select('date, covers_served, revenue_cents, orders_count')
    .eq('tenant_id', user.tenantId!)
    .eq('location_id', locationId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (!historicalMetrics?.length) {
    return {
      success: true,
      forecasts: [],
      error: 'Insufficient historical data (need at least 2 weeks)',
    }
  }

  // Group by day of week
  const byDow: Map<number, Array<{ covers: number; revenue: number; orders: number }>> = new Map()
  for (const m of historicalMetrics) {
    const dow = getDayOfWeek(m.date)
    const existing = byDow.get(dow) ?? []
    existing.push({
      covers: m.covers_served ?? 0,
      revenue: m.revenue_cents ?? 0,
      orders: m.orders_count ?? 0,
    })
    byDow.set(dow, existing)
  }

  // Generate forecasts for each future day
  const forecasts: DemandForecast[] = []
  const today = new Date()

  for (let i = 1; i <= daysAhead; i++) {
    const forecastDate = new Date(today)
    forecastDate.setDate(forecastDate.getDate() + i)
    const dateStr = forecastDate.toISOString().split('T')[0]
    const dow = forecastDate.getUTCDay()

    const dowData = byDow.get(dow) ?? []
    if (dowData.length === 0) continue

    // Weighted average (more recent weeks get higher weight)
    let totalWeight = 0
    let weightedCovers = 0
    let weightedRevenue = 0
    let weightedOrders = 0

    for (let j = 0; j < dowData.length; j++) {
      const weight = j + 1 // more recent = higher weight
      totalWeight += weight
      weightedCovers += dowData[j].covers * weight
      weightedRevenue += dowData[j].revenue * weight
      weightedOrders += dowData[j].orders * weight
    }

    const predictedCovers = Math.round(weightedCovers / totalWeight)
    const predictedRevenue = Math.round(weightedRevenue / totalWeight)
    const predictedOrders = Math.round(weightedOrders / totalWeight)

    // Confidence based on data quantity and variance
    const coverValues = dowData.map((d) => d.covers)
    const mean = coverValues.reduce((a, b) => a + b, 0) / coverValues.length
    const variance = coverValues.reduce((a, b) => a + (b - mean) ** 2, 0) / coverValues.length
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1
    const dataPoints = Math.min(dowData.length / 8, 1) // 8 weeks = full confidence from data quantity
    const consistency = Math.max(0, 1 - cv) // Lower CV = higher confidence
    const confidence = Math.round((dataPoints * 0.4 + consistency * 0.6) * 100) / 100

    // Upsert forecast
    const { data: inserted, error } = await db
      .from('location_demand_forecasts')
      .upsert(
        {
          tenant_id: user.tenantId!,
          location_id: locationId,
          forecast_date: dateStr,
          predicted_covers: predictedCovers,
          predicted_revenue_cents: predictedRevenue,
          predicted_orders: predictedOrders,
          confidence_score: confidence,
          model_version: 'v1',
          factors: {
            method: 'weighted_moving_average',
            lookback_weeks: 8,
            data_points: dowData.length,
            day_of_week: dow,
            coefficient_of_variation: cv,
          },
        },
        { onConflict: 'location_id,forecast_date,model_version' }
      )
      .select()
      .single()

    if (!error && inserted) {
      forecasts.push(mapForecast(inserted))
    }
  }

  revalidatePath('/locations')
  revalidatePath(`/locations/${locationId}`)
  return { success: true, forecasts }
}

export async function getForecasts(
  locationId: string,
  startDate: string,
  endDate: string
): Promise<DemandForecast[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('location_demand_forecasts')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('location_id', locationId)
    .gte('forecast_date', startDate)
    .lte('forecast_date', endDate)
    .order('forecast_date', { ascending: true })

  if (error) throw new Error(`Failed to get forecasts: ${error.message}`)
  return (data ?? []).map(mapForecast)
}

/**
 * Backfill actuals into forecasts. Called at end of day to measure accuracy.
 */
export async function backfillForecastActuals(
  locationId: string,
  date: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get actual metrics for the date
  const { data: metrics } = await db
    .from('location_daily_metrics')
    .select('covers_served, revenue_cents')
    .eq('location_id', locationId)
    .eq('date', date)
    .single()

  if (!metrics) return { success: false, error: 'No actual metrics for this date' }

  // Get the forecast
  const { data: forecast } = await db
    .from('location_demand_forecasts')
    .select('predicted_covers')
    .eq('location_id', locationId)
    .eq('forecast_date', date)
    .eq('model_version', 'v1')
    .single()

  if (!forecast) return { success: false, error: 'No forecast for this date' }

  const actualCovers = metrics.covers_served ?? 0
  const predictedCovers = forecast.predicted_covers ?? 0
  const variancePct =
    predictedCovers > 0 ? ((actualCovers - predictedCovers) / predictedCovers) * 100 : null

  const { error } = await db
    .from('location_demand_forecasts')
    .update({
      actual_covers: actualCovers,
      actual_revenue_cents: metrics.revenue_cents ?? 0,
      variance_pct: variancePct,
    })
    .eq('location_id', locationId)
    .eq('forecast_date', date)
    .eq('model_version', 'v1')

  if (error) return { success: false, error: error.message }
  return { success: true }
}
