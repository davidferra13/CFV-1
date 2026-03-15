// Events Loading Skeleton
// Shown immediately while the server fetches the events list.

import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function EventsLoading() {
  return (
    <div className="space-y-6">
      {/* Header row with context-aware message */}
      <div className="flex items-center justify-between">
        <ContextLoader contextId="nav-events" size="sm" className="py-0 items-start" />
        <Bone className="h-9 w-28" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Bone key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {/* Table header */}
          <div className="flex items-center gap-4 px-6 py-3 border-b border-stone-800">
            <Bone className="h-3 w-32" />
            <Bone className="h-3 w-24 ml-auto" />
            <Bone className="h-3 w-20" />
            <Bone className="h-3 w-16" />
          </div>
          {/* Rows */}
          <div className="divide-y divide-stone-800">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 space-y-2">
                  <Bone className="h-4 w-52" />
                  <Bone className="h-3 w-36" />
                </div>
                <Bone className="h-4 w-24" />
                <Bone className="h-4 w-20" />
                <Bone className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
