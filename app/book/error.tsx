'use client'

import { useEffect } from 'react'
import { ErrorReportButton } from '@/components/feedback/error-report-button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-semibold">Booking page failed to load</h2>
      <p className="text-muted-foreground text-sm">
        Could not load the booking form. Check your connection and try again.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-md border border-stone-600 px-4 py-2 text-sm font-medium text-stone-300 hover:bg-stone-700"
        >
          Go Back
        </button>
      </div>
      <ErrorReportButton error={error} boundary="book" />
    </div>
  )
}
