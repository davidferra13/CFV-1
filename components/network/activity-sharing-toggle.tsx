'use client'

import { useState, useTransition } from 'react'
import { toggleActivitySharing } from '@/lib/network/activity/actions'

interface OwnSnapshot {
  upcomingEventCount: number
  currentWeekCount: number
  currentMonthCount: number
  streakWeeks: number
  avgWeeklyEvents: number
  busiestDay: string | null
  updatedAt: string
}

interface ActivitySharingToggleProps {
  currentValue: boolean
  ownSnapshot?: OwnSnapshot | null
}

export function ActivitySharingToggle({ currentValue, ownSnapshot }: ActivitySharingToggleProps) {
  const [enabled, setEnabled] = useState(currentValue)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleToggle() {
    const newValue = !enabled
    setEnabled(newValue)
    setError(null)

    startTransition(async () => {
      try {
        await toggleActivitySharing(newValue)
      } catch (err: any) {
        setEnabled(!newValue)
        setError(err.message || 'Failed to update')
      }
    })
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium text-stone-100">Share Activity with Connections</p>
          <p className="text-sm text-stone-500 mt-1">
            {enabled
              ? 'Connected chefs can see how busy you are. Only dinner counts are shared, never client names or details.'
              : 'Your activity is private. Connected chefs cannot see your booking activity.'}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={isPending}
          onClick={handleToggle}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50
            ${enabled ? 'bg-brand-600' : 'bg-stone-700'}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-stone-900 shadow ring-0
              transition duration-200 ease-in-out
              ${enabled ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {enabled && ownSnapshot && (
        <div className="mt-4 border-t border-stone-700/50 pt-3">
          <p className="text-xs font-medium text-stone-500 mb-2">Your connections see:</p>
          <div className="rounded-lg border border-stone-700/50 bg-stone-900/60 p-3 space-y-1">
            <p className="text-xs text-stone-400">
              {ownSnapshot.upcomingEventCount === 0
                ? '0 dinners coming up'
                : ownSnapshot.upcomingEventCount === 1
                  ? '1 dinner coming up'
                  : `${ownSnapshot.upcomingEventCount} dinners coming up`}
            </p>
            {ownSnapshot.streakWeeks > 2 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {ownSnapshot.streakWeeks}-week streak
              </span>
            )}
            {ownSnapshot.busiestDay && (
              <p className="text-[11px] text-stone-500">Busiest: {ownSnapshot.busiestDay}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
