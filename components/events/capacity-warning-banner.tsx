'use client'

// CapacityWarningBanner - Inline alert when adding an event would breach limits
// Shown in the event creation flow before the chef commits to the booking.
// Dismissible - "I understand, continue anyway" clears the banner locally.
// No server call on dismiss - it's purely informational.

import { useState } from 'react'
import type { CapacityWarning } from '@/lib/scheduling/capacity-check'

interface Props {
  warnings: CapacityWarning[]
}

export function CapacityWarningBanner({ warnings }: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (warnings.length === 0 || dismissed) return null

  const hasHardWarning = warnings.some((w) => w.severity === 'warning')

  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        hasHardWarning ? 'bg-amber-950 border-amber-200' : 'bg-brand-950 border-brand-200'
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 text-lg leading-none ${
            hasHardWarning ? 'text-amber-500' : 'text-brand-500'
          }`}
          aria-hidden="true"
        >
          {hasHardWarning ? '⚠' : 'ℹ'}
        </span>
        <div className="flex-1">
          <p
            className={`text-sm font-semibold mb-1 ${
              hasHardWarning ? 'text-amber-800' : 'text-brand-800'
            }`}
          >
            {hasHardWarning ? 'Workload limit reached' : 'Workload notice'}
          </p>
          <ul className="space-y-0.5">
            {warnings.map((w, i) => (
              <li
                key={i}
                className={`text-sm ${hasHardWarning ? 'text-amber-700' : 'text-brand-700'}`}
              >
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className={`mt-3 text-xs font-medium underline underline-offset-2 ${
          hasHardWarning
            ? 'text-amber-700 hover:text-amber-900'
            : 'text-brand-700 hover:text-brand-900'
        }`}
      >
        I understand, continue anyway
      </button>
    </div>
  )
}
