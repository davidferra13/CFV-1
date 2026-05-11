import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRevenueForecastAction } from '@/lib/intelligence/revenue-forecast-actions'
import { ForecastChart } from '@/components/intelligence/forecast-chart'
import { RevenueTracker } from '@/components/intelligence/revenue-tracker'
import { BookingVelocityChart } from '@/components/intelligence/booking-velocity-chart'
import { SeasonalPattern } from '@/components/intelligence/seasonal-pattern'
import { ForecastInsightCard } from '@/components/intelligence/forecast-insight-card'

export const metadata: Metadata = { title: 'Revenue Forecast' }

function formatDollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

export default async function RevenueForecastPage() {
  await requireChef()

  let forecast: Awaited<ReturnType<typeof getRevenueForecastAction>> | null = null
  let loadError: string | null = null

  try {
    forecast = await getRevenueForecastAction(6)
  } catch (err) {
    console.error('[RevenueForecast] Failed to load:', err)
    loadError = 'Failed to load revenue forecast. Please try again later.'
  }

  if (loadError || !forecast) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/analytics" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Analytics
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Revenue Forecast</h1>
        </div>
        <div className="rounded-lg border border-red-800/40 bg-red-950/20 px-4 py-6 text-center">
          <p className="text-stone-400">{loadError ?? 'No forecast data available.'}</p>
        </div>
      </div>
    )
  }

  // Compute quarterly totals for summary
  const q1 = forecast.monthlyForecast.slice(0, 3)
  const quarterTotal = q1.reduce((s, m) => s + m.total, 0)
  const quarterConfirmed = q1.reduce((s, m) => s + m.confirmed, 0)
  const sixMonthTotal = forecast.monthlyForecast.reduce((s, m) => s + m.total, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/analytics" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Analytics
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Revenue Forecast</h1>
          <p className="text-stone-400 mt-1">
            Living projection based on pipeline, seasonal patterns, and booking velocity.
          </p>
        </div>

        {/* Quick stats */}
        <div className="flex gap-3">
          <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2 text-center">
            <p className="text-xs text-stone-500">Next Quarter</p>
            <p className="text-lg font-bold text-stone-100">{formatDollars(quarterTotal)}</p>
          </div>
          <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2 text-center">
            <p className="text-xs text-stone-500">6-Month Total</p>
            <p className="text-lg font-bold text-stone-100">{formatDollars(sixMonthTotal)}</p>
          </div>
        </div>
      </div>

      {/* Current Month Revenue Tracker */}
      <section className="rounded-xl border border-stone-700/40 bg-stone-900/40 p-4">
        <h2 className="text-lg font-semibold text-stone-200 mb-3">
          {forecast.revenueHealth.currentMonthLabel} Revenue
        </h2>
        <RevenueTracker health={forecast.revenueHealth} />
      </section>

      {/* 6-Month Forecast Chart */}
      <section className="rounded-xl border border-stone-700/40 bg-stone-900/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-stone-200">6-Month Forecast</h2>
          {quarterConfirmed > 0 && (
            <span className="text-xs text-stone-500">
              {Math.round((quarterConfirmed / quarterTotal) * 100)}% of next quarter confirmed
            </span>
          )}
        </div>
        <ForecastChart data={forecast.monthlyForecast} />
      </section>

      {/* Two-column: Booking Velocity + Seasonal Pattern */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Booking Velocity */}
        <section className="rounded-xl border border-stone-700/40 bg-stone-900/40 p-4">
          <h2 className="text-lg font-semibold text-stone-200 mb-3">Booking Velocity</h2>
          <BookingVelocityChart velocity={forecast.bookingVelocity} />
        </section>

        {/* Seasonal Pattern */}
        <section className="rounded-xl border border-stone-700/40 bg-stone-900/40 p-4">
          <h2 className="text-lg font-semibold text-stone-200 mb-3">Seasonal Pattern</h2>
          <SeasonalPattern pattern={forecast.seasonalPattern} />
        </section>
      </div>

      {/* Key Insights */}
      {forecast.insights.length > 0 && (
        <section className="rounded-xl border border-stone-700/40 bg-stone-900/40 p-4">
          <h2 className="text-lg font-semibold text-stone-200 mb-3">Key Insights</h2>
          <ForecastInsightCard insights={forecast.insights} />
        </section>
      )}

      {/* Forecast Details Table */}
      <section className="rounded-xl border border-stone-700/40 bg-stone-900/40 p-4 overflow-x-auto">
        <h2 className="text-lg font-semibold text-stone-200 mb-3">Monthly Breakdown</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700/40">
              <th className="py-2 text-left text-stone-400 font-medium">Month</th>
              <th className="py-2 text-right text-stone-400 font-medium">Confirmed</th>
              <th className="py-2 text-right text-stone-400 font-medium">Probable</th>
              <th className="py-2 text-right text-stone-400 font-medium">Projected</th>
              <th className="py-2 text-right text-stone-400 font-medium">Total</th>
              <th className="py-2 text-right text-stone-400 font-medium">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {forecast.monthlyForecast.map((m) => (
              <tr key={m.month} className="border-b border-stone-800/30">
                <td className="py-2 text-stone-200">{m.monthLabel}</td>
                <td className="py-2 text-right text-emerald-400">{formatDollars(m.confirmed)}</td>
                <td className="py-2 text-right text-emerald-300/70">{formatDollars(m.probable)}</td>
                <td className="py-2 text-right text-stone-500">{formatDollars(m.projected)}</td>
                <td className="py-2 text-right text-stone-100 font-medium">{formatDollars(m.total)}</td>
                <td className="py-2 text-right">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                      m.confidence >= 0.7
                        ? 'bg-emerald-900/40 text-emerald-400'
                        : m.confidence >= 0.4
                          ? 'bg-amber-900/40 text-amber-400'
                          : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {Math.round(m.confidence * 100)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-stone-700/40">
              <td className="py-2 text-stone-200 font-medium">Total</td>
              <td className="py-2 text-right text-emerald-400 font-medium">
                {formatDollars(forecast.monthlyForecast.reduce((s, m) => s + m.confirmed, 0))}
              </td>
              <td className="py-2 text-right text-emerald-300/70 font-medium">
                {formatDollars(forecast.monthlyForecast.reduce((s, m) => s + m.probable, 0))}
              </td>
              <td className="py-2 text-right text-stone-500 font-medium">
                {formatDollars(forecast.monthlyForecast.reduce((s, m) => s + m.projected, 0))}
              </td>
              <td className="py-2 text-right text-stone-100 font-bold">
                {formatDollars(sixMonthTotal)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Footer */}
      <p className="text-xs text-stone-600 text-center">
        Forecast generated {new Date(forecast.generatedAt).toLocaleString()}. Updates with every page load.
      </p>
    </div>
  )
}
