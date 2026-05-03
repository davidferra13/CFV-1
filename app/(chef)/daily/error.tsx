'use client'

// Error boundary for the Daily Ops page.
// Shown when getDailyPlan() throws (e.g. DB timeout).

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { reportClientBoundaryError } from '@/lib/monitoring/report-client-error'
import { ErrorReportButton } from '@/components/feedback/error-report-button'

export default function DailyOpsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportClientBoundaryError(error, { boundary: 'daily', digest: error.digest })
    console.error('[DailyOps] Page error:', error)
  }, [error])

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display text-stone-100">Daily Ops</h1>
      </div>
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-8 text-center space-y-4">
        <p className="text-stone-300 font-medium">Could not load your daily plan</p>
        <p className="text-sm text-stone-500">This usually resolves on its own. Try refreshing.</p>
        <Button onClick={reset} variant="secondary">
          Try again
        </Button>
        <ErrorReportButton error={error} boundary="daily" />
      </div>
    </div>
  )
}
