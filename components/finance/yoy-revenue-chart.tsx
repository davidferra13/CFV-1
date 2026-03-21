'use client'

import { useEffect, useState, useTransition } from 'react'
import { getYoyRevenue, type YoyRevenueResult } from '@/lib/finance/yoy-comparison-actions'

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function ChangeIndicator({ percent }: { percent: number | null }) {
  if (percent === null) return <span className="text-sm text-gray-400">N/A</span>
  const isPositive = percent > 0
  const isZero = percent === 0
  return (
    <span
      className={`text-sm font-medium ${isPositive ? 'text-green-600' : isZero ? 'text-gray-500' : 'text-red-600'}`}
    >
      {isPositive ? '+' : ''}
      {percent}%
    </span>
  )
}

type Props = {
  defaultYear1?: number
  defaultYear2?: number
}

export default function YoyRevenueChart({ defaultYear1, defaultYear2 }: Props) {
  const currentYear = new Date().getFullYear()
  const [year1, setYear1] = useState(defaultYear1 ?? currentYear - 1)
  const [year2, setYear2] = useState(defaultYear2 ?? currentYear)
  const [data, setData] = useState<YoyRevenueResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await getYoyRevenue(year1, year2)
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load revenue comparison')
        setData(null)
      }
    })
  }, [year1, year2])

  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i)

  // Find the max value for scaling bars
  const maxValue = data
    ? Math.max(...data.monthly.flatMap((m) => [m.year1Value, m.year2Value]), 1)
    : 1

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Revenue Comparison</h3>
        <div className="flex items-center gap-2">
          <select
            value={year1}
            onChange={(e) => setYear1(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500">vs</span>
          <select
            value={year2}
            onChange={(e) => setYear2(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {isPending && !data && (
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">
          Loading...
        </div>
      )}

      {data && (
        <>
          {/* Summary row */}
          <div className="mb-6 grid grid-cols-3 gap-4 rounded-lg bg-gray-50 p-4">
            <div>
              <p className="text-xs text-gray-500">{data.year1} Total</p>
              <p className="text-lg font-bold text-gray-900">{formatCents(data.year1Total)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{data.year2} Total</p>
              <p className="text-lg font-bold text-gray-900">{formatCents(data.year2Total)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Change</p>
              <p className="text-lg font-bold">
                <ChangeIndicator percent={data.totalChangePercent} />
              </p>
            </div>
          </div>

          {/* Bar chart (table-based fallback) */}
          <div className="space-y-2">
            {data.monthly.map((month) => (
              <div key={month.month} className="flex items-center gap-3">
                <span className="w-8 text-xs font-medium text-gray-500">{month.monthName}</span>
                <div className="flex flex-1 flex-col gap-1">
                  {/* Year 1 bar */}
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 rounded bg-brand-400 transition-all"
                      style={{
                        width: `${(month.year1Value / maxValue) * 100}%`,
                        minWidth: month.year1Value > 0 ? '4px' : '0',
                      }}
                    />
                    <span className="text-xs text-gray-400">{formatCents(month.year1Value)}</span>
                  </div>
                  {/* Year 2 bar */}
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 rounded bg-emerald-500 transition-all"
                      style={{
                        width: `${(month.year2Value / maxValue) * 100}%`,
                        minWidth: month.year2Value > 0 ? '4px' : '0',
                      }}
                    />
                    <span className="text-xs text-gray-400">{formatCents(month.year2Value)}</span>
                  </div>
                </div>
                <div className="w-14 text-right">
                  <ChangeIndicator percent={month.changePercent} />
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="h-2 w-4 rounded bg-brand-400" />
              <span>{data.year1}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-4 rounded bg-emerald-500" />
              <span>{data.year2}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
