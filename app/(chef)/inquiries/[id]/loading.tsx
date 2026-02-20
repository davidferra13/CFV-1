// Inquiry Detail Loading Skeleton
// Matches the inquiry detail page: header, timeline/status, quotes section, notes.

import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-200 rounded animate-pulse ${className}`} />
}

export default function InquiryDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Bone className="h-8 w-56" />
          <div className="flex items-center gap-2">
            <Bone className="h-5 w-24 rounded-full" />
            <Bone className="h-4 w-28" />
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Bone className="h-9 w-28 rounded-lg" />
          <Bone className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Inquiry details */}
          <Card>
            <CardHeader>
              <Bone className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3">
                  <Bone className="h-4 w-28 shrink-0" />
                  <Bone className="h-4 w-48" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quotes section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between">
                <Bone className="h-5 w-20" />
                <Bone className="h-8 w-28 rounded-lg" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="space-y-1">
                    <Bone className="h-4 w-36" />
                    <Bone className="h-3 w-20" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Bone className="h-4 w-16" />
                    <Bone className="h-6 w-10 rounded" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <Bone className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-1">
                  <Bone className="h-3 w-24" />
                  <Bone className="h-4 w-full" />
                  <Bone className="h-4 w-3/4" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Bone className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Bone key={i} className="h-9 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Bone className="h-5 w-20" />
            </CardHeader>
            <CardContent className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex justify-between">
                  <Bone className="h-4 w-24" />
                  <Bone className="h-4 w-20" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
