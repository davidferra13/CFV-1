// Client Portal Loading Page
import { ContextLoader } from '@/components/ui/context-loader'
import { Card, CardContent } from '@/components/ui/card'

export default function ClientLoading() {
  return (
    <div className="space-y-6">
      {/* Page Title Skeleton */}
      <ContextLoader contextId="nav-client-portal" size="sm" className="py-0 items-start" />

      {/* Events Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Event Title */}
                <div className="h-6 w-3/4 bg-stone-200 rounded animate-pulse" />

                {/* Event Details */}
                <div className="space-y-2">
                  <div className="h-4 w-full bg-stone-200 rounded animate-pulse" />
                  <div className="h-4 w-5/6 bg-stone-200 rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-stone-200 rounded animate-pulse" />
                </div>

                {/* Status Badge */}
                <div className="h-6 w-20 bg-stone-200 rounded-full animate-pulse" />

                {/* Action Button */}
                <div className="h-10 w-full bg-stone-200 rounded-md animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loading Text */}
      <ContextLoader contextId="nav-client-portal" size="sm" className="py-2" />
    </div>
  )
}
