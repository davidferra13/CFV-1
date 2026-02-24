// Client Automated Emails Toggle
// Chef-controlled toggle to opt a specific client in/out of automated emails
// (e.g. day-before event reminders). Client does not see or manage this setting.
'use client'

import { useState, useTransition } from 'react'
import { setClientAutomatedEmails } from '@/lib/clients/actions'

interface ClientEmailToggleProps {
  clientId: string
  initialEnabled: boolean
}

export function ClientEmailToggle({ clientId, initialEnabled }: ClientEmailToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleToggle = () => {
    const newValue = !enabled
    setEnabled(newValue)
    setError(null)
    startTransition(async () => {
      try {
        await setClientAutomatedEmails(clientId, newValue)
      } catch {
        setEnabled(!newValue) // revert on error
        setError('Failed to save — try again')
      }
    })
  }

  return (
    <div>
      <p className="text-sm font-medium text-stone-500 mb-1">Automated Emails</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Send automated reminder emails to this client"
          onClick={handleToggle}
          disabled={isPending}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 disabled:opacity-50 ${
            enabled ? 'bg-brand-600' : 'bg-stone-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
              enabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
        <span className="text-sm text-stone-300">{enabled ? 'On' : 'Off'}</span>
        {isPending && <span className="text-xs text-stone-400">Saving…</span>}
      </div>
      <p className="text-xs text-stone-400 mt-1">
        Day-before event reminder emails and other automated messages
      </p>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
