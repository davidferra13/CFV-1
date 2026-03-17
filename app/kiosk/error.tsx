'use client'

import { useEffect } from 'react'
import { reportClientBoundaryError } from '@/lib/monitoring/report-client-error'

export default function KioskError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportClientBoundaryError(error, { boundary: 'kiosk', digest: error.digest })
    console.error('[Kiosk Error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center px-4 select-none">
      <div className="text-center max-w-md space-y-6">
        <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-full bg-red-900/50">
          <svg
            className="w-10 h-10 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-stone-400">The kiosk encountered an error. Tap below to try again.</p>
        {error.digest && (
          <p className="text-xs text-stone-500 font-mono">Error ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="w-full py-4 px-6 bg-brand-500 text-white text-lg font-medium rounded-xl active:scale-95 transition-transform"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
