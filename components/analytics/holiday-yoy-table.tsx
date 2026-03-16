'use client'

import { TrendingUp, TrendingDown, Minus, Sparkles } from '@/components/ui/icons'
import { type HolidayYoYRow } from '@/lib/analytics/seasonality'

interface HolidayYoYTableProps {
  rows: HolidayYoYRow[]
  currentYear: number
}

function formatCents(cents: number): string {
  if (cents === 0) return '-'
  return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function TrendIcon({ trend }: { trend: HolidayYoYRow['trend'] }) {
  if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-green-600" />
  if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-red-500" />
  if (trend === 'new') return <Sparkles className="h-3.5 w-3.5 text-amber-500" />
  return <Minus className="h-3.5 w-3.5 text-stone-400" />
}

function trendLabel(trend: HolidayYoYRow['trend']): string {
  if (trend === 'up') return 'More bookings this year'
  if (trend === 'down') return 'Fewer bookings this year'
  if (trend === 'new') return 'First booking this year'
  return 'Steady'
}

export function HolidayYoYTable({ rows, currentYear }: HolidayYoYTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-800 p-6 text-center">
        <p className="text-stone-500 text-sm">
          No holiday booking data yet. Complete events near major holidays to see year-over-year
          trends.
        </p>
      </div>
    )
  }

  const years = [currentYear - 2, currentYear - 1, currentYear]

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-800">
        <h3 className="text-sm font-semibold text-stone-100">Holiday Bookings - Year Over Year</h3>
        <p className="text-xs text-stone-500 mt-0.5">
          Events within ±3 weeks of each holiday. High-relevance holidays only.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-800 bg-stone-800">
              <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Holiday
              </th>
              {years.map((y) => (
                <th
                  key={y}
                  className={`text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide ${y === currentYear ? 'text-amber-700' : 'text-stone-500'}`}
                >
                  {y}
                  {y === currentYear && (
                    <span className="ml-1 normal-case text-amber-500">(YTD)</span>
                  )}
                </th>
              ))}
              <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Trend
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {rows.map((row) => {
              return (
                <tr key={row.holidayName} className="hover:bg-stone-800 transition-colors">
                  <td className="px-5 py-3 font-medium text-stone-200">{row.holidayName}</td>
                  {years.map((y) => {
                    const stat = row.years.find((s) => s.year === y)
                    const isCurrentYear = y === currentYear
                    return (
                      <td
                        key={y}
                        className={`px-4 py-3 text-center ${isCurrentYear ? 'bg-amber-950/40' : ''}`}
                      >
                        {stat && stat.eventCount > 0 ? (
                          <div>
                            <div
                              className={`font-semibold ${isCurrentYear ? 'text-amber-800' : 'text-stone-300'}`}
                            >
                              {stat.eventCount} event{stat.eventCount !== 1 ? 's' : ''}
                            </div>
                            <div className="text-xs text-stone-400 mt-0.5">
                              {formatCents(stat.totalRevenueCents)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-stone-300 text-xs">-</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 text-center">
                    <div
                      className="flex items-center justify-center gap-1"
                      title={trendLabel(row.trend)}
                    >
                      <TrendIcon trend={row.trend} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
