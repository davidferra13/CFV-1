/**
 * Pricing Confidence Gauge
 *
 * Semicircle SVG gauge showing 0-100 confidence score.
 * Color transitions from red (low) through amber to green (high).
 */

import type { PricingConfidenceReport } from '@/lib/intelligence/pricing-confidence'

interface PricingConfidenceGaugeProps {
  report: PricingConfidenceReport
  size?: number
}

export function PricingConfidenceGauge({ report, size = 140 }: PricingConfidenceGaugeProps) {
  const { score, level } = report
  const cx = size / 2
  const cy = size / 2 + 10
  const radius = size / 2 - 14
  const strokeWidth = 10

  // Semicircle arc (180 degrees, from left to right)
  const startAngle = Math.PI // left
  const endAngle = 0 // right
  const scoreAngle = startAngle - (score / 100) * Math.PI

  // Arc path helper
  const arcPath = (startA: number, endA: number, r: number) => {
    const sx = cx + r * Math.cos(startA)
    const sy = cy - r * Math.sin(startA)
    const ex = cx + r * Math.cos(endA)
    const ey = cy - r * Math.sin(endA)
    const largeArc = Math.abs(startA - endA) > Math.PI ? 1 : 0
    return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 0 ${ex} ${ey}`
  }

  // Color based on score
  const scoreColor =
    score >= 75 ? '#34d399' : // emerald-400
    score >= 55 ? '#fbbf24' : // amber-400
    score >= 35 ? '#fb923c' : // orange-400
    '#f87171' // red-400

  const levelLabel =
    level === 'very_high' ? 'Very High' :
    level === 'high' ? 'High' :
    level === 'moderate' ? 'Moderate' : 'Low'

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
        {/* Background track */}
        <path
          d={arcPath(startAngle, endAngle, radius)}
          fill="none"
          stroke="#44403c"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Score arc */}
        {score > 0 && (
          <path
            d={arcPath(startAngle, scoreAngle, radius)}
            fill="none"
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}

        {/* Score text */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-stone-100"
          fontSize="28"
          fontWeight="bold"
        >
          {score}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          className="fill-stone-400"
          fontSize="11"
        >
          {levelLabel} Confidence
        </text>

        {/* Min/max labels */}
        <text
          x={14}
          y={cy + 4}
          textAnchor="start"
          className="fill-stone-600"
          fontSize="9"
        >
          0
        </text>
        <text
          x={size - 14}
          y={cy + 4}
          textAnchor="end"
          className="fill-stone-600"
          fontSize="9"
        >
          100
        </text>
      </svg>
    </div>
  )
}
