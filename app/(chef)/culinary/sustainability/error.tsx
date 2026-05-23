'use client'

export default function SustainabilityLedgerError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-red-900/60 bg-red-950/20 p-6">
      <h1 className="text-xl font-semibold text-red-100">Sustainability ledger unavailable</h1>
      <p className="mt-2 text-sm text-red-200/80">
        The chef-only read model could not load. No public claims were emitted.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md border border-red-800 px-3 py-2 text-sm font-medium text-red-100 hover:border-red-600"
      >
        Try again
      </button>
    </div>
  )
}
