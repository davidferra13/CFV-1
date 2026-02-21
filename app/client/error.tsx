'use client'

// Public Client Portal Error Boundary
// Shown when a runtime error occurs while loading a client portal page.
// No auth context — visitor is accessing via magic link token.

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function ClientPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: 'client-portal', digest: error.digest },
    })
    console.error('[Client Portal Error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-5">
        <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-red-100">
          <svg
            className="w-8 h-8 text-red-500"
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
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Something went wrong</h1>
          <p className="text-sm text-stone-500 mt-1">
            There was a problem loading your portal. Please try again.
          </p>
        </div>
        {error.digest && (
          <p className="text-xs text-stone-400">Reference: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
