// TakeAChef Welcome Guide — dismissible first-run explanation
// Shown inside the dashboard widget until the chef dismisses it.
'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'chefflow:tac-welcome-dismissed'

export function TacWelcomeGuide() {
  const [dismissed, setDismissed] = useState(true) // default hidden to avoid flash

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') {
        setDismissed(false)
      }
    } catch {
      // Private browsing — show the guide anyway
      setDismissed(false)
    }
  }, [])

  if (dismissed) return null

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {}
    setDismissed(true)
  }

  return (
    <div className="rounded-md border border-blue-200 bg-blue-950/60 px-3 py-2.5 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-blue-200">How TakeAChef Integration Works</p>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-blue-400 hover:text-blue-600 text-sm leading-none shrink-0"
          aria-label="Dismiss guide"
        >
          &times;
        </button>
      </div>
      <ol className="text-[11px] text-blue-200 space-y-0.5 list-decimal list-inside">
        <li>New leads from TakeAChef appear here automatically from your Gmail</li>
        <li>Address each lead — send a menu to start the conversation, or decline</li>
        <li>
          Save your TakeAChef conversations by pasting them into ChefFlow — we can't grab them
          automatically, and TakeAChef locks transcripts when inquiries close
        </li>
        <li>When a booking confirms, we auto-create the event — you just build the final menu</li>
      </ol>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-[11px] text-blue-500 hover:text-blue-200 underline underline-offset-2"
      >
        Got it, don't show again
      </button>
    </div>
  )
}
