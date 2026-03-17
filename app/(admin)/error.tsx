'use client'

// Admin Panel Error Boundary
// Catches errors within the (admin) route group before they bubble to the global error.tsx.
// Provides admin-specific recovery context.

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { reportClientBoundaryError } from '@/lib/monitoring/report-client-error'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportClientBoundaryError(error, { boundary: 'admin', digest: error.digest })
    console.error('[Admin Error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-900/40 rounded-lg">
            <svg
              className="w-5 h-5 text-red-400"
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
            <h1 className="text-base font-semibold text-slate-100">Admin Error</h1>
            <p className="text-xs text-slate-400">Something went wrong in the admin panel.</p>
          </div>
        </div>

        {(error.message || error.digest) && (
          <div className="bg-red-900/20 border border-red-800/50 rounded-md px-3 py-2.5">
            {error.message && (
              <p className="text-xs text-red-300 font-mono break-all">{error.message}</p>
            )}
            {error.digest && <p className="text-xs text-slate-500 mt-1">ID: {error.digest}</p>}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="primary" onClick={reset} className="flex-1">
            Retry
          </Button>
          <Link href="/admin" className="flex-1">
            <Button variant="secondary" className="w-full">
              Admin Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
