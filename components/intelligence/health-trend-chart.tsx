'use client'

// Simple SVG line chart for health score history. No external dependencies.

import type { HealthHistoryPoint } from '@/lib/intelligence/business-health-actions'

export function HealthTrendChart({
  data,
  height = 120,
}: {
  data: HealthHistoryPoint[]
  height?: number
}) {
  if (data.length < 2) {
    return (
      <div className="text-center py-6 text-stone-500 text-sm">
        Not enough history to show a trend yet.
      </div>
    )
  }

  const width = 400
  const padding = { top: 20, right: 30, bottom: 30, left: 35 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxScore = 100
  const minScore = 0

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((d.score - minScore) / (maxScore - minScore)) * chartH,
    score: d.score,
    label: d.date,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  // Area fill path
  const areaD =
    pathD +
    ` L ${points[points.length - 1].x} ${padding.top + chartH}` +
    ` L ${points[0].x} ${padding.top + chartH} Z`

  // Color based on latest score
  const latestScore = data[data.length - 1].score
  const strokeColor =
    latestScore >= 70 ? '#10b981' : latestScore >= 40 ? '#f59e0b' : '#ef4444'
  const fillColor =
    latestScore >= 70
      ? 'rgba(16,185,129,0.08)'
      : latestScore >= 40
        ? 'rgba(245,158,11,0.08)'
        : 'rgba(239,68,68,0.08)'

  // Grid lines
  const gridLines = [0, 25, 50, 75, 100]

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {gridLines.map((val) => {
          const y = padding.top + chartH - ((val - minScore) / (maxScore - minScore)) * chartH
          return (
            <g key={val}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartW}
                y2={y}
                stroke="#292524"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-stone-600"
                fontSize="9"
              >
                {val}
              </text>
            </g>
          )
        })}

        {/* Area fill */}
        <path d={areaD} fill={fillColor} />

        {/* Line */}
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#0c0a09" stroke={strokeColor} strokeWidth="2" />
            <text
              x={p.x}
              y={padding.top + chartH + 16}
              textAnchor="middle"
              className="fill-stone-500"
              fontSize="8"
            >
              {p.label}
            </text>
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              className="fill-stone-400"
              fontSize="9"
              fontWeight="600"
            >
              {p.score}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
