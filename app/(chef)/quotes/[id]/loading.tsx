// Quote Detail Loading Skeleton
// Matches the quote detail page: header, client info, line items table, totals, actions.

import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function QuoteDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Bone className="h-8 w-60" />
          <div className="flex items-center gap-2">
            <Bone className="h-5 w-20 rounded-full" />
            <Bone className="h-4 w-36" />
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Bone className="h-9 w-24 rounded-lg" />
          <Bone className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column - line items */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between">
                <Bone className="h-5 w-24" />
                <Bone className="h-8 w-24 rounded-lg" />
              </div>
            </CardHeader>
            <CardContent>
              {/* Table header */}
              <div className="flex gap-4 pb-2 border-b">
                <Bone className="h-4 w-32" />
                <Bone className="h-4 w-16 ml-auto" />
                <Bone className="h-4 w-16" />
                <Bone className="h-4 w-16" />
              </div>
              {/* Line items */}
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4 py-3 border-b last:border-0 items-center">
                  <Bone className="h-4 w-48" />
                  <Bone className="h-4 w-12 ml-auto" />
                  <Bone className="h-4 w-16" />
                  <Bone className="h-4 w-16" />
                </div>
              ))}
              {/* Totals */}
              <div className="space-y-2 mt-4 border-t pt-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between">
                    <Bone className="h-4 w-24" />
                    <Bone className="h-4 w-20" />
                  </div>
                ))}
                <div className="flex justify-between border-t pt-2 mt-2">
                  <Bone className="h-6 w-16" />
                  <Bone className="h-6 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <Bone className="h-5 w-20" />
            </CardHeader>
            <CardContent>
              <Bone className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Client info */}
          <Card>
            <CardHeader>
              <Bone className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Bone className="h-5 w-36" />
              <Bone className="h-4 w-40" />
              <Bone className="h-4 w-32" />
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <Bone className="h-5 w-20" />
            </CardHeader>
            <CardContent className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Bone key={i} className="h-9 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
