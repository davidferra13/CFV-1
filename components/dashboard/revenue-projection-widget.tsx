// Revenue Projection Widget - Forward-looking revenue intelligence
// Shows confirmed vs pipeline vs goal with gap analysis

import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { RevenueProjection } from '@/lib/dashboard/actions'

interface Props {
  projection: RevenueProjection
}

export function RevenueProjectionWidget({ projection }: Props) {
  const {
    confirmedCents,
    pendingCents,
    pipelineExpectedCents,
    conversionRate,
    goalCents,
    gapCents,
    eventsNeeded,
    daysRemaining,
  } = projection

  const totalExpected = confirmedCents + pipelineExpectedCents
  const progressPct =
    goalCents > 0 ? Math.min(100, Math.round((totalExpected / goalCents) * 100)) : 0
  const confirmedPct =
    goalCents > 0 ? Math.min(100, Math.round((confirmedCents / goalCents) * 100)) : 0

  const isOnTrack = gapCents === 0
  const isClose = !isOnTrack && progressPct >= 75

  return (
    <Card className={`border-stone-700 ${isOnTrack ? 'bg-emerald-950/20' : ''}`}>
      <CardContent className="py-4 space-y-3">
        {/* Header */}
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-semibold text-stone-200">Monthly Projection</span>
          <span className="text-xs text-stone-400">{daysRemaining} days remaining</span>
        </div>

        {/* Progress bar (stacked: confirmed + pipeline) */}
        {goalCents > 0 && (
          <div className="space-y-1">
            <div className="h-2.5 bg-stone-700 rounded-full overflow-hidden relative">
              {/* Confirmed (solid) */}
              <div
                className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
                style={{ width: `${confirmedPct}%` }}
              />
              {/* Pipeline expected (striped/lighter) */}
              <div
                className="absolute inset-y-0 bg-emerald-700/50 rounded-r-full"
                style={{
                  left: `${confirmedPct}%`,
                  width: `${Math.min(100 - confirmedPct, progressPct - confirmedPct)}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-stone-400">
              <span>{formatCurrency(totalExpected)}</span>
              <span>Goal: {formatCurrency(goalCents)}</span>
            </div>
          </div>
        )}

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-stone-400">Confirmed</span>
            <span className="text-emerald-400 font-medium">{formatCurrency(confirmedCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Pipeline</span>
            <span className="text-stone-300">{formatCurrency(pendingCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Expected ({conversionRate}% converts)</span>
            <span className="text-stone-300">~{formatCurrency(pipelineExpectedCents)}</span>
          </div>
          {gapCents > 0 && (
            <div className="flex justify-between">
              <span className="text-amber-400">Gap</span>
              <span className="text-amber-400 font-medium">{formatCurrency(gapCents)}</span>
            </div>
          )}
        </div>

        {/* Action nudge */}
        {gapCents > 0 && eventsNeeded > 0 && (
          <p className="text-xs text-amber-300 bg-amber-950/50 rounded px-2 py-1">
            Need ~{eventsNeeded} more {eventsNeeded === 1 ? 'event' : 'events'} to hit goal (
            {daysRemaining} days left)
          </p>
        )}
        {isOnTrack && (
          <p className="text-xs text-emerald-400 bg-emerald-950/50 rounded px-2 py-1">
            On track to meet monthly goal
          </p>
        )}
      </CardContent>
    </Card>
  )
}
