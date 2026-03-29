// Global Error Boundary - 500 Page
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useChunkErrorRecovery } from '@/lib/hooks/use-chunk-error-recovery'

/**
 * Report an error to Sentry via the lightweight API route.
 * Non-blocking - failures are silently swallowed.
 */
function reportToSentry(error: Error & { digest?: string }) {
  try {
    fetch('/api/monitoring/report-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        name: error.name,
        digest: error.digest,
        tags: {
          boundary: 'global',
          route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        },
      }),
    }).catch(() => {
      // Swallow - reporting must never affect the user
    })
  } catch {
    // Swallow
  }
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [clearing, setClearing] = useState(false)
  const { isChunkError, triggerRecovery } = useChunkErrorRecovery(error)

  useEffect(() => {
    reportToSentry(error)
    console.error('Error boundary caught:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-stone-800 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-24 h-24 flex items-center justify-center rounded-full bg-red-900">
            <svg
              className="w-12 h-12 text-red-600"
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
          <CardTitle className="text-2xl">
            {isChunkError ? 'Updating app...' : 'Something went wrong'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isChunkError ? (
            <p className="text-sm text-stone-400 text-center">
              A new version of ChefFlow is available. Clearing cache and reloading...
            </p>
          ) : (
            <div className="bg-red-950 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800 font-mono break-all">
                {error.message || 'An unexpected error occurred'}
              </p>
              {error.digest && (
                <p className="text-xs text-red-600 mt-2">Error ID: {error.digest}</p>
              )}
            </div>
          )}
          <div className="space-y-2">
            {isChunkError ? (
              <Button
                variant="primary"
                onClick={() => {
                  setClearing(true)
                  triggerRecovery()
                }}
                disabled={clearing}
                className="w-full"
              >
                {clearing ? 'Clearing cache...' : 'Reload Now'}
              </Button>
            ) : (
              <>
                <Button variant="primary" onClick={reset} className="w-full">
                  Try Again
                </Button>
                <Link href="/" className="block">
                  <Button variant="secondary" className="w-full">
                    Go Home
                  </Button>
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
