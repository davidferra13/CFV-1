'use client'

// AvailabilitySignalToggle
// Chef settings component: toggles whether target_booking calendar entries
// appear on the chef's public profile page as "Available Dates".

import { useState, useTransition } from 'react'
import { setAvailabilitySignalSetting } from '@/lib/calendar/signal-settings-actions'

type Props = {
  initialEnabled: boolean
}

export function AvailabilitySignalToggle({ initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    setError(null)
    startTransition(async () => {
      try {
        await setAvailabilitySignalSetting(next)
      } catch {
        setEnabled(!next)
        setError('Failed to save. Please try again.')
      }
    })
  }

  return (
    <div className="border border-stone-700 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-stone-100">Public Availability Signals</p>
          <p className="text-sm text-stone-500 mt-0.5">
            When enabled, dates you mark as &quot;Seeking a booking&quot; in your calendar will
            appear on your public profile. Clients can click directly to inquire for that date.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          className={[
            'relative flex-shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
            enabled ? 'bg-brand-600' : 'bg-stone-700',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block h-4 w-4 transform rounded-full bg-surface transition-transform shadow',
              enabled ? 'translate-x-6' : 'translate-x-1',
            ].join(' ')}
          />
        </button>
      </div>

      {enabled && (
        <p className="text-xs text-green-700 bg-green-950 rounded-lg px-3 py-2">
          Active — your public target booking dates will appear on your profile. Use the Calendar to
          mark specific dates as publicly visible.
        </p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
