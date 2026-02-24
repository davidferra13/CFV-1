'use client'

// LTVChart — Client Lifetime Value trajectory visualization.
// Renders a bar-based sparkline showing cumulative revenue event by event.
// No charting library — uses pure Tailwind CSS with proportional bar heights.

import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import type { LTVDataPoint } from '@/lib/clients/ltv-trajectory'

type Props = {
  points: LTVDataPoint[]
  totalLifetimeValueCents: number
}

export function LTVChart({ points, totalLifetimeValueCents }: Props) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-stone-400 italic">
        No completed events yet — LTV will appear here once events are closed.
      </p>
    )
  }

  if (points.length === 1) {
    // Single event — no trajectory to chart, just show the number
    return (
      <div className="text-center py-2">
        <p className="text-2xl font-bold text-stone-100">
          {formatCurrency(totalLifetimeValueCents)}
        </p>
        <p className="text-xs text-stone-500 mt-1">from 1 event</p>
      </div>
    )
  }

  const maxCumulative = Math.max(...points.map((p) => p.cumulativeCents), 1)

  // Map cumulative to discrete height classes (proportional)
  function barHeightClass(cumulativeCents: number): string {
    const ratio = cumulativeCents / maxCumulative
    if (ratio >= 0.95) return 'h-20'
    if (ratio >= 0.85) return 'h-18'
    if (ratio >= 0.75) return 'h-16'
    if (ratio >= 0.65) return 'h-14'
    if (ratio >= 0.55) return 'h-12'
    if (ratio >= 0.45) return 'h-10'
    if (ratio >= 0.35) return 'h-8'
    if (ratio >= 0.25) return 'h-7'
    if (ratio >= 0.15) return 'h-6'
    if (ratio >= 0.05) return 'h-5'
    return 'h-4'
  }

  return (
    <div>
      <div className="flex items-end gap-1.5 h-20 mt-2 mb-3">
        {points.map((point, i) => (
          <div
            key={point.eventId}
            className="group relative flex-1 flex flex-col items-center justify-end"
          >
            <div
              className={`w-full rounded-t-sm transition-colors ${
                i === points.length - 1 ? 'bg-brand-600' : 'bg-brand-800 group-hover:bg-brand-400'
              } ${barHeightClass(point.cumulativeCents)}`}
              title={`${point.occasion ?? 'Event'} (${format(new Date(point.eventDate), 'MMM d')}): ${formatCurrency(point.cumulativeCents)} LTV`}
            />
          </div>
        ))}
      </div>

      {/* X-axis labels — show first and last only to avoid crowding */}
      <div className="flex justify-between text-xs text-stone-400">
        <span>{format(new Date(points[0].eventDate), 'MMM yy')}</span>
        {points.length > 2 && (
          <span className="text-center text-stone-400">{points.length} events</span>
        )}
        <span>{format(new Date(points[points.length - 1].eventDate), 'MMM yy')}</span>
      </div>

      {/* Summary stats below the chart */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p className="font-semibold text-stone-200">{formatCurrency(totalLifetimeValueCents)}</p>
          <p className="text-stone-500">Total LTV</p>
        </div>
        <div>
          <p className="font-semibold text-stone-200">
            {formatCurrency(Math.round(totalLifetimeValueCents / points.length))}
          </p>
          <p className="text-stone-500">Avg / event</p>
        </div>
        <div>
          <p className="font-semibold text-stone-200">
            {formatCurrency(points[points.length - 1].revenueCents)}
          </p>
          <p className="text-stone-500">Last event</p>
        </div>
      </div>
    </div>
  )
}
