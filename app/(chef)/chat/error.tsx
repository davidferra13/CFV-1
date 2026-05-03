'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { reportClientBoundaryError } from '@/lib/monitoring/report-client-error'
import { ErrorReportButton } from '@/components/feedback/error-report-button'
import { CopyableErrorId } from '@/components/feedback/copyable-error-id'

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportClientBoundaryError(error, { boundary: 'chat', digest: error.digest })
    console.error('[Chat Error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-xl font-semibold">Could not load messages</h2>
      <p className="text-sm text-muted-foreground">Something went wrong.</p>
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
      <ErrorReportButton error={error} boundary="chat" />
    </div>
  )
}
