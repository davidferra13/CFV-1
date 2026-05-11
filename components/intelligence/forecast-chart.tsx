'use client'

import type { MonthlyForecast } from '@/lib/intelligence/revenue-forecast-actions'

type Props = {
  data: MonthlyForecast[]
}

function formatDollars(cents: number): string {
  const d = Math.round(cents / 100)
  if (d >= 1000) return `$${(d / 1000).toFixed(d >= 10000 ? 0 : 1)}k`
  return `$${d}`
}

export function ForecastChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center text-stone-500">
        No forecast data available
      </div>
    )
  }

  const maxTotal = Math.max(...data.map((d) => d.total), 1)
  const chartHeight = 240
  const barWidth = 48
  const barGap = 12
  const chartWidth = data.length * (barWidth + barGap) + barGap
  const yAxisWidth = 54
  const totalWidth = yAxisWidth + chartWidth
  const topPadding = 24
  const bottomPadding = 48

  // Y-axis ticks (5 levels)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = Math.round((maxTotal / 4) * i)
    return { val, y: topPadding + chartHeight - (chartHeight * (val / maxTotal)) }
  })

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalWidth} ${chartHeight + topPadding + bottomPadding}`}
        className="w-full min-w-[400px]"
        role="img"
        aria-label="Revenue forecast stacked bar chart"
      >
        {/* Y-axis grid lines and labels */}
        {yTicks.map(({ val, y }) => (
          <g key={val}>
            <line
              x1={yAxisWidth}
              y1={y}
              x2={totalWidth}
              y2={y}
              stroke="currentColor"
              className="text-stone-800"
              strokeDasharray="4 4"
            />
            <text
              x={yAxisWidth - 6}
              y={y + 4}
              textAnchor="end"
              className="fill-stone-500 text-[10px]"
            >
              {formatDollars(val)}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((m, i) => {
          const x = yAxisWidth + barGap + i * (barWidth + barGap)
          const totalH = (m.total / maxTotal) * chartHeight
          const confirmedH = (m.confirmed / maxTotal) * chartHeight
          const probableH = (m.probable / maxTotal) * chartHeight
          const projectedH = (m.projected / maxTotal) * chartHeight
          const baseY = topPadding + chartHeight

          // Stack: confirmed at bottom, probable in middle, projected on top
          const confirmedY = baseY - confirmedH
          const probableY = confirmedY - probableH
          const projectedY = probableY - projectedH

          return (
            <g key={m.month}>
              {/* Confirmed (dark green) */}
              {confirmedH > 0 && (
                <rect
                  x={x}
                  y={confirmedY}
                  width={barWidth}
                  height={confirmedH}
                  rx={2}
                  className="fill-emerald-600"
                />
              )}

              {/* Probable (light green) */}
              {probableH > 0 && (
                <rect
                  x={x}
                  y={probableY}
                  width={barWidth}
                  height={probableH}
                  rx={2}
                  className="fill-emerald-400/70"
                />
              )}

              {/* Projected (dotted outline) */}
              {projectedH > 0 && (
                <rect
                  x={x}
                  y={projectedY}
                  width={barWidth}
                  height={projectedH}
                  rx={2}
                  fill="none"
                  stroke="currentColor"
                  className="text-emerald-500/50"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
              )}

              {/* Total label above bar */}
              {totalH > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={projectedY - 6}
                  textAnchor="middle"
                  className="fill-stone-300 text-[10px] font-medium"
                >
                  {formatDollars(m.total)}
                </text>
              )}

              {/* Month label */}
              <text
                x={x + barWidth / 2}
                y={baseY + 16}
                textAnchor="middle"
                className="fill-stone-400 text-[11px]"
              >
                {m.monthLabel.split(' ')[0]}
              </text>

              {/* Confidence dot */}
              <circle
                cx={x + barWidth / 2}
                cy={baseY + 30}
                r={4}
                className={
                  m.confidence >= 0.7
                    ? 'fill-emerald-500'
                    : m.confidence >= 0.4
                      ? 'fill-amber-500'
                      : 'fill-stone-600'
                }
              />
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 px-1">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-emerald-600" />
          <span className="text-xs text-stone-400">Confirmed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-emerald-400/70" />
          <span className="text-xs text-stone-400">Probable</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm border border-dashed border-emerald-500/50" />
          <span className="text-xs text-stone-400">Projected</span>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-stone-500">High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-[10px] text-stone-500">Med</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-stone-600" />
            <span className="text-[10px] text-stone-500">Low</span>
          </div>
        </div>
      </div>
    </div>
  )
}
