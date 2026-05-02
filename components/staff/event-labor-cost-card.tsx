'use client'

// Per-Event Labor Cost Card
// Module: station-ops
// Shows staff hours and labor cost for a specific event.
// Rolls into event P&L alongside food cost and expenses.
// Deterministic: formula > AI.

import { useState, useEffect, useTransition } from 'react'
import { getLaborByEvent, type LaborByEventResult } from '@/lib/staff/labor-dashboard-actions'

type Props = {
  eventId: string
  quotedPriceCents?: number | null
}

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function EventLaborCostCard({ eventId, quotedPriceCents }: Props) {
  const [data, setData] = useState<LaborByEventResult | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    startTransition(async () => {
      try {
        const result = await getLaborByEvent(eventId)
        if (!cancelled) setData(result)
      } catch {
        // Non-blocking; staff may not be assigned
      }
    })
    return () => {
      cancelled = true
    }
  }, [eventId])

  if (isPending) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4">
        <p className="text-sm text-stone-500 animate-pulse">Loading labor costs...</p>
      </div>
    )
  }

  if (!data || data.entries.length === 0) return null

  const laborPct =
    quotedPriceCents && quotedPriceCents > 0 ? (data.totalPayCents / quotedPriceCents) * 100 : null

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-300">Labor Cost</h3>
        <span className="text-xs text-stone-500">{data.entries.length} staff</span>
      </div>

      {/* Summary row */}
      <div className="flex items-baseline gap-4">
        <div>
          <div className="text-xs text-stone-500">Total Labor</div>
          <div className="text-lg font-bold text-stone-200">{fmt(data.totalPayCents)}</div>
        </div>
        <div>
          <div className="text-xs text-stone-500">Hours</div>
          <div className="text-lg font-bold text-stone-300">{data.totalHours.toFixed(1)}h</div>
        </div>
        {laborPct !== null && (
          <div>
            <div className="text-xs text-stone-500">% of Revenue</div>
            <div
              className={`text-lg font-bold ${laborPct > 35 ? 'text-red-400' : laborPct > 25 ? 'text-amber-400' : 'text-emerald-400'}`}
            >
              {laborPct.toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {/* Staff breakdown */}
      <div className="space-y-1 pt-1 border-t border-stone-800">
        {data.entries.map((entry) => (
          <div key={entry.assignmentId} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-stone-300 truncate">{entry.staffName}</span>
              <span className="text-stone-600 shrink-0">
                {entry.roleOverride || entry.staffRole}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-stone-500">
                {entry.actualHours != null
                  ? `${entry.actualHours}h`
                  : entry.scheduledHours != null
                    ? `~${entry.scheduledHours}h`
                    : '-'}
              </span>
              <span className="text-stone-300 font-medium w-16 text-right">
                {fmt(entry.payAmountCents)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
