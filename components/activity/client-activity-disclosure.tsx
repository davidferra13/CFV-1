'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const STORAGE_KEY = 'chefflow-client-activity-disclosure-dismissed'

export function ClientActivityDisclosure() {
  const [isReady, setIsReady] = useState(false)
  const [isDismissed, setIsDismissed] = useState(true)

  useEffect(() => {
    try {
      setIsDismissed(window.localStorage.getItem(STORAGE_KEY) === 'true')
    } catch {
      setIsDismissed(false)
    } finally {
      setIsReady(true)
    }
  }, [])

  const dismiss = () => {
    setIsDismissed(true)

    try {
      window.localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // Local storage can be unavailable in hardened browsers. The in-memory
      // dismissal still keeps the current portal session usable.
    }
  }

  if (!isReady || isDismissed) {
    return null
  }

  return (
    <section
      aria-label="Client activity disclosure"
      className="mb-4 rounded-lg border border-amber-400/30 bg-amber-950/35 px-4 py-3 text-sm text-amber-50 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-amber-100">Portal activity is shared with your chef</p>
          <p className="mt-1 leading-6 text-amber-50/85">
            ChefFlow shares activity signals from this client portal, such as viewing quotes,
            events, messages, or payment pages, so your chef can coordinate service. Private browser
            activity outside ChefFlow is never shown.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded p-1 text-amber-100 transition hover:bg-amber-100/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-amber-950"
          aria-label="Dismiss activity disclosure"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
