'use client'

import type { DayLoad } from '@/lib/intelligence/operational-load'
import { LoadScoreBadge } from './load-score-badge'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  return `${DAY_NAMES[d.getDay()]}, ${month} ${d.getDate()}`
}

function BreakdownRow({
  label,
  value,
  unit,
  highlight,
}: {
  label: string
  value: number
  unit?: string
  highlight?: boolean
}) {
  if (value === 0) return null
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-stone-400">{label}</span>
      <span className={`text-xs font-medium ${highlight ? 'text-amber-400' : 'text-stone-200'}`}>
        {value}
        {unit ? ` ${unit}` : ''}
      </span>
    </div>
  )
}

export function LoadDayDetail({
  day,
  onClose,
}: {
  day: DayLoad
  onClose: () => void
}) {
  const hasContent =
    day.breakdown.events > 0 ||
    day.breakdown.prepTasks > 0 ||
    day.breakdown.components > 0 ||
    day.breakdown.staffGap > 0 ||
    day.breakdown.travelMinutes > 0 ||
    day.breakdown.shoppingTasks > 0

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-stone-100">{formatDateLabel(day.date)}</p>
          <div className="flex items-center gap-2 mt-1">
            <LoadScoreBadge score={day.score} level={day.level} />
            <span className="text-xs text-stone-500 capitalize">{day.level}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-stone-500 hover:text-stone-300 transition-colors p-1"
          aria-label="Close detail"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {hasContent ? (
        <div className="divide-y divide-stone-800">
          <BreakdownRow label="Events" value={day.breakdown.events} />
          <BreakdownRow label="Prep tasks" value={day.breakdown.prepTasks} />
          <BreakdownRow label="Components" value={day.breakdown.components} />
          <BreakdownRow
            label="Staff gap"
            value={day.breakdown.staffGap}
            highlight={day.breakdown.staffGap > 0}
          />
          <BreakdownRow label="Travel" value={day.breakdown.travelMinutes} unit="min" />
          <BreakdownRow label="Shopping runs" value={day.breakdown.shoppingTasks} />
        </div>
      ) : (
        <p className="text-xs text-stone-500 py-2">No scheduled load for this day.</p>
      )}

      {/* Score visualization bar */}
      <div className="mt-3">
        <div className="h-1.5 w-full rounded-full bg-stone-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              day.level === 'overloaded'
                ? 'bg-red-500'
                : day.level === 'heavy'
                  ? 'bg-orange-500'
                  : day.level === 'moderate'
                    ? 'bg-yellow-500'
                    : day.level === 'light'
                      ? 'bg-emerald-500'
                      : 'bg-stone-700'
            }`}
            style={{ width: `${Math.max(day.score, 2)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
