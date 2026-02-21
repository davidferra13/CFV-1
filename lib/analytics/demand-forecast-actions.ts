// Demand Forecast Actions
// Predicts monthly inquiry volume based on historical seasonality patterns.
// Uses demand_forecasts table (chef_id FK, new table).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type DemandForecastMonth = {
  month: number
  year: number
  predictedInquiryCount: number
  actualInquiryCount: number | null
  confidence: number
}

export type SeasonalHeatmap = {
  year: number
  months: DemandForecastMonth[]
}

// --- Zod Schemas ---

const GenerateForecastSchema = z.object({
  year: z.number().int().min(2020).max(2035),
})

const GetHeatmapSchema = z.object({
  year: z.number().int().min(2020).max(2035).optional(),
})

// --- Actions ---

/**
 * Generate demand forecast for each month of the given year.
 * For each month, looks at the same month in previous years and averages
 * the inquiry counts. Confidence is based on years of data available:
 * 1 year = 0.3, 2 years = 0.6, 3+ years = 0.85.
 */
export async function generateDemandForecast(
  year: number
): Promise<{ success: boolean; months: DemandForecastMonth[] }> {
  const validated = GenerateForecastSchema.parse({ year })
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch all inquiries for this chef, grouped by year-month
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('created_at')
    .eq('tenant_id', user.tenantId!)

  // Group inquiry counts by year-month
  const monthCounts = new Map<string, number>() // key: 'YYYY-MM'
  for (const inq of (inquiries || [])) {
    if (!inq.created_at) continue
    const d = new Date(inq.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthCounts.set(key, (monthCounts.get(key) || 0) + 1)
  }

  // Get distinct years of data
  const years = new Set<number>()
  for (const key of monthCounts.keys()) {
    years.add(parseInt(key.split('-')[0]))
  }
  // Exclude the target year from historical data
  const historicalYears = Array.from(years).filter(y => y < validated.year).sort()

  // Also get actual inquiry counts for the target year (if any exist)
  const actualCounts = new Map<number, number>()
  for (let m = 1; m <= 12; m++) {
    const key = `${validated.year}-${String(m).padStart(2, '0')}`
    if (monthCounts.has(key)) {
      actualCounts.set(m, monthCounts.get(key)!)
    }
  }

  const results: DemandForecastMonth[] = []

  for (let month = 1; month <= 12; month++) {
    // Collect same-month counts from historical years
    const historicalValues: number[] = []
    for (const hy of historicalYears) {
      const key = `${hy}-${String(month).padStart(2, '0')}`
      if (monthCounts.has(key)) {
        historicalValues.push(monthCounts.get(key)!)
      }
    }

    // Predict: average of historical values for this month
    const predictedInquiryCount = historicalValues.length > 0
      ? Math.round(historicalValues.reduce((s, v) => s + v, 0) / historicalValues.length)
      : 0

    // Confidence based on years of data
    let confidence = 0
    if (historicalValues.length >= 3) {
      confidence = 0.85
    } else if (historicalValues.length === 2) {
      confidence = 0.6
    } else if (historicalValues.length === 1) {
      confidence = 0.3
    }

    const actualInquiryCount = actualCounts.get(month) ?? null

    results.push({
      month,
      year: validated.year,
      predictedInquiryCount,
      actualInquiryCount,
      confidence,
    })
  }

  // Upsert all 12 months into demand_forecasts
  for (const r of results) {
    const { error } = await (supabase as any)
      .from('demand_forecasts')
      .upsert(
        {
          chef_id: user.tenantId!,
          month: r.month,
          year: r.year,
          predicted_inquiry_count: r.predictedInquiryCount,
          actual_inquiry_count: r.actualInquiryCount,
          confidence: r.confidence,
        },
        { onConflict: 'chef_id,month,year' }
      )

    if (error) {
      console.error(`[generateDemandForecast] Error upserting month ${r.month}:`, error)
    }
  }

  revalidatePath('/analytics')

  return { success: true, months: results }
}

/**
 * Get 12-month seasonal heatmap (predicted vs actual inquiry counts).
 * Defaults to the current year.
 */
export async function getSeasonalHeatmap(year?: number): Promise<SeasonalHeatmap> {
  const validated = GetHeatmapSchema.parse({ year })
  const targetYear = validated.year ?? new Date().getFullYear()

  const user = await requireChef()
  const supabase = createServerClient()

  const { data: forecasts, error } = await (supabase as any)
    .from('demand_forecasts')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('year', targetYear)
    .order('month', { ascending: true })

  if (error) {
    console.error('[getSeasonalHeatmap] Error:', error)
  }

  // Build full 12-month array, filling in any missing months
  const forecastMap = new Map<number, any>()
  for (const f of (forecasts || [])) {
    forecastMap.set(f.month, f)
  }

  const months: DemandForecastMonth[] = []
  for (let m = 1; m <= 12; m++) {
    const f = forecastMap.get(m)
    months.push({
      month: m,
      year: targetYear,
      predictedInquiryCount: f?.predicted_inquiry_count ?? 0,
      actualInquiryCount: f?.actual_inquiry_count ?? null,
      confidence: f ? parseFloat(f.confidence) : 0,
    })
  }

  return { year: targetYear, months }
}
