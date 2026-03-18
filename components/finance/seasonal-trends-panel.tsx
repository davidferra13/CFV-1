'use client'

import { useEffect, useState, useTransition } from 'react'
import { getSeasonalTrends, type SeasonalTrendsResult } from '@/lib/finance/yoy-comparison-actions'

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function getHeatColor(value: number, max: number): string {
  if (max === 0) return 'bg-gray-100'
  const ratio = value / max
  if (ratio >= 0.8) return 'bg-emerald-500 text-white'
  if (ratio >= 0.6) return 'bg-emerald-400 text-white'
  if (ratio >= 0.4) return 'bg-emerald-300 text-gray-900'
  if (ratio >= 0.2) return 'bg-emerald-200 text-gray-900'
  if (ratio > 0) return 'bg-emerald-100 text-gray-700'
  return 'bg-gray-100 text-gray-400'
}

type Props = {
  defaultYearsBack?: number
}

export default function SeasonalTrendsPanel({ defaultYearsBack = 3 }: Props) {
  const [data, setData] = useState<SeasonalTrendsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await getSeasonalTrends(defaultYearsBack)
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load seasonal trends')
        setData(null)
      }
    })
  }, [defaultYearsBack])

  const maxEventCount = data ? Math.max(...data.months.map((m) => m.totalEventCount), 1) : 1

  const maxRevenue = data ? Math.max(...data.months.map((m) => m.avgRevenueCents), 1) : 1

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Seasonal Trends</h3>
        {data && data.yearsAnalyzed.length > 0 && (
          <p className="text-sm text-gray-500">
            Based on {data.yearsAnalyzed.length} year{data.yearsAnalyzed.length !== 1 ? 's' : ''} of
            data ({data.yearsAnalyzed.join(', ')})
          </p>
        )}
      </div>

      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {isPending && !data && (
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">
          Loading...
        </div>
      )}

      {data && (
        <>
          {/* Peak / Slow season badges */}
          <div className="mb-4 flex gap-3">
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
              Peak: {data.months[data.peakMonth - 1]?.monthName}
            </span>
            <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-800">
              Slowest: {data.months[data.slowestMonth - 1]?.monthName}
            </span>
          </div>

          {/* Heatmap: Event Count */}
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-gray-700">Event Activity</p>
            <div className="grid grid-cols-12 gap-1">
              {data.months.map((month) => (
                <div
                  key={month.month}
                  className={`flex flex-col items-center rounded p-2 ${getHeatColor(month.totalEventCount, maxEventCount)}`}
                  title={`${month.monthName}: ${month.totalEventCount} events (avg ${month.avgEventCount}/yr)`}
                >
                  <span className="text-xxs font-medium">{month.monthName}</span>
                  <span className="text-sm font-bold">{month.totalEventCount}</span>
                  <span className="text-xxs">{month.avgEventCount}/yr</span>
                </div>
              ))}
            </div>
          </div>

          {/* Heatmap: Average Revenue */}
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-gray-700">Avg Monthly Revenue</p>
            <div className="grid grid-cols-12 gap-1">
              {data.months.map((month) => (
                <div
                  key={month.month}
                  className={`flex flex-col items-center rounded p-2 ${getHeatColor(month.avgRevenueCents, maxRevenue)}`}
                  title={`${month.monthName}: avg ${formatCents(month.avgRevenueCents)}/yr (total ${formatCents(month.totalRevenueCents)})`}
                >
                  <span className="text-xxs font-medium">{month.monthName}</span>
                  <span className="text-xs font-bold">{formatCents(month.avgRevenueCents)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detail table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-2 py-1 text-left font-medium text-gray-500">Month</th>
                  <th className="px-2 py-1 text-right font-medium text-gray-500">Total Events</th>
                  <th className="px-2 py-1 text-right font-medium text-gray-500">Avg Events/Yr</th>
                  <th className="px-2 py-1 text-right font-medium text-gray-500">Avg Revenue/Yr</th>
                  <th className="px-2 py-1 text-right font-medium text-gray-500">Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((month) => (
                  <tr key={month.month} className="border-b border-gray-100">
                    <td className="px-2 py-1 font-medium text-gray-700">{month.monthName}</td>
                    <td className="px-2 py-1 text-right text-gray-600">{month.totalEventCount}</td>
                    <td className="px-2 py-1 text-right text-gray-600">{month.avgEventCount}</td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {formatCents(month.avgRevenueCents)}
                    </td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {formatCents(month.totalRevenueCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
