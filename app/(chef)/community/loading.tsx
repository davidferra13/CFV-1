// Community Loading Skeleton
// Shown immediately while the server fetches community data.

import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-light ${className}`} />
}

export default function CommunityLoading() {
  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-40" />
        <Bone className="h-9 w-28" />
      </div>

      {/* Member cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <Bone className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-2">
                  <Bone className="h-4 w-28" />
                  <Bone className="h-3 w-20" />
                </div>
              </div>
              <Bone className="h-3 w-full" />
              <Bone className="h-3 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
