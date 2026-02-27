'use client'

import { useState, useRef } from 'react'

interface KioskHeaderProps {
  businessName: string
  staffName: string | null
  onHardReset: () => void
  onSwitchStaff?: () => void
}

export function KioskHeader({
  businessName,
  staffName,
  onHardReset,
  onSwitchStaff,
}: KioskHeaderProps) {
  const [showReset, setShowReset] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handlePressStart() {
    longPressTimer.current = setTimeout(() => {
      setShowReset(true)
    }, 3000)
  }

  function handlePressEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-stone-800 px-6 py-4">
      <div
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        className="cursor-default"
      >
        <h1 className="text-xl font-bold text-brand-500">{businessName}</h1>
      </div>

      <div className="flex items-center gap-4">
        {staffName && (
          <>
            <span className="text-sm text-stone-400">
              Staff: <span className="font-medium text-stone-200">{staffName}</span>
            </span>
            {onSwitchStaff && (
              <button
                type="button"
                onClick={onSwitchStaff}
                className="flex items-center gap-1.5 rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:bg-stone-700"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Lock
              </button>
            )}
          </>
        )}

        {showReset && (
          <button
            onClick={onHardReset}
            className="rounded-lg bg-red-900/50 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-900"
          >
            Reset Device
          </button>
        )}
      </div>
    </header>
  )
}
