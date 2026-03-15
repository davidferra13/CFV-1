'use client'

// Mileage Summary Widget - Dashboard card showing YTD miles and deduction.
// Compares current month vs previous month.

import { Car } from '@/components/ui/icons'
import type { MileageSummary } from '@/lib/finance/mileage-actions'

interface Props {
  summary: MileageSummary
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

const MONTH_NAMES = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function MileageSummaryWidget({ summary }: Props) {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1

  const thisMonthData = summary.byMonth.find((m) => m.month === currentMonth)
  const lastMonthData = summary.byMonth.find((m) => m.month === previousMonth)

  const thisMonthMiles = thisMonthData?.totalMiles ?? 0
  const lastMonthMiles = lastMonthData?.totalMiles ?? 0

  const diff = thisMonthMiles - lastMonthMiles
  const diffPct =
    lastMonthMiles > 0 ? Math.round((diff / lastMonthMiles) * 100) : thisMonthMiles > 0 ? 100 : 0

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Car className="h-4 w-4 text-blue-400" />
        <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
          Mileage
        </span>
      </div>

      {/* YTD totals */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xl font-bold text-stone-100">{summary.totalMiles.toFixed(1)}</p>
          <p className="text-xs text-stone-500">YTD miles</p>
        </div>
        <div>
          <p className="text-xl font-bold text-emerald-500">
            {formatCents(summary.totalDeductionCents)}
          </p>
          <p className="text-xs text-stone-500">YTD deduction</p>
        </div>
      </div>

      {/* Month comparison */}
      <div className="border-t border-stone-800 pt-3">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-stone-400">{MONTH_NAMES[currentMonth]}: </span>
            <span className="text-stone-200 font-medium">{thisMonthMiles.toFixed(1)} mi</span>
          </div>
          <div>
            <span className="text-stone-400">{MONTH_NAMES[previousMonth]}: </span>
            <span className="text-stone-200 font-medium">{lastMonthMiles.toFixed(1)} mi</span>
          </div>
        </div>

        {(thisMonthMiles > 0 || lastMonthMiles > 0) && (
          <p className="text-xs mt-1.5">
            <span
              className={
                diff > 0 ? 'text-amber-400' : diff < 0 ? 'text-emerald-400' : 'text-stone-500'
              }
            >
              {diff > 0 ? '+' : ''}
              {diff.toFixed(1)} mi ({diffPct > 0 ? '+' : ''}
              {diffPct}%)
            </span>
            <span className="text-stone-500"> vs last month</span>
          </p>
        )}
      </div>

      <p className="text-[10px] text-stone-600 mt-3">IRS 2026: 72.5¢/mi</p>
    </div>
  )
}
