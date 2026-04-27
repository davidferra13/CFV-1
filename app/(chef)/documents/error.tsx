'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { reportClientBoundaryError } from '@/lib/monitoring/report-client-error'
import { useChunkErrorRecovery } from '@/lib/hooks/use-chunk-error-recovery'

export default function DocumentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { isChunkError, triggerRecovery } = useChunkErrorRecovery(error)

  useEffect(() => {
    reportClientBoundaryError(error, { boundary: 'documents', digest: error.digest })
    console.error('[Documents Error]', error)
  }, [error])

  if (isChunkError) {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4">
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
    <div className="flex items-center justify-center min-h-[400px] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Could not load documents</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Something went wrong loading this page.
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
