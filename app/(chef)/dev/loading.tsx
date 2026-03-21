// Dev Tools Loading Skeleton
// Shown immediately while the server fetches dev tools data.

import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-light ${className}`} />
}

export default function DevLoading() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <Bone className="h-8 w-36" />

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-3">
              <Bone className="h-4 w-24" />
              <Bone className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tool sections */}
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Bone className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="flex items-center justify-between">
                <Bone className="h-4 w-44" />
                <Bone className="h-8 w-20 rounded" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
