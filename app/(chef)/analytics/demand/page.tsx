// Demand Forecast — Seasonal heatmap of booking patterns
// Helps chefs plan capacity and marketing around busy/quiet periods

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getSeasonalHeatmap } from '@/lib/analytics/demand-forecast-actions'
import { getHolidayYearOverYear } from '@/lib/analytics/seasonality'
import { DemandHeatmap } from '@/components/analytics/demand-heatmap'
import { HolidayYoYTable } from '@/components/analytics/holiday-yoy-table'
import { StaticCSVDownloadButton } from '@/components/exports/static-csv-download-button'

export const metadata: Metadata = { title: 'Demand Forecast - ChefFlow' }

export default async function DemandForecastPage() {
  await requireChef()

  const [heatmapData, holidayYoY] = await Promise.all([
    getSeasonalHeatmap().catch(() => null),
    getHolidayYearOverYear().catch(() => []),
  ])
  const exportRows: Array<Array<string | number | null>> = [
    ...(heatmapData?.months.map((month) => [
      'forecast',
      month.year,
      month.month,
      month.predictedInquiryCount,
      month.actualInquiryCount,
      month.confidence,
    ]) ?? []),
    ...(holidayYoY as any[]).map((row) => [
      'holiday',
      row.holidayName ?? row.holiday_name ?? row.holiday,
      row.currentYearCount ?? row.current_year_count ?? '',
      row.previousYearCount ?? row.previous_year_count ?? '',
      row.yearOverYearPercent ?? row.year_over_year_percent ?? '',
      row.currentYearRevenueCents ?? row.current_year_revenue_cents ?? '',
    ]),
  ]

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
        {exportRows.length > 0 && (
          <StaticCSVDownloadButton
            headers={['section', 'value_1', 'value_2', 'value_3', 'value_4', 'value_5']}
            rows={exportRows}
            filename="demand-forecast.csv"
          />
        )}
      </div>

      {heatmapData ? (
        <DemandHeatmap data={heatmapData} />
      ) : (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
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
