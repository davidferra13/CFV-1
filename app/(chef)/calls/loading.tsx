import { ContextLoader } from '@/components/ui/context-loader'

export default function CallsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <ContextLoader contextId="nav-inbox" size="sm" className="py-0 items-start" />
          <div className="h-4 w-64 bg-stone-800 rounded" />
        </div>
        <div className="h-9 w-28 bg-stone-700 rounded-lg" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['Upcoming', 'Completed', 'All'].map((tab) => (
          <div key={tab} className="h-8 w-24 bg-stone-700 rounded-full" />
        ))}
      </div>

      {/* Call cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-stone-700 bg-stone-900 p-4 flex items-center gap-4"
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-stone-700 flex-shrink-0" />
            {/* Name + meta */}
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-stone-700 rounded" />
              <div className="h-3 w-56 bg-stone-800 rounded" />
            </div>
            {/* Badge */}
            <div className="h-6 w-20 bg-stone-700 rounded-full flex-shrink-0" />
            {/* Time */}
            <div className="h-4 w-24 bg-stone-800 rounded flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
