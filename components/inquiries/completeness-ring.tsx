// Completeness Ring — small SVG progress ring showing inquiry completeness %

import type { CompletenessScore } from '@/lib/leads/completeness'

interface CompletenessRingProps {
  completeness: CompletenessScore
  size?: number
}

export function CompletenessRing({ completeness, size = 28 }: CompletenessRingProps) {
  const radius = (size - 4) / 2
  const circumference = 2 * Math.PI * radius
  const filled = (completeness.score / 100) * circumference
  const gap = circumference - filled

  const color =
    completeness.score >= 80
      ? 'text-emerald-500'
      : completeness.score >= 50
        ? 'text-amber-500'
        : 'text-red-500'

  const trackColor =
    completeness.score >= 80
      ? 'text-emerald-900'
      : completeness.score >= 50
        ? 'text-amber-900'
        : 'text-red-900'

  return (
    <span
      className="inline-flex items-center gap-1"
      title={
        completeness.missing.length > 0
          ? `Missing: ${completeness.missing.join(', ')}`
          : 'All key fields filled'
      }
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={2.5}
          className={`stroke-current ${trackColor}`}
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={2.5}
          strokeDasharray={`${filled} ${gap}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="round"
          className={`stroke-current ${color}`}
        />
        {/* Center text */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className={`fill-current ${color}`}
          fontSize={size * 0.3}
          fontWeight="bold"
        >
          {completeness.score}
        </text>
      </svg>
    </span>
  )
}
