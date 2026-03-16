import { ContextLoader } from '@/components/ui/context-loader'

export default function OperationsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <ContextLoader contextId="nav-operations" size="sm" className="py-0 items-start" />
        <div className="h-4 w-64 bg-stone-800 rounded" />
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

      {/* Nav tiles - 2 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-stone-700" />
              <div className="h-5 w-36 bg-stone-700 rounded" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-stone-800 rounded" />
              <div className="h-3 w-3/4 bg-stone-800 rounded" />
            </div>
            <div className="h-6 w-16 bg-stone-700 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
