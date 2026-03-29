'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { reportClientBoundaryError } from '@/lib/monitoring/report-client-error'
import { useChunkErrorRecovery } from '@/lib/hooks/use-chunk-error-recovery'

export default function StaffError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { isChunkError, triggerRecovery } = useChunkErrorRecovery(error)

  useEffect(() => {
    reportClientBoundaryError(error, { boundary: 'staff', digest: error.digest })
    console.error('[Staff Portal Error]', error)
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
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            An error occurred in the staff portal.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono text-center">
              Error ID: {error.digest}
            </p>
          )}
          <Button variant="primary" onClick={reset} className="w-full">
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
