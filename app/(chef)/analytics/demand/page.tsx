// Demand Forecast - Seasonal heatmap of booking patterns
// Helps chefs plan capacity and marketing around busy/quiet periods

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getSeasonalHeatmap } from '@/lib/analytics/demand-forecast-actions'
import { getHolidayYearOverYear } from '@/lib/analytics/seasonality'
import { DemandHeatmap } from '@/components/analytics/demand-heatmap'
import { HolidayYoYTable } from '@/components/analytics/holiday-yoy-table'
import { ErrorState } from '@/components/ui/error-state'
import { RetryButton } from '@/components/ui/retry-button'

export const metadata: Metadata = { title: 'Demand Forecast' }

export default async function DemandForecastPage() {
  const user = await requireChef()

  const [heatmapResult, holidayResult] = await Promise.allSettled([
    getSeasonalHeatmap(),
    getHolidayYearOverYear(),
  ])
  const heatmapData = heatmapResult.status === 'fulfilled' ? heatmapResult.value : null
  const heatmapError = heatmapResult.status === 'rejected'
  const holidayYoY = holidayResult.status === 'fulfilled' ? holidayResult.value : []
  const holidayError = holidayResult.status === 'rejected'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/analytics" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Analytics
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Demand Forecast</h1>
          <p className="text-stone-400 mt-1">
            Seasonal booking patterns to help you plan capacity, pricing, and outreach.
          </p>
        </div>
      </div>

      {heatmapError ? (
        <div className="rounded-lg border border-red-900/40 bg-stone-800 p-8">
          <ErrorState
            title="Could not load demand forecast"
            description="Seasonal booking data is unavailable right now."
            size="sm"
          />
          <div className="flex justify-center">
            <RetryButton />
          </div>
        </div>
      ) : heatmapData ? (
        <DemandHeatmap data={heatmapData} />
      ) : (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            Not enough historical data to generate a demand forecast. Complete more events across
            different months to see seasonal patterns.
          </p>
        </div>
      )}

      {holidayError ? (
        <div className="rounded-lg border border-red-900/40 bg-stone-800 p-8">
          <ErrorState
            title="Could not load holiday trends"
            description="Holiday year-over-year data is unavailable right now."
            size="sm"
          />
          <div className="flex justify-center">
            <RetryButton />
          </div>
        </div>
      ) : (
        <HolidayYoYTable rows={holidayYoY} currentYear={new Date().getFullYear()} />
      )}
    </div>
  )
}
