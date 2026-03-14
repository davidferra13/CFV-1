'use client'

// Comparative Periods Widget - Month-over-month and year-over-year comparison
// Toggle between "vs Last Month" and "vs Last Year"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { ArrowUp, ArrowDown } from '@/components/ui/icons'
import type { ComparativePeriods } from '@/lib/dashboard/actions'

interface Props {
  periods: ComparativePeriods
}

export function ComparativePeriodsWidget({ periods }: Props) {
  const [mode, setMode] = useState<'month' | 'year'>('month')
  const comparison = mode === 'month' ? periods.vsLastMonth : periods.vsSameMonthLastYear

  if (!comparison) {
    // If year-over-year data isn't available, only show month-over-month
    if (mode === 'year') setMode('month')
  }

  const data = comparison ?? periods.vsLastMonth
  const label = mode === 'month' ? 'vs last month' : 'vs same month last year'

  return (
    <Card className="border-stone-700">
      <CardContent className="py-3 space-y-2">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-stone-200">Performance</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setMode('month')}
              className={`text-[10px] px-2 py-0.5 rounded ${mode === 'month' ? 'bg-brand-700 text-brand-100' : 'bg-stone-800 text-stone-400'}`}
            >
              vs Last Month
            </button>
            {periods.vsSameMonthLastYear && (
              <button
                type="button"
                onClick={() => setMode('year')}
                className={`text-[10px] px-2 py-0.5 rounded ${mode === 'year' ? 'bg-brand-700 text-brand-100' : 'bg-stone-800 text-stone-400'}`}
              >
                vs Last Year
              </button>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <DeltaMetric
            label="Revenue"
            value={formatCurrency(periods.thisMonth.revenueCents)}
            delta={data.revenueDelta}
            deltaLabel={`${data.revenuePercent > 0 ? '+' : ''}${data.revenuePercent}%`}
            format="currency"
          />
          <DeltaMetric
            label="Events"
            value={String(periods.thisMonth.eventCount)}
            delta={data.eventsDelta}
            deltaLabel={`${data.eventsDelta > 0 ? '+' : ''}${data.eventsDelta}`}
            format="number"
          />
        </div>

        <p className="text-[10px] text-stone-500 text-right">{label}</p>
      </CardContent>
    </Card>
  )
}

function DeltaMetric({
  label,
  value,
  delta,
  deltaLabel,
}: {
  label: string
  value: string
  delta: number
  deltaLabel: string
  format: 'currency' | 'number'
}) {
  const isPositive = delta > 0
  const isNeutral = delta === 0

  return (
    <div>
      <p className="text-xs text-stone-400">{label}</p>
      <p className="text-lg font-semibold text-stone-100">{value}</p>
      <div
        className={`flex items-center gap-0.5 text-xs font-medium ${isNeutral ? 'text-stone-400' : isPositive ? 'text-emerald-400' : 'text-red-400'}`}
      >
        {!isNeutral &&
          (isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
        <span>{deltaLabel}</span>
      </div>
    </div>
  )
}
