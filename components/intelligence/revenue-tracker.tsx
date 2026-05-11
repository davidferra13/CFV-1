'use client'

import type { RevenueHealth } from '@/lib/intelligence/revenue-forecast-actions'

type Props = {
  health: RevenueHealth
}

function formatDollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

const STATUS_CONFIG: Record<
  RevenueHealth['paceStatus'],
  { label: string; barClass: string; textClass: string }
> = {
  ahead: { label: 'Ahead', barClass: 'bg-emerald-500', textClass: 'text-emerald-400' },
  on_track: { label: 'On Track', barClass: 'bg-emerald-600', textClass: 'text-emerald-400' },
  behind: { label: 'Behind', barClass: 'bg-amber-500', textClass: 'text-amber-400' },
  critical: { label: 'Critical', barClass: 'bg-red-500', textClass: 'text-red-400' },
}

export function RevenueTracker({ health }: Props) {
  const { label, barClass, textClass } = STATUS_CONFIG[health.paceStatus]
  const fillPct = health.targetCents > 0
    ? Math.min(100, Math.round((health.actualCents / health.targetCents) * 100))
    : 0
  const targetLinePct = 100
  const projectedPct = health.targetCents > 0
    ? Math.min(120, Math.round((health.projectedMonthEndCents / health.targetCents) * 100))
    : 0

  // Time progress through the month
  const timePct = Math.round((health.daysElapsed / health.daysInMonth) * 100)

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-2xl font-bold text-stone-100">
            {formatDollars(health.actualCents)}
          </span>
          {health.targetCents > 0 && (
            <span className="text-stone-500 ml-2">
              of {formatDollars(health.targetCents)} target
            </span>
          )}
        </div>
        <span className={`text-sm font-medium ${textClass}`}>{label}</span>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="h-6 w-full rounded-full bg-stone-800 overflow-hidden">
          {/* Actual fill */}
          <div
            className={`h-full rounded-full transition-all duration-500 ${barClass}`}
            style={{ width: `${Math.min(fillPct, 100)}%` }}
          />
        </div>

        {/* Target line marker */}
        {health.targetCents > 0 && (
          <div
            className="absolute top-0 h-6 w-0.5 bg-stone-300"
            style={{ left: `${Math.min(targetLinePct, 100)}%` }}
          >
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-stone-400">
              Target
            </div>
          </div>
        )}

        {/* Projected marker (triangle) */}
        {health.projectedMonthEndCents > 0 && (
          <div
            className="absolute -bottom-2 -translate-x-1/2"
            style={{ left: `${Math.min(projectedPct, 100)}%` }}
          >
            <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-l-transparent border-r-transparent border-b-stone-400" />
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs text-stone-500">
        <span>{fillPct}% of target</span>
        <span>Day {health.daysElapsed} of {health.daysInMonth} ({timePct}% elapsed)</span>
      </div>

      {/* Projected end */}
      {health.projectedMonthEndCents > 0 && (
        <p className="text-xs text-stone-500">
          At current pace, projected month-end: {formatDollars(health.projectedMonthEndCents)}
        </p>
      )}
    </div>
  )
}
