// Skeleton loader for chef profile page - prevents blank screen during SSR

export default function ChefProfileLoading() {
  return (
    <div className="min-h-screen bg-stone-900">
      {/* Hero skeleton */}
      <div className="relative h-64 sm:h-80 bg-stone-800 animate-pulse" />

      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10 pb-16 space-y-6">
        {/* Avatar + name */}
        <div className="flex items-end gap-4">
          <div className="w-28 h-28 rounded-full bg-stone-700 border-4 border-stone-900 animate-pulse" />
          <div className="space-y-2 pb-2">
            <div className="h-7 w-48 bg-stone-700 rounded animate-pulse" />
            <div className="h-4 w-32 bg-stone-800 rounded animate-pulse" />
          </div>
        </div>

        {/* Bio skeleton */}
        <div className="bg-stone-800 border border-stone-700 rounded-xl p-6 space-y-3">
          <div className="h-5 w-24 bg-stone-700 rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-stone-700/60 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-stone-700/60 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-stone-700/60 rounded animate-pulse" />
          </div>
        </div>

        {/* Snapshot grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-stone-800 border border-stone-700 rounded-xl p-4 space-y-2 animate-pulse"
            >
              <div className="h-4 w-16 bg-stone-700 rounded" />
              <div className="h-5 w-24 bg-stone-700/60 rounded" />
            </div>
          ))}
        </div>

        {/* CTA skeleton */}
        <div className="bg-stone-800 border border-stone-700 rounded-xl p-6 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-40 bg-stone-700 rounded animate-pulse" />
            <div className="h-4 w-56 bg-stone-700/60 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-stone-700 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}
