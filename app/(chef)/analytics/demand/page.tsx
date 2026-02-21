// Demand Forecast — Seasonal heatmap of booking patterns
// Helps chefs plan capacity and marketing around busy/quiet periods

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getSeasonalHeatmap } from '@/lib/analytics/demand-forecast-actions'
import { getHolidayYearOverYear } from '@/lib/analytics/seasonality'
import { DemandHeatmap } from '@/components/analytics/demand-heatmap'
import { HolidayYoYTable } from '@/components/analytics/holiday-yoy-table'

export const metadata: Metadata = { title: 'Demand Forecast - ChefFlow' }

export default async function DemandForecastPage() {
  const user = await requireChef()

  const [heatmapData, holidayYoY] = await Promise.all([
    getSeasonalHeatmap().catch(() => null),
    getHolidayYearOverYear().catch(() => []),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/analytics" className="text-sm text-stone-500 hover:text-stone-700">
            &larr; Analytics
          </Link>
          <h1 className="text-3xl font-bold text-stone-900 mt-1">Demand Forecast</h1>
          <p className="text-stone-600 mt-1">
            Seasonal booking patterns to help you plan capacity, pricing, and outreach.
          </p>
        </div>
      </div>

      {heatmapData ? (
        <DemandHeatmap data={heatmapData} />
      ) : (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-8 text-center">
          <p className="text-stone-500 text-sm">
            Not enough historical data to generate a demand forecast. Complete more events across
            different months to see seasonal patterns.
          </p>
        </div>
      )}

      <HolidayYoYTable rows={holidayYoY} currentYear={new Date().getFullYear()} />
    </div>
  )
}
