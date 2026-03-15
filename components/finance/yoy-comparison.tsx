'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { getRevenueComparison, type YoYComparison } from '@/lib/finance/revenue-forecast-actions'

function GrowthBadge({ percent }: { percent: number | null }) {
  if (percent === null) return <span className="text-stone-600">-</span>

  const isPositive = percent > 0
  const isNeutral = percent === 0

  return (
    <span
      className={`text-xs font-medium ${
        isPositive ? 'text-emerald-400' : isNeutral ? 'text-stone-400' : 'text-red-400'
      }`}
    >
      {isPositive ? '+' : ''}
      {percent}%
    </span>
  )
}

export function YoYComparisonPanel() {
  const currentYear = new Date().getFullYear()
  const [year1, setYear1] = useState(currentYear - 1)
  const [year2, setYear2] = useState(currentYear)
  const [comparison, setComparison] = useState<YoYComparison | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getRevenueComparison(year1, year2)
      .then((data) => {
        if (!cancelled) setComparison(data)
      })
      .catch((err) => {
        if (!cancelled) setError('Could not load comparison data')
        console.error('[YoYComparison]', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [year1, year2])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-stone-500">Loading comparison...</CardContent>
      </Card>
    )
  }

  if (error || !comparison) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-red-400">
          {error || 'Could not load comparison data'}
        </CardContent>
      </Card>
    )
  }

  // Find max value for bar scaling
  const maxMonthly = Math.max(
    ...comparison.months.map((m) => Math.max(m.year1Cents, m.year2Cents)),
    1
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Year-over-Year Revenue</CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={year1}
              onChange={(e) => setYear1(parseInt(e.target.value, 10))}
              className="text-xs bg-stone-800 border border-stone-600 rounded px-2 py-1 text-stone-300"
            >
              {Array.from({ length: 5 }, (_, i) => currentYear - 4 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <span className="text-stone-500 text-xs">vs</span>
            <select
              value={year2}
              onChange={(e) => setYear2(parseInt(e.target.value, 10))}
              className="text-xs bg-stone-800 border border-stone-600 rounded px-2 py-1 text-stone-300"
            >
              {Array.from({ length: 5 }, (_, i) => currentYear - 4 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* YTD Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-stone-500">{year1} Total</p>
            <p className="text-lg font-bold text-stone-400">
              {formatCurrency(comparison.year1TotalCents)}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">{year2} Total</p>
            <p className="text-lg font-bold text-stone-200">
              {formatCurrency(comparison.year2TotalCents)}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Growth</p>
            <p className="text-lg font-bold">
              <GrowthBadge percent={comparison.ytdGrowthPercent} />
            </p>
          </div>
        </div>

        {/* Month-by-month comparison bars */}
        <div className="space-y-1.5">
          {/* Legend */}
          <div className="flex gap-4 text-xs text-stone-400 mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-stone-500" />
              <span>{year1}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-brand-500" />
              <span>{year2}</span>
            </div>
          </div>

          {comparison.months.map((m) => (
            <div key={m.month} className="flex items-center gap-2 text-xs">
              {/* Month label */}
              <span className="w-8 text-stone-500 shrink-0">{m.label}</span>

              {/* Bars */}
              <div className="flex-1 space-y-0.5">
                {/* Year 1 bar */}
                <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-stone-500 rounded-full"
                    style={{ width: `${(m.year1Cents / maxMonthly) * 100}%` }}
                  />
                </div>
                {/* Year 2 bar */}
                <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full"
                    style={{ width: `${(m.year2Cents / maxMonthly) * 100}%` }}
                  />
                </div>
              </div>

              {/* Values */}
              <div className="w-28 text-right shrink-0 flex items-center justify-end gap-2">
                <span className="text-stone-500">{formatCurrency(m.year1Cents)}</span>
                <span className="text-stone-300">{formatCurrency(m.year2Cents)}</span>
              </div>

              {/* Growth */}
              <div className="w-12 text-right shrink-0">
                <GrowthBadge percent={m.growthPercent} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
