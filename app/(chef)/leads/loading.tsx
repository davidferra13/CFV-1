export default function LeadsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-stone-200 rounded" />
          <div className="h-4 w-56 bg-stone-100 rounded" />
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-8 w-24 bg-stone-200 rounded-full" />
        ))}
      </div>

      {/* Lead cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="h-4 w-40 bg-stone-200 rounded" />
                <div className="h-3 w-56 bg-stone-100 rounded" />
              </div>
              <div className="h-6 w-20 bg-stone-200 rounded-full" />
            </div>
            <div className="flex gap-4">
              <div className="h-3 w-24 bg-stone-100 rounded" />
              <div className="h-3 w-20 bg-stone-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
