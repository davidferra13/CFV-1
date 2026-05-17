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
      <h2 className="text-xl font-semibold">Event failed to load</h2>
      <p className="text-muted-foreground text-sm">
        Could not load this event. It may still be processing, or your connection dropped.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
        >
          Retry
        </button>
        <a
          href="/my-events"
          className="px-4 py-2 border border-stone-600 text-stone-300 rounded-md hover:bg-stone-700 text-sm"
        >
          Back to My Events
        </a>
      </div>
    </div>
  )
}
