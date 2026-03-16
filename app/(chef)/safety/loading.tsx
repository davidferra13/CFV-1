// Safety Loading Skeleton
// Shown immediately while the server fetches food safety data.

import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-200 rounded animate-pulse ${className}`} />
}

export default function SafetyLoading() {
  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-36" />
        <Bone className="h-9 w-28" />
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-3">
              <Bone className="h-4 w-28" />
              <Bone className="h-6 w-20 rounded-full" />
              <Bone className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Checklist / log */}
      <Card>
        <CardHeader>
          <Bone className="h-6 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Bone className="h-5 w-5 rounded shrink-0" />
              <Bone className="h-4 w-52" />
              <Bone className="h-3 w-20 ml-auto" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
