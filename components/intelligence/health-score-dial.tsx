'use client'

// Circular score gauge using inline SVG. No external chart libraries.

export function HealthScoreDial({
  score,
  size = 180,
  trend,
}: {
  score: number
  size?: number
  trend?: 'improving' | 'stable' | 'declining'
}) {
  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const clampedScore = Math.max(0, Math.min(100, score))
  const offset = circumference - (clampedScore / 100) * circumference

  const color =
    clampedScore >= 70
      ? '#10b981' // emerald-500
      : clampedScore >= 40
        ? '#f59e0b' // amber-500
        : '#ef4444' // red-500

  const bgColor = '#292524' // stone-800
  const textColor =
    clampedScore >= 70
      ? 'text-emerald-400'
      : clampedScore >= 40
        ? 'text-amber-400'
        : 'text-red-400'

  const label =
    clampedScore >= 80
      ? 'Thriving'
      : clampedScore >= 60
        ? 'Healthy'
        : clampedScore >= 40
          ? 'Building'
          : clampedScore >= 20
            ? 'Needs Work'
            : 'Critical'

  const trendArrow =
    trend === 'improving' ? '\u2191' : trend === 'declining' ? '\u2193' : '\u2192'
  const trendColor =
    trend === 'improving'
      ? 'text-emerald-400'
      : trend === 'declining'
        ? 'text-red-400'
        : 'text-stone-500'

  const center = size / 2

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={bgColor}
            strokeWidth="10"
          />
          {/* Progress arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${textColor} tabular-nums`}>
            {clampedScore}
          </span>
          <span className="text-xs text-stone-500 mt-0.5">{label}</span>
        </div>
      </div>

      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-sm ${trendColor}`}>
          <span className="text-lg">{trendArrow}</span>
          <span className="capitalize">{trend}</span>
        </div>
      )}
    </div>
  )
}
