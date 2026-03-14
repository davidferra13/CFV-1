'use client'
// Push Permission Prompt
// A dismissible banner shown to chefs who haven't yet enabled browser push notifications.
// Shown after a 5-second delay to avoid immediately interrupting the user.
// Dismissed state is persisted to localStorage so it doesn't reappear after a single dismiss.
// Hidden entirely if push is unsupported, already granted, or already denied.

import { useState, useEffect } from 'react'
import { usePushSubscription } from './use-push-subscription'

const DISMISSED_KEY = 'chefflow:push-prompt-dismissed'

export function PushPermissionPrompt() {
  const { state, isLoading, subscribe } = usePushSubscription()
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(true) // start hidden, load from storage

  // Load dismissed state from localStorage after hydration
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_KEY)
      setDismissed(stored === 'true')
    } catch {
      setDismissed(false)
    }
  }, [])

  // Show after 5-second delay once we know the state
  useEffect(() => {
    if (state !== 'default' || dismissed) return
    const timer = setTimeout(() => setVisible(true), 5000)
    return () => clearTimeout(timer)
  }, [state, dismissed])

  const handleDismiss = () => {
    setVisible(false)
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY, 'true')
    } catch {
      // localStorage may not be available in all contexts
    }
  }

  const handleEnable = async () => {
    await subscribe()
    setVisible(false)
  }

  if (!visible) return null
  if (state !== 'default') return null

  return (
    <div
      role="alertdialog"
      aria-label="Enable push notifications"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
    >
      <div className="flex items-start gap-3 rounded-xl border border-stone-700 bg-stone-900 p-4 shadow-lg">
        {/* Bell icon */}
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-900 text-amber-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M10 2a6 6 0 00-6 6v1.382l-.764 1.527A1 1 0 004.118 12H6v.5A3.5 3.5 0 0010 16a3.5 3.5 0 003.5-3.5V12h1.882a1 1 0 00.882-1.473L16 9.382V8a6 6 0 00-6-6zM8.5 12.5A1.5 1.5 0 0010 14a1.5 1.5 0 001.5-1.5V12h-3v.5z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Text + actions */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-100">Stay in the loop</p>
          <p className="mt-0.5 text-xs text-stone-500">
            Get instant alerts for new inquiries, messages, and bookings — even when the app is
            closed.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleEnable}
              disabled={isLoading}
              className="rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Enabling…' : 'Enable alerts'}
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-stone-400 hover:text-stone-400 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="mt-0.5 text-stone-400 hover:text-stone-400 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
