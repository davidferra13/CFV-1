// Payments Loading Skeleton
// Shown immediately while the server fetches payment data.

import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-light ${className}`} />
}

export default function PaymentsLoading() {
  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-36" />
        <div className="flex gap-2">
          <Bone className="h-9 w-48" />
          <Bone className="h-9 w-28" />
        </div>
      </div>

      {/* Summary stat cards */}
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

      {/* Payments table */}
      <Card>
        <CardHeader>
          <Bone className="h-6 w-36" />
        </CardHeader>
        <CardContent className="p-0">
          {/* Table header */}
          <div className="flex items-center gap-4 px-6 py-3 border-b border-stone-100">
            <Bone className="h-3 w-32" />
            <Bone className="h-3 w-24 ml-auto" />
            <Bone className="h-3 w-20" />
            <Bone className="h-3 w-16" />
          </div>
          {/* Rows */}
          <div className="divide-y divide-stone-100">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 space-y-2">
                  <Bone className="h-4 w-44" />
                  <Bone className="h-3 w-28" />
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
