'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { reportClientBoundaryError } from '@/lib/monitoring/report-client-error'
import { ErrorReportButton } from '@/components/feedback/error-report-button'
import { CopyableErrorId } from '@/components/feedback/copyable-error-id'

export default function EventDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportClientBoundaryError(error, { boundary: 'event-detail', digest: error.digest })
    console.error('[Event Detail Error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">Could not load this event.</p>
      {error.digest && (
        <CopyableErrorId
          digest={error.digest}
          className="text-muted-foreground/60 hover:text-muted-foreground"
        />
      )}
      <div className="flex gap-2">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
      </div>
      <ErrorReportButton error={error} boundary="event-detail" />
    </div>
  )
}
