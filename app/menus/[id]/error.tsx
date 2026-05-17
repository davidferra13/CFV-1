'use client'

import { useEffect } from 'react'

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
      <h2 className="text-xl font-semibold">Menu failed to load</h2>
      <p className="text-muted-foreground text-sm">
        Could not display this menu. It may have been moved or deleted.
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
    </div>
  )
}
