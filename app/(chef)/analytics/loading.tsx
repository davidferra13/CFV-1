// Analytics Hub Loading Skeleton — shown instantly when navigating to /analytics
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="h-9 w-48 bg-stone-200 rounded animate-pulse" />
        <div className="h-4 w-80 bg-stone-200 rounded animate-pulse mt-2" />
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-2 border-b border-stone-200 pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-24 bg-stone-200 rounded animate-pulse" />
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 w-24 bg-stone-200 rounded animate-pulse" />
                <div className="h-8 w-20 bg-stone-200 rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart area */}
      <Card>
        <CardHeader>
          <div className="h-6 w-40 bg-stone-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-stone-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    </div>
  )
}
