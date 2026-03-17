'use client'

// Operations Error Boundary
// Catches errors in kitchen-rentals, equipment, expenses.

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { reportClientBoundaryError } from '@/lib/monitoring/report-client-error'

export default function OperationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportClientBoundaryError(error, { boundary: 'operations', digest: error.digest })
    console.error('[Operations Error]', error)
  }, [error])

  return (
    <div className="flex items-center justify-center px-4 py-20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Operations Error</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Something went wrong loading this operations page.
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
            <Link href="/operations" className="block">
              <Button variant="secondary" className="w-full">
                Back to Operations
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
