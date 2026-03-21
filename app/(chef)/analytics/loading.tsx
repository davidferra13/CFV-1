// Analytics Hub Loading Skeleton - shown instantly when navigating to /analytics
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      {/* Context-aware message with elapsed timer for longer load */}
      <ContextLoader contextId="nav-analytics" size="sm" className="py-0 items-start" showElapsed />

      {/* Tab bar skeleton */}
      <div className="flex gap-2 border-b border-stone-700 pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-24 loading-bone loading-bone-dark" />
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 w-24 loading-bone loading-bone-dark" />
                <div className="h-8 w-20 loading-bone loading-bone-dark" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart area */}
      <Card>
        <CardHeader>
          <div className="h-6 w-40 loading-bone loading-bone-dark" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] loading-bone loading-bone-muted" />
        </CardContent>
      </Card>
    </div>
  )
}
