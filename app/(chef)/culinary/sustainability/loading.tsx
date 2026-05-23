export default function SustainabilityLedgerLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-28 animate-pulse rounded bg-stone-800" />
        <div className="h-8 w-72 animate-pulse rounded bg-stone-800" />
        <div className="h-4 max-w-2xl animate-pulse rounded bg-stone-800" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="rounded-lg border border-stone-800 bg-stone-900/40 p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-stone-800" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-stone-800" />
            <div className="mt-2 h-4 w-36 animate-pulse rounded bg-stone-800" />
          </div>
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-lg border border-stone-800 bg-stone-900/40" />
    </div>
  )
}
