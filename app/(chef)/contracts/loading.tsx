// Contracts Loading Skeleton
// Shown immediately while the server fetches the contracts list.

import { Card, CardContent } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-200 rounded animate-pulse ${className}`} />
}

export default function ContractsLoading() {
  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-36" />
        <Bone className="h-9 w-32" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <Bone key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* Contract list */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-stone-100">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 space-y-2">
                  <Bone className="h-4 w-48" />
                  <Bone className="h-3 w-32" />
                </div>
                <Bone className="h-4 w-24" />
                <Bone className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
