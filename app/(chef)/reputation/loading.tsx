// Reputation Loading Skeleton
// Shown immediately while the server fetches reputation data.

import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-200 rounded animate-pulse ${className}`} />
}

export default function ReputationLoading() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <Bone className="h-8 w-40" />

      {/* Score cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-3">
              <Bone className="h-4 w-28" />
              <Bone className="h-10 w-16" />
              <Bone className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reviews list */}
      <Card>
        <CardHeader>
          <Bone className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2 pb-4 border-b border-stone-100 last:border-0">
              <div className="flex items-center space-x-3">
                <Bone className="h-8 w-8 rounded-full shrink-0" />
                <Bone className="h-4 w-28" />
                <Bone className="h-3 w-20 ml-auto" />
              </div>
              <Bone className="h-3 w-full" />
              <Bone className="h-3 w-3/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
