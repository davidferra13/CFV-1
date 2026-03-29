'use client'

// Chef Portal Error Boundary
// Catches errors within the (chef) route group before they bubble to the global error.tsx.
// Provides chef-specific recovery context and navigation.

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { reportClientBoundaryError } from '@/lib/monitoring/report-client-error'
import { useChunkErrorRecovery } from '@/lib/hooks/use-chunk-error-recovery'

export default function ChefError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { isChunkError, triggerRecovery } = useChunkErrorRecovery(error)

  useEffect(() => {
    reportClientBoundaryError(error, { boundary: 'chef', digest: error.digest })
    console.error('[Chef Portal Error]', error)
  }, [error])

  if (isChunkError) {
    return (
      <div className="min-h-screen bg-stone-800 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Updating app...</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              A new version of ChefFlow is available. Clearing cache and reloading...
            </p>
          </CardHeader>
          <CardContent>
            <Button variant="primary" onClick={triggerRecovery} className="w-full">
              Reload Now
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-800 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 flex items-center justify-center rounded-full bg-red-900">
            <svg
              className="w-10 h-10 text-red-600"
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
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            An error occurred in your chef dashboard.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {(error.message || error.digest) && (
            <div className="bg-red-950 border border-red-200 rounded-md p-3">
              {error.message && (
                <p className="text-sm text-red-800 font-mono break-all">{error.message}</p>
              )}
              {error.digest && (
                <p className="text-xs text-red-600 mt-1">Error ID: {error.digest}</p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Button variant="primary" onClick={reset} className="w-full">
              Try Again
            </Button>
            <Link href="/dashboard" className="block">
              <Button variant="secondary" className="w-full">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
