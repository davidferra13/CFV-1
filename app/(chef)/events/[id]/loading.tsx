// Event Detail Loading Skeleton
// Matches the real event detail page layout - header, action buttons, and section cards.

import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function EventDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header row: title + status badge + action buttons */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Bone className="h-8 w-64" />
          <div className="flex items-center gap-2">
            <Bone className="h-5 w-20 rounded-full" />
            <Bone className="h-4 w-32" />
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Bone className="h-9 w-20 rounded-lg" />
          <Bone className="h-9 w-24 rounded-lg" />
          <Bone className="h-9 w-16 rounded-lg" />
        </div>
      </div>

      {/* Sub-page nav buttons (Pack, Travel, Invoice…) */}
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4].map((i) => (
          <Bone key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>

      {/* Two-column main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Event details card */}
          <Card>
            <CardHeader>
              <Bone className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3">
                  <Bone className="h-4 w-24 shrink-0" />
                  <Bone className="h-4 w-48" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Menu card */}
          <Card>
            <CardHeader>
              <Bone className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Bone className="h-4 w-4 rounded shrink-0" />
                  <Bone className="h-4 w-56" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Documents card */}
          <Card>
            <CardHeader>
              <Bone className="h-5 w-28" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Bone key={i} className="h-9 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Payment card */}
          <Card>
            <CardHeader>
              <Bone className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <Bone className="h-4 w-20" />
                <Bone className="h-4 w-16" />
              </div>
              <div className="flex justify-between">
                <Bone className="h-4 w-24" />
                <Bone className="h-4 w-16" />
              </div>
              <Bone className="h-9 w-full rounded-lg mt-2" />
            </CardContent>
          </Card>

          {/* Transition card */}
          <Card>
            <CardHeader>
              <Bone className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Bone className="h-9 w-full rounded-lg" />
              <Bone className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
