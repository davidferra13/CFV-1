// Data Health Score - prominent circular score display for reconciliation dashboard
'use client'

interface DataHealthScoreProps {
  score: number // 0-100
  totalGaps: number
}

export function DataHealthScore({ score, totalGaps }: DataHealthScoreProps) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  let color = 'text-emerald-400'
  let ringColor = 'stroke-emerald-400'
  let label = 'Healthy'
  if (score < 40) {
    color = 'text-red-400'
    ringColor = 'stroke-red-400'
    label = 'Needs work'
  } else if (score < 70) {
    color = 'text-amber-400'
    ringColor = 'stroke-amber-400'
    label = 'Fair'
  } else if (score < 90) {
    color = 'text-brand-400'
    ringColor = 'stroke-brand-400'
    label = 'Good'
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative inline-flex items-center justify-center">
        <svg width="120" height="120" className="-rotate-90">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-stone-700"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={ringColor}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`text-3xl font-bold ${color}`}>{score}</span>
          <span className="text-xs text-stone-500">/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <p className={`text-sm font-semibold ${color}`}>{label}</p>
        <p className="text-xs text-stone-500">
          {totalGaps === 0
            ? 'All data is reconciled'
            : `${totalGaps} gap${totalGaps === 1 ? '' : 's'} to resolve`}
        </p>
      </div>
    </div>
  )
}
