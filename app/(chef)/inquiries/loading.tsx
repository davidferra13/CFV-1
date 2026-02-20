// Inquiries Loading Skeleton
// Shown immediately while the server fetches the inquiry pipeline.

import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-200 rounded animate-pulse ${className}`} />
}

export default function InquiriesLoading() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <Bone className="h-8 w-36" />

      {/* Stage stat pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Bone className="h-3 w-20" />
              <Bone className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Inquiry list */}
      <Card>
        <CardHeader>
          <Bone className="h-5 w-28" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-stone-100">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4">
                <div className="space-y-2 flex-1">
                  <Bone className="h-4 w-56" />
                  <Bone className="h-3 w-40" />
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <Bone className="h-6 w-20 rounded-full" />
                  <Bone className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
