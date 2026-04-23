import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { RevenueForecastPanel } from '@/components/finance/revenue-forecast'
import { getRevenueForecast } from '@/lib/finance/revenue-forecast-actions'

export const metadata: Metadata = { title: 'Revenue Forecast' }

export default async function ForecastPage() {
  await requireChef()
  const initialForecast = await getRevenueForecast(6)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Revenue Forecast</h1>
          <p className="mt-1 text-stone-400">
            Forward revenue outlook from booked events, live pipeline, seasonal baseline, and
            backtested confidence ranges.
          </p>
        </div>

        <Link
          href="/finance/reporting/yoy-comparison"
          className="text-sm text-stone-400 transition-colors hover:text-stone-200"
        >
          Year-over-year comparison
        </Link>
      </div>

      <RevenueForecastPanel initialForecast={initialForecast} initialMonths={6} />
    </div>
  )
}
