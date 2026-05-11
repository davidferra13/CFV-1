'use client'

import type { WeeklyPrepPlan } from '@/lib/intelligence/prep-consolidation'

interface Props {
  plan: WeeklyPrepPlan
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function ConsolidatedPrepSchedule({ plan }: Props) {
  if (plan.days.length === 0) {
    return (
      <div className="rounded-lg border border-stone-700/40 bg-stone-900/40 p-6 text-center">
        <p className="text-stone-400 text-sm">No consolidated prep items for this week.</p>
        <p className="text-stone-500 text-xs mt-1">
          Consolidation opportunities appear when 2+ events share the same ingredients.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {plan.days.map((day) => (
        <div
          key={day.date}
          className="rounded-lg border border-stone-700/50 bg-stone-900/60 overflow-hidden"
        >
          {/* Day header */}
          <div className="flex items-center justify-between px-4 py-3 bg-stone-800/40 border-b border-stone-700/30">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-stone-100">{day.dayOfWeek}</span>
              <span className="text-xs text-stone-400">{day.date}</span>
            </div>
            <span className="text-xs font-medium text-stone-300">
              {formatMinutes(day.totalPrepMinutes)} total
            </span>
          </div>

          {/* Items */}
          <div className="divide-y divide-stone-800/50">
            {day.items.map((item, i) => (
              <div key={i} className="px-4 py-3 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-stone-100">{item.ingredientName}</span>
                    <span className="text-xs text-stone-500 bg-stone-800 rounded px-1.5 py-0.5">
                      {item.technique}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-1">
                    {item.batchQuantity} {item.unit} for {item.events.join(', ')}
                  </p>
                </div>
                <span className="text-xs text-stone-300 shrink-0 mt-0.5">
                  ~{formatMinutes(item.prepMinutes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
