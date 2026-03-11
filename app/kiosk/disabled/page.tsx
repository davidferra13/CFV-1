'use client'

import { useState, useRef } from 'react'

const DEVICE_TOKEN_KEY = 'chefflow_kiosk_token'

export default function KioskDisabledPage() {
  const [showReset, setShowReset] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleTouchStart() {
    longPressTimer.current = setTimeout(() => {
      setShowReset(true)
    }, 3000) // 3 second long press
  }

  function handleTouchEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function handleUnpair() {
    localStorage.removeItem(DEVICE_TOKEN_KEY)
    window.location.href = '/kiosk/pair'
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Warning icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-stone-800">
          <svg
            className="h-10 w-10 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-stone-100">Device Disabled</h1>
        <p className="text-lg text-stone-400">
          This device has been disabled by the account owner. Contact your administrator to
          re-enable it.
        </p>

        {/* Hidden reset — long press to reveal */}
        <div
          className="mt-12 py-4"
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {showReset ? (
            <button
              onClick={handleUnpair}
              className="rounded-xl bg-red-900/50 px-6 py-3 text-sm font-medium text-red-300 transition-colors hover:bg-red-900"
            >
              Unpair Device
            </button>
          ) : (
            <p className="text-xs text-stone-200">Hold here for 3 seconds for device options</p>
          )}
        </div>
      </div>
    </div>
  )
}
