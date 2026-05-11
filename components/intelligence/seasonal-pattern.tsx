'use client'

import type { SeasonalPatternMonth } from '@/lib/intelligence/revenue-forecast-actions'

type Props = {
  pattern: SeasonalPatternMonth[]
}

function formatDollars(cents: number): string {
  const d = Math.round(cents / 100)
  if (d >= 1000) return `$${(d / 1000).toFixed(d >= 10000 ? 0 : 1)}k`
  return `$${d}`
}

export function SeasonalPattern({ pattern }: Props) {
  if (!pattern.length) {
    return (
      <div className="flex h-16 items-center justify-center text-stone-500 text-xs">
        No seasonal data
      </div>
    )
  }

  const maxRevenue = Math.max(...pattern.map((m) => m.avgRevenueCents), 1)
  const currentMonth = new Date().getMonth() + 1

  const barWidth = 20
  const barGap = 4
  const chartWidth = pattern.length * (barWidth + barGap)
  const chartHeight = 56
  const bottomPad = 16

  return (
    <div>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight + bottomPad}`}
        className="w-full"
        role="img"
        aria-label="12-month seasonal revenue pattern"
      >
        {pattern.map((m, i) => {
          const x = i * (barWidth + barGap)
          const h = Math.max(2, (m.avgRevenueCents / maxRevenue) * chartHeight)
          const y = chartHeight - h
          const isCurrent = m.month === currentMonth
          const isPeak = m.avgRevenueCents === maxRevenue && maxRevenue > 0

          return (
            <g key={m.month}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={2}
                className={
                  isPeak
                    ? 'fill-emerald-400'
                    : isCurrent
                      ? 'fill-brand-500'
                      : 'fill-stone-700'
                }
              />
              <text
                x={x + barWidth / 2}
                y={chartHeight + 12}
                textAnchor="middle"
                className={`text-[8px] ${isCurrent ? 'fill-stone-200 font-bold' : 'fill-stone-600'}`}
              >
                {m.monthLabel}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Peak indicator */}
      {maxRevenue > 0 && (
        <div className="flex items-center justify-between mt-1 px-0.5">
          <span className="text-[10px] text-stone-600">
            Peak: {pattern.find((m) => m.avgRevenueCents === maxRevenue)?.monthLabel ?? ''}{' '}
            ({formatDollars(maxRevenue)})
          </span>
          <span className="text-[10px] text-stone-600">
            Avg: {formatDollars(Math.round(pattern.reduce((s, m) => s + m.avgRevenueCents, 0) / 12))}
          </span>
        </div>
      )}
    </div>
  )
}
