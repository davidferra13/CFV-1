'use client'

// Revenue Per Hour Dashboard Card
// Shows effective hourly rate, trend vs last month, and a mini hours breakdown bar.

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { HoursBreakdown } from '@/lib/finance/revenue-per-hour-actions'

type Props = {
  effectiveRateCents: number
  cookingOnlyRateCents: number
  percentChange: number | null
  breakdown: HoursBreakdown
  nonCookingPercent: number
  eventsWithTimeData: number
}

const CATEGORY_COLORS: Record<keyof HoursBreakdown, string> = {
  cooking: '#16a34a',   // green-600
  prep: '#2563eb',      // blue-600
  shopping: '#d97706',  // amber-600
  driving: '#9333ea',   // purple-600
  cleanup: '#64748b',   // slate-500
}

const CATEGORY_LABELS: Record<keyof HoursBreakdown, string> = {
  cooking: 'Cooking',
  prep: 'Prep',
  shopping: 'Shopping',
  driving: 'Driving',
  cleanup: 'Cleanup',
}

export function RevenuePerHourCard({
  effectiveRateCents,
  cookingOnlyRateCents,
  percentChange,
  breakdown,
  nonCookingPercent,
  eventsWithTimeData,
}: Props) {
  const totalHours = Object.values(breakdown).reduce((a, b) => a + b, 0)

  if (eventsWithTimeData === 0) {
    return (
      <Link href="/finance/revenue-per-hour">
        <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
          <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Effective Hourly Rate</p>
          <p className="text-2xl font-bold text-stone-400">No data yet</p>
          <p className="text-xs text-stone-400 mt-2">
            Track your time on events to see your real hourly rate
          </p>
        </Card>
      </Link>
    )
  }

  return (
    <Link href="/finance/revenue-per-hour">
      <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Effective Hourly Rate</p>
            <p className="text-3xl font-bold text-stone-900">
              {formatCurrency(effectiveRateCents)}<span className="text-base font-normal text-stone-400">/hr</span>
            </p>
          </div>
          {percentChange !== null && (
            <div className={`text-sm font-medium px-2 py-0.5 rounded ${
              percentChange >= 0
                ? 'text-emerald-700 bg-emerald-50'
                : 'text-red-700 bg-red-50'
            }`}>
              {percentChange >= 0 ? '+' : ''}{percentChange}%
            </div>
          )}
        </div>

        {/* Mini breakdown bar */}
        {totalHours > 0 && (
          <div className="mt-3">
            <div className="flex h-2 rounded-full overflow-hidden bg-stone-100">
              {(Object.keys(CATEGORY_COLORS) as (keyof HoursBreakdown)[]).map(key => {
                const pct = (breakdown[key] / totalHours) * 100
                if (pct <= 0) return null
                return (
                  <div
                    key={key}
                    style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[key] }}
                    title={`${CATEGORY_LABELS[key]}: ${breakdown[key].toFixed(1)}h (${Math.round(pct)}%)`}
                  />
                )
              })}
            </div>
            <div className="flex gap-3 mt-1.5 flex-wrap">
              {(Object.keys(CATEGORY_COLORS) as (keyof HoursBreakdown)[]).map(key => {
                if (breakdown[key] <= 0) return null
                return (
                  <div key={key} className="flex items-center gap-1 text-xs text-stone-500">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[key] }}
                    />
                    {CATEGORY_LABELS[key]}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Insight text */}
        <p className="text-xs text-stone-500 mt-3">
          Your cooking rate is {formatCurrency(cookingOnlyRateCents)}/hr, but your effective
          rate is {formatCurrency(effectiveRateCents)}/hr when you include {nonCookingPercent}% non-cooking time.
        </p>
      </Card>
    </Link>
  )
}
