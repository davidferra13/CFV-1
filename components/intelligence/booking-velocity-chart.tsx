'use client'

import type { BookingVelocity } from '@/lib/intelligence/revenue-forecast-actions'

type Props = {
  velocity: BookingVelocity
}

export function BookingVelocityChart({ velocity }: Props) {
  const { months } = velocity

  if (!months.length) {
    return (
      <div className="flex h-32 items-center justify-center text-stone-500">
        No booking history available
      </div>
    )
  }

  const maxEvents = Math.max(...months.map((m) => m.eventsBooked), 1)
  const chartWidth = 480
  const chartHeight = 120
  const leftPad = 32
  const rightPad = 8
  const topPad = 12
  const bottomPad = 28
  const plotWidth = chartWidth - leftPad - rightPad
  const plotHeight = chartHeight - topPad - bottomPad

  // Build points
  const points = months.map((m, i) => {
    const x = leftPad + (i / Math.max(1, months.length - 1)) * plotWidth
    const y = topPad + plotHeight - (m.eventsBooked / maxEvents) * plotHeight
    return { x, y, label: m.monthLabel.split(' ')[0], value: m.eventsBooked }
  })

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ')

  // Gradient fill area
  const areaPath =
    `M ${points[0].x},${topPad + plotHeight} ` +
    points.map((p) => `L ${p.x},${p.y}`).join(' ') +
    ` L ${points[points.length - 1].x},${topPad + plotHeight} Z`

  // Y-axis ticks
  const yTicks = [0, Math.round(maxEvents / 2), maxEvents]

  // Trend badge
  const trendIcon =
    velocity.trend === 'accelerating' ? '\u2191' : velocity.trend === 'decelerating' ? '\u2193' : '\u2192'
  const trendColor =
    velocity.trend === 'accelerating'
      ? 'text-emerald-400'
      : velocity.trend === 'decelerating'
        ? 'text-red-400'
        : 'text-stone-400'

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm text-stone-400">
          Avg: <span className="text-stone-200 font-medium">{velocity.avgPerMonth}</span> events/mo
        </span>
        <span className={`text-sm font-medium ${trendColor}`}>
          {trendIcon} {Math.abs(velocity.trendPercent)}%
        </span>
      </div>

      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full"
        role="img"
        aria-label="Booking velocity trend line"
      >
        <defs>
          <linearGradient id="velocity-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(52, 211, 153)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(52, 211, 153)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y-axis grid */}
        {yTicks.map((val) => {
          const y = topPad + plotHeight - (val / maxEvents) * plotHeight
          return (
            <g key={val}>
              <line
                x1={leftPad}
                y1={y}
                x2={chartWidth - rightPad}
                y2={y}
                stroke="currentColor"
                className="text-stone-800"
                strokeDasharray="3 3"
              />
              <text x={leftPad - 4} y={y + 3} textAnchor="end" className="fill-stone-600 text-[9px]">
                {val}
              </text>
            </g>
          )
        })}

        {/* Gradient fill */}
        <path d={areaPath} fill="url(#velocity-gradient)" />

        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="rgb(52, 211, 153)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} className="fill-emerald-400" />
            {/* Show value on hover area */}
            {i % 2 === 0 && (
              <text
                x={p.x}
                y={chartHeight - 4}
                textAnchor="middle"
                className="fill-stone-600 text-[9px]"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}

        {/* Average line */}
        {velocity.avgPerMonth > 0 && (
          <line
            x1={leftPad}
            y1={topPad + plotHeight - (velocity.avgPerMonth / maxEvents) * plotHeight}
            x2={chartWidth - rightPad}
            y2={topPad + plotHeight - (velocity.avgPerMonth / maxEvents) * plotHeight}
            stroke="rgb(250, 204, 21)"
            strokeWidth={1}
            strokeDasharray="6 3"
            opacity={0.5}
          />
        )}
      </svg>
    </div>
  )
}
