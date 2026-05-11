'use client'

/**
 * Call Progress Bar
 *
 * Segmented progress bar for batch calling operations.
 * Shows confirmed/unavailable/failed/remaining as colored segments
 * with counts beneath each.
 */

interface CallProgressBarProps {
  total: number
  called: number
  confirmed: number
  unavailable: number
  failed: number
}

export function CallProgressBar({
  total,
  called,
  confirmed,
  unavailable,
  failed,
}: CallProgressBarProps) {
  const remaining = total - called
  const safeTotal = Math.max(total, 1)

  const confirmedPct = (confirmed / safeTotal) * 100
  const unavailablePct = (unavailable / safeTotal) * 100
  const failedPct = (failed / safeTotal) * 100
  const remainingPct = (remaining / safeTotal) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-stone-400">
        <span>
          {called}/{total} vendors called
        </span>
        <span>
          {confirmed} confirmed | {unavailable} unavailable | {remaining} remaining
        </span>
      </div>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-stone-800"
        role="progressbar"
        aria-label={`Call progress: ${called} of ${total} vendors called`}
        aria-valuenow={called}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        {confirmedPct > 0 && (
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${confirmedPct}%` }}
          />
        )}
        {unavailablePct > 0 && (
          <div
            className="bg-amber-500 transition-all duration-500"
            style={{ width: `${unavailablePct}%` }}
          />
        )}
        {failedPct > 0 && (
          <div
            className="bg-red-500 transition-all duration-500"
            style={{ width: `${failedPct}%` }}
          />
        )}
        {remainingPct > 0 && (
          <div
            className="bg-stone-700 transition-all duration-500"
            style={{ width: `${remainingPct}%` }}
          />
        )}
      </div>
      <div className="flex gap-4 text-[11px] text-stone-500">
        {confirmed > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            {confirmed} confirmed
          </span>
        )}
        {unavailable > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            {unavailable} unavailable
          </span>
        )}
        {failed > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            {failed} failed
          </span>
        )}
        {remaining > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-stone-700" />
            {remaining} remaining
          </span>
        )}
      </div>
    </div>
  )
}
