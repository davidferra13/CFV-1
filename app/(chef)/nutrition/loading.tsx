// Nutrition Loading Skeleton
// Shown immediately while the server fetches nutrition data.

import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-200 rounded animate-pulse ${className}`} />
}

export default function NutritionLoading() {
  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-36" />
        <Bone className="h-9 w-28" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-3">
              <Bone className="h-4 w-24" />
              <Bone className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Nutrition list */}
      <Card>
        <CardHeader>
          <Bone className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-48" />
                <Bone className="h-3 w-32" />
              </div>
              <Bone className="h-4 w-20" />
              <Bone className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
