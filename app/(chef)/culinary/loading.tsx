import { ContextLoader } from '@/components/ui/context-loader'

export default function CulinaryLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <ContextLoader contextId="nav-recipes" size="sm" className="py-0 items-start" />
        <div className="h-4 w-72 bg-stone-800 rounded" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-stone-700 bg-stone-900 p-4 space-y-2">
            <div className="h-3 w-20 bg-stone-800 rounded" />
            <div className="h-8 w-12 bg-stone-700 rounded" />
          </div>
        ))}
      </div>

      {/* Nav tiles - 3 columns × 2 rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-stone-700" />
              <div className="h-5 w-28 bg-stone-700 rounded" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-stone-800 rounded" />
              <div className="h-3 w-4/5 bg-stone-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
