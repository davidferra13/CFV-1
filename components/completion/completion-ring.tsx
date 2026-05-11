'use client'

// Standalone SVG circular progress ring for completion scores.
// Reusable across event, client, and recipe surfaces.

export type CompletionRingSize = 'sm' | 'md' | 'lg'

const SIZE_MAP: Record<CompletionRingSize, number> = {
  sm: 32,
  md: 56,
  lg: 80,
}

function scoreColor(score: number): string {
  if (score > 70) return '#10b981' // emerald
  if (score >= 40) return '#f59e0b' // amber
  return '#ef4444' // red
}

interface CompletionRingProps {
  score: number
  size?: CompletionRingSize
  showLabel?: boolean
  className?: string
}

export function CompletionRing({
  score,
  size = 'md',
  showLabel = true,
  className = '',
}: CompletionRingProps) {
  const px = SIZE_MAP[size]
  const radius = px * 0.4
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const cx = px / 2
  const cy = px / 2
  const color = scoreColor(score)
  const strokeWidth = px * 0.08

  // Font sizes scale with ring
  const mainFontSize = size === 'sm' ? 9 : size === 'md' ? 14 : 20

  return (
    <svg
      width={px}
      height={px}
      className={`shrink-0 ${className}`}
      aria-label={`${score}% complete`}
    >
      {/* Background track */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="rgba(120,113,108,0.2)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        className="transition-all duration-700 ease-out"
      />
      {/* Center label */}
      {showLabel && (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-stone-200 font-bold"
          style={{ fontSize: `${mainFontSize}px`, fontWeight: 700 }}
        >
          {score}
        </text>
      )}
    </svg>
  )
}
