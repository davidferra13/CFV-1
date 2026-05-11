'use client'

import Link from 'next/link'
import { Pulse, ArrowRight } from '@/components/ui/icons'

// Compact dashboard widget for the business health score.
// Shows the overall score with trend indicator and a link to full details.

export function HealthDashboardWidget({
  score,
  trend,
}: {
  score: number
  trend: 'improving' | 'stable' | 'declining'
}) {
  const color =
    score >= 70
      ? 'text-emerald-400'
      : score >= 40
        ? 'text-amber-400'
        : 'text-red-400'

  const barColor =
    score >= 70
      ? 'bg-emerald-500'
      : score >= 40
        ? 'bg-amber-500'
        : 'bg-red-500'

  const borderColor =
    score >= 70
      ? 'border-emerald-800/40'
      : score >= 40
        ? 'border-amber-800/40'
        : 'border-red-800/40'

  const trendArrow =
    trend === 'improving' ? '\u2191' : trend === 'declining' ? '\u2193' : ''
  const trendColor =
    trend === 'improving'
      ? 'text-emerald-400'
      : trend === 'declining'
        ? 'text-red-400'
        : 'text-stone-500'

  const label =
    score >= 80
      ? 'Thriving'
      : score >= 60
        ? 'Healthy'
        : score >= 40
          ? 'Building'
          : 'Needs Attention'

  return (
    <Link
      href="/analytics/health"
      className={`block rounded-xl border ${borderColor} bg-stone-900/50 p-4 hover:bg-stone-900/80 hover:border-stone-700 transition-all`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Pulse className="h-4 w-4 text-stone-500" />
          <span className="text-xs uppercase tracking-wide text-stone-500 font-medium">
            Business Health
          </span>
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-stone-600" />
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold tabular-nums ${color}`}>{score}</span>
        <span className="text-xs text-stone-500">/100</span>
        {trendArrow && (
          <span className={`text-sm ${trendColor} ml-1`}>{trendArrow}</span>
        )}
        <span className="text-xs text-stone-500 ml-auto">{label}</span>
      </div>

      <div className="mt-2.5 h-1.5 bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${Math.max(2, score)}%` }}
        />
      </div>
    </Link>
  )
}
