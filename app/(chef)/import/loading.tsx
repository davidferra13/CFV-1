import { ContextLoader } from '@/components/ui/context-loader'

export default function ImportLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <ContextLoader contextId="nav-recipes" size="sm" className="py-0 items-start" />
        <div className="h-4 w-80 bg-stone-800 rounded" />
      </div>

      {/* Import type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-stone-700" />
            <div className="h-5 w-32 bg-stone-700 rounded" />
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-stone-800 rounded" />
              <div className="h-3 w-4/5 bg-stone-800 rounded" />
            </div>
            <div className="h-9 w-full bg-stone-700 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Recent imports section */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-4">
        <div className="h-5 w-36 bg-stone-700 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-stone-700 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-48 bg-stone-700 rounded" />
              <div className="h-3 w-32 bg-stone-800 rounded" />
            </div>
            <div className="h-6 w-16 bg-stone-800 rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
