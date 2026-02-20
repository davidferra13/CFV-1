// Client Detail Loading Skeleton
// Matches the client detail page: profile header, contact card, events, financial, loyalty.

import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-200 rounded animate-pulse ${className}`} />
}

export default function ClientDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <Bone className="h-16 w-16 rounded-full shrink-0" />
        <div className="space-y-2">
          <Bone className="h-7 w-48" />
          <Bone className="h-4 w-32" />
          <Bone className="h-4 w-40" />
        </div>
        <div className="ml-auto flex gap-2 shrink-0">
          <Bone className="h-9 w-24 rounded-lg" />
          <Bone className="h-9 w-20 rounded-lg" />
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Bone className="h-3 w-20" />
              <Bone className="h-6 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Event history */}
          <Card>
            <CardHeader>
              <Bone className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <Bone className="h-4 w-40" />
                    <Bone className="h-3 w-24" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Bone className="h-5 w-16 rounded-full" />
                    <Bone className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Notes / preferences */}
          <Card>
            <CardHeader>
              <Bone className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Bone className="h-4 w-full" />
              <Bone className="h-4 w-5/6" />
              <Bone className="h-4 w-4/5" />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Contact info */}
          <Card>
            <CardHeader>
              <Bone className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Bone className="h-4 w-4 rounded shrink-0" />
                  <Bone className="h-4 w-40" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Loyalty */}
          <Card>
            <CardHeader>
              <Bone className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <Bone className="h-4 w-20" />
                <Bone className="h-4 w-12" />
              </div>
              <Bone className="h-2 w-full rounded-full" />
              <Bone className="h-3 w-32" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
