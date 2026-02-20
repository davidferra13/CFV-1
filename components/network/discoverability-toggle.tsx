// Discoverability Toggle - Settings control for chef network visibility
'use client'

import { useState, useTransition } from 'react'
import { toggleNetworkDiscoverable } from '@/lib/network/actions'

interface DiscoverabilityToggleProps {
  currentValue: boolean
}

export function DiscoverabilityToggle({ currentValue }: DiscoverabilityToggleProps) {
  const [enabled, setEnabled] = useState(currentValue)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleToggle() {
    const newValue = !enabled
    setEnabled(newValue)
    setError(null)

    startTransition(async () => {
      try {
        await toggleNetworkDiscoverable(newValue)
      } catch (err: any) {
        setEnabled(!newValue) // revert on failure
        setError(err.message || 'Failed to update')
      }
    })
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium text-stone-900">Network Discovery</p>
          <p className="text-sm text-stone-500 mt-1">
            {enabled
              ? 'You are visible in the chef directory. Other chefs can find you by name and see your city/state.'
              : 'You have opted out of the chef directory. Other chefs cannot find or connect with you.'}
          </p>
        </div>

        {/* Toggle switch */}
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
            ${enabled ? 'bg-brand-600' : 'bg-stone-200'}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
              transition duration-200 ease-in-out
              ${enabled ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
