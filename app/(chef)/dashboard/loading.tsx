// Dashboard Loading Skeleton
// Shown immediately while the server fetches dashboard data.
// Matches the real page's grid layout so the transition is smooth.

import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-200 rounded animate-pulse ${className}`} />
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <Bone className="h-8 w-56" />

      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-3">
              <Bone className="h-4 w-24" />
              <Bone className="h-8 w-20" />
              <Bone className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-column main area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority queue / today column */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <Bone className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Bone className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Bone className="h-4 w-3/4" />
                    <Bone className="h-3 w-1/2" />
                  </div>
                  <Bone className="h-6 w-16 rounded-full shrink-0" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Bone className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Bone className="h-4 w-48" />
                  <Bone className="h-4 w-20" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar widgets */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Bone className="h-6 w-28" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Bone key={i} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Bone className="h-6 w-36" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Bone className="h-16 w-full" />
              <Bone className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
