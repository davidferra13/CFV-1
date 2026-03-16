// PageSkeleton - reusable loading skeleton for route-level loading.tsx files.
// Variants match the most common page layouts in ChefFlow.

import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

/** Simple list page: header + action button + table rows */
export function ListPageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-40" />
        <Bone className="h-9 w-28" />
      </div>
      <Card>
        <CardContent className="p-0 divide-y divide-stone-800">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-48" />
                <Bone className="h-3 w-32" />
              </div>
              <Bone className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

/** Detail page: back link + header + content cards */
export function DetailPageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Bone className="h-4 w-24" />
      <div className="space-y-2">
        <Bone className="h-8 w-64" />
        <Bone className="h-4 w-40" />
      </div>
      <Card>
        <CardHeader>
          <Bone className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-3/4" />
          <Bone className="h-4 w-1/2" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Bone className="h-5 w-28" />
        </CardHeader>
        <CardContent>
          <Bone className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

/** Form page: header + form fields */
export function FormPageSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Bone className="h-8 w-48" />
      <Card>
        <CardContent className="p-6 space-y-5">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-3 w-20" />
              <Bone className="h-10 w-full" />
            </div>
          ))}
          <Bone className="h-10 w-32 mt-4" />
        </CardContent>
      </Card>
    </div>
  )
}

/** Grid page: header + stat cards + grid items */
export function GridPageSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-48" />
        <Bone className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <Bone className="h-5 w-32" />
              <Bone className="h-4 w-full" />
              <Bone className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
