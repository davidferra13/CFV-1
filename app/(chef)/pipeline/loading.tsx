// Loading skeleton for Sales Pipeline page
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function PipelineLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Bone className="h-5 w-5 rounded" />
        <div className="space-y-2">
          <Bone className="h-8 w-48" />
          <Bone className="h-4 w-72" />
        </div>
      </div>

      {/* Cross-domain links skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Bone key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>

      {/* KPI grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Bone className="w-9 h-9 rounded-lg" />
                <div className="space-y-1.5">
                  <Bone className="h-3 w-20" />
                  <Bone className="h-6 w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Funnel skeleton */}
      <div className="space-y-1">
        <Bone className="h-11 w-full rounded-lg" />
        <Bone className="h-11 w-3/4 rounded-lg" />
        <Bone className="h-11 w-1/2 rounded-lg" />
        <Bone className="h-11 w-1/3 rounded-lg" />
        <Bone className="h-11 w-1/4 rounded-lg" />
      </div>

      {/* Stage sections skeleton */}
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bone className="h-5 w-24" />
                <Bone className="h-5 w-8 rounded-full" />
              </div>
              <Bone className="h-4 w-16" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-stone-800">
              {[1, 2, 3].map((j) => (
                <div key={j} className="px-6 py-3 flex items-center gap-4">
                  <div className="flex-1 space-y-1.5">
                    <Bone className="h-4 w-32" />
                    <Bone className="h-3 w-24" />
                  </div>
                  <Bone className="h-4 w-16" />
                  <Bone className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
