export default function InsightsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-7 w-36 bg-stone-200 rounded" />
        <div className="h-4 w-64 bg-stone-100 rounded" />
      </div>

      {/* Period selector */}
      <div className="flex gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-8 w-20 bg-stone-200 rounded-lg" />
        ))}
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-4 space-y-2">
            <div className="h-3 w-24 bg-stone-100 rounded" />
            <div className="h-8 w-20 bg-stone-200 rounded" />
            <div className="h-3 w-16 bg-stone-100 rounded" />
          </div>
        ))}
      </div>

      {/* Chart placeholders — two side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-5 space-y-3">
            <div className="h-5 w-40 bg-stone-200 rounded" />
            <div className="h-40 w-full bg-stone-100 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Top clients list */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <div className="h-5 w-32 bg-stone-200 rounded" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-stone-200 flex-shrink-0" />
            <div className="flex-1 h-3 bg-stone-100 rounded" />
            <div className="h-4 w-20 bg-stone-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
