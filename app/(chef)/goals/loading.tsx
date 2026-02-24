export default function GoalsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-stone-700 rounded" />
          <div className="h-4 w-60 bg-stone-800 rounded" />
        </div>
        <div className="h-9 w-28 bg-stone-700 rounded-lg" />
      </div>

      {/* Summary stat row */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-stone-700 bg-stone-900 p-4 space-y-2 text-center"
          >
            <div className="h-8 w-12 bg-stone-700 rounded mx-auto" />
            <div className="h-3 w-20 bg-stone-800 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Goal cards */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-5 w-48 bg-stone-700 rounded" />
                <div className="h-3 w-32 bg-stone-800 rounded" />
              </div>
              <div className="h-6 w-16 bg-stone-700 rounded-full" />
            </div>
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <div className="h-3 w-24 bg-stone-800 rounded" />
                <div className="h-3 w-12 bg-stone-800 rounded" />
              </div>
              <div className="h-2 w-full bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-stone-700 rounded-full"
                  style={{ width: `${30 + i * 20}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
