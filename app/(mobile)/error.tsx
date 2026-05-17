'use client'

import { useEffect } from 'react'
import { useChunkErrorRecovery } from '@/lib/hooks/use-chunk-error-recovery'
import { ErrorReportButton } from '@/components/feedback/error-report-button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { isChunkError, triggerRecovery } = useChunkErrorRecovery(error)

  useEffect(() => {
    console.error(error)
  }, [error])

  if (isChunkError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
        <h2 className="text-xl font-semibold">Updating app...</h2>
        <p className="text-muted-foreground text-sm">Clearing cache and reloading...</p>
        <button
          onClick={triggerRecovery}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Reload Now
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-semibold">Page failed to load</h2>
      <p className="text-muted-foreground text-sm">
        Could not display this page. Try again or go back.
      </p>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Retry
        </button>
        <button
          onClick={() => window.history.back()}
          className="rounded-md border border-stone-600 px-4 py-2 text-sm font-medium text-stone-300 hover:bg-stone-700"
        >
          Go Back
        </button>
      </div>
      <ErrorReportButton error={error} boundary="mobile" />
    </div>
  )
}
