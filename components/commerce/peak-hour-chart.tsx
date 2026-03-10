'use client'

import { useState } from 'react'
import type { PeakHourResult } from '@/lib/commerce/analytics-actions'

interface PeakHourChartProps {
  data: PeakHourResult[]
}

function formatHour(h: number): string {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

export function PeakHourChart({ data }: PeakHourChartProps) {
  const [mode, setMode] = useState<'count' | 'revenue'>('count')

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500 text-sm">No sales data for this period</div>
    )
  }

  const maxValue = Math.max(
    ...data.map((d) => (mode === 'count' ? d.salesCount : d.revenueCents)),
    1
  )
  const avgValue =
    data.reduce((sum, d) => sum + (mode === 'count' ? d.salesCount : d.revenueCents), 0) /
    Math.max(data.length, 1)

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('count')}
          className={`text-xs px-3 py-1 rounded-md transition-colors ${
            mode === 'count'
              ? 'bg-brand-600 text-white'
              : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
          }`}
        >
          By Count
        </button>
        <button
          onClick={() => setMode('revenue')}
          className={`text-xs px-3 py-1 rounded-md transition-colors ${
            mode === 'revenue'
              ? 'bg-brand-600 text-white'
              : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
          }`}
        >
          By Revenue
        </button>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1 h-48 relative">
        {/* Average line */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-stone-600 z-10"
          style={{ bottom: `${(avgValue / maxValue) * 100}%` }}
        >
          <span className="absolute -top-4 right-0 text-[10px] text-stone-500">
            avg {mode === 'count' ? Math.round(avgValue) : `$${(avgValue / 100).toFixed(0)}`}
          </span>
        </div>

        {data.map((d) => {
          const value = mode === 'count' ? d.salesCount : d.revenueCents
          const heightPct = maxValue > 0 ? (value / maxValue) * 100 : 0

          return (
            <div
              key={d.hour}
              className="flex-1 flex flex-col items-center justify-end h-full group"
            >
              {/* Tooltip */}
              <div className="hidden group-hover:block absolute -top-8 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 z-20 whitespace-nowrap">
                {formatHour(d.hour)}: {d.salesCount} sales, ${(d.revenueCents / 100).toFixed(2)},
                avg ${(d.avgCheckCents / 100).toFixed(2)}
              </div>
              {/* Bar */}
              <div
                className={`w-full rounded-t transition-all ${
                  d.isPeak ? 'bg-brand-500' : 'bg-stone-600'
                } hover:opacity-80`}
                style={{ height: `${Math.max(heightPct, 2)}%` }}
              />
              {/* Label */}
              <span className="text-[9px] text-stone-500 mt-1">{formatHour(d.hour)}</span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-brand-500 inline-block" /> Peak hours
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-stone-600 inline-block" /> Normal
        </span>
      </div>
    </div>
  )
}
