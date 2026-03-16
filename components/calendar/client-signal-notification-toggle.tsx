'use client'

// ClientSignalNotificationToggle
// Client-facing component: lets a client opt in or out of receiving
// notifications when the chef posts a public "seeking bookings" date signal.

import { useState, useTransition } from 'react'
import { setClientSignalNotificationPref } from '@/lib/calendar/signal-settings-actions'

type Props = {
  initialEnabled: boolean
}

export function ClientSignalNotificationToggle({ initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    setError(null)
    startTransition(async () => {
      try {
        await setClientSignalNotificationPref(next)
      } catch {
        setEnabled(!next)
        setError('Failed to save preference. Please try again.')
      }
    })
  }

  return (
    <div className="border border-stone-700 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-stone-100">Chef Availability Notifications</p>
          <p className="text-sm text-stone-500 mt-0.5">
            When enabled, your chef can notify you when they are actively seeking a booking on
            specific dates. You can inquire directly from those notifications.
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
              'inline-block h-4 w-4 transform rounded-full bg-stone-900 transition-transform shadow',
              enabled ? 'translate-x-6' : 'translate-x-1',
            ].join(' ')}
          />
        </button>
      </div>

      {enabled ? (
        <p className="text-xs text-green-700 bg-green-950 rounded-lg px-3 py-2">
          On - you will be notified when your chef posts available booking dates.
        </p>
      ) : (
        <p className="text-xs text-stone-500 bg-stone-800 rounded-lg px-3 py-2">
          Off - you will not receive availability date notifications.
        </p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
