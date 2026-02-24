export default function StaffLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-stone-700 rounded" />
          <div className="h-4 w-56 bg-stone-800 rounded" />
        </div>
        <div className="h-9 w-28 bg-stone-700 rounded-lg" />
      </div>

      {/* Team member rows */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 divide-y divide-stone-800">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-stone-700 flex-shrink-0" />
            {/* Name + role */}
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-36 bg-stone-700 rounded" />
              <div className="h-3 w-24 bg-stone-800 rounded" />
            </div>
            {/* Role badge */}
            <div className="h-6 w-20 bg-stone-700 rounded-full flex-shrink-0" />
            {/* Status dot */}
            <div className="w-3 h-3 rounded-full bg-stone-700 flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Availability section */}
      <div className="space-y-2">
        <div className="h-5 w-32 bg-stone-700 rounded" />
        <div className="rounded-xl border border-stone-700 bg-stone-900 p-4 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-stone-700" />
              <div className="flex-1 h-3 bg-stone-800 rounded" />
              <div className="h-4 w-16 bg-stone-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
