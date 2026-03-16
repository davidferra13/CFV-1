// Chef Profile Loading Skeleton
// Shown immediately while the server fetches chef profile data.

import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-200 rounded animate-pulse ${className}`} />
}

export default function ChefLoading() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <Bone className="h-8 w-40" />

      {/* Profile header card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-6">
            <Bone className="h-20 w-20 rounded-full shrink-0" />
            <div className="flex-1 space-y-3">
              <Bone className="h-6 w-48" />
              <Bone className="h-4 w-64" />
              <Bone className="h-4 w-36" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Bone className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex items-center justify-between">
                  <Bone className="h-4 w-28" />
                  <Bone className="h-4 w-36" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
