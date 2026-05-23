'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorReportButton } from '@/components/feedback/error-report-button'
import { CopyableErrorId } from '@/components/feedback/copyable-error-id'
import { reportClientBoundaryError } from '@/lib/monitoring/report-client-error'

export default function StaffTrustDelegationError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportClientBoundaryError(error, { boundary: 'staff-trust-delegation', digest: error.digest })
    console.error('[Staff Trust Delegation Error]', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-xl font-semibold text-stone-100">Could not load staff trust</h2>
      <p className="max-w-md text-sm text-stone-400">
        The delegation read model could not be assembled.
      </p>
      {error.digest ? (
        <CopyableErrorId digest={error.digest} className="text-stone-500 hover:text-stone-300" />
      ) : null}
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
      <ErrorReportButton error={error} boundary="staff-trust-delegation" />
    </div>
  )
}
