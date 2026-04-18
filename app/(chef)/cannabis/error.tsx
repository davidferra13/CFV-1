'use client'

// Cannabis Module Error Boundary
// Catches errors across the cannabis compliance and events pages.

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { reportClientBoundaryError } from '@/lib/monitoring/report-client-error'

export default function CannabisError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportClientBoundaryError(error, { boundary: 'cannabis', digest: error.digest })
    console.error('[Cannabis Module Error]', error)
  }, [error])

  return (
    <div className="flex items-center justify-center px-4 py-20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Cannabis Module Error</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Something went wrong in the cannabis compliance module.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.digest && (
            <div className="bg-red-950 border border-red-200 rounded-md p-3">
              <p className="text-xs text-red-600">Error ID: {error.digest}</p>
            </div>
          )}
          <div className="space-y-2">
            <Button variant="primary" onClick={reset} className="w-full">
              Try Again
            </Button>
            <Link href="/cannabis" className="block">
              <Button variant="secondary" className="w-full">
                Back to Cannabis Hub
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
