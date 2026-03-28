'use client'

/**
 * PriceSparkline - Tiny SVG sparkline showing price trend over time.
 * Renders inline, takes minimal space. Green when trending down, red when up.
 */

import { type PriceHistoryPoint } from '@/lib/openclaw/price-intelligence-actions'

interface Props {
  data: PriceHistoryPoint[]
  width?: number
  height?: number
  className?: string
}

export function PriceSparkline({ data, width = 80, height = 24, className = '' }: Props) {
  if (data.length < 2) return null

  const values = data.map((d) => d.cents)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  // Determine trend from first to last value
  const first = values[0]
  const last = values[values.length - 1]
  const trending = last < first ? 'down' : last > first ? 'up' : 'flat'
  const strokeColor = trending === 'down' ? '#4ade80' : trending === 'up' ? '#f87171' : '#78716c'

  // Build SVG path
  const padding = 2
  const innerWidth = width - padding * 2
  const innerHeight = height - padding * 2

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * innerWidth
    const y = padding + innerHeight - ((v - min) / range) * innerHeight
    return `${x},${y}`
  })

  const pathD = `M ${points.join(' L ')}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-label={`Price trend: ${trending}`}
    >
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current price dot */}
      <circle
        cx={padding + innerWidth}
        cy={padding + innerHeight - ((last - min) / range) * innerHeight}
        r={2}
        fill={strokeColor}
      />
    </svg>
  )
}
