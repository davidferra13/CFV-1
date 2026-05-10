'use client'

// End of Day Summary - shows completion stats, rolled-over items, time spent.
// Only visible after 4pm OR when all items are done.

import { CheckCircle, ArrowRight, Clock } from '@/components/ui/icons'
import type { DailyPlan } from '@/lib/daily-ops/types'

type Props = {
  plan: DailyPlan
}

export function EndOfDaySummary({ plan }: Props) {
  const hour = new Date().getHours()
  const allItems = plan.lanes.flatMap((lane) => lane.items)
  const completedItems = allItems.filter((i) => i.completed)
  const dismissedItems = allItems.filter((i) => i.dismissed)
  const activeItems = allItems.filter((i) => !i.dismissed)
  const rolledOver = activeItems.filter((i) => !i.completed)
  const allDone = activeItems.length > 0 && rolledOver.length === 0

  // Only show after 4pm or when all items are completed
  if (hour < 16 && !allDone) return null
  // Don't show if there are no items at all
  if (allItems.length === 0) return null

  const completedPct =
    activeItems.length > 0 ? Math.round((completedItems.length / activeItems.length) * 100) : 0

  const timeSpent = completedItems.reduce((sum, i) => sum + i.timeEstimateMinutes, 0)

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-5">
      <h3 className="text-sm font-semibold text-stone-200 mb-4">
        {allDone ? 'Day Complete' : 'End of Day Summary'}
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {/* Completed */}
        <div className="flex items-start gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-lg font-semibold text-stone-100 tabular-nums">
              {completedItems.length}
            </p>
            <p className="text-xs text-stone-400">completed ({completedPct}%)</p>
          </div>
        </div>

        {/* Rolled over */}
        <div className="flex items-start gap-2">
          <ArrowRight className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-lg font-semibold text-stone-100 tabular-nums">{rolledOver.length}</p>
            <p className="text-xs text-stone-400">rolling over</p>
          </div>
        </div>

        {/* Time spent */}
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-brand-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-lg font-semibold text-stone-100 tabular-nums">{timeSpent}m</p>
            <p className="text-xs text-stone-400">time invested</p>
          </div>
        </div>
      </div>

      {/* Rolled over item names */}
      {rolledOver.length > 0 && rolledOver.length <= 5 && (
        <div className="mt-4 pt-3 border-t border-stone-700">
          <p className="text-xs text-stone-500 mb-2">Tomorrow:</p>
          <ul className="space-y-1">
            {rolledOver.map((item) => (
              <li key={item.id} className="text-xs text-stone-400 flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-stone-600 shrink-0" />
                {item.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {dismissedItems.length > 0 && (
        <p className="text-xs text-stone-600 mt-3">
          {dismissedItems.length} item{dismissedItems.length !== 1 ? 's' : ''} dismissed
        </p>
      )}
    </div>
  )
}
