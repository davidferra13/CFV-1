'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-xl font-semibold">Could not load stations</h2>
      <p className="text-sm text-muted-foreground">
        Something went wrong loading this page.
        {error.digest && (
          <span className="block text-xs text-muted-foreground/60 mt-1">
            Reference: {error.digest}
          </span>
        )}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
      >
        Try again
      </button>
    </div>
  )
}
