// Chef Portal Loading Page
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function ChefLoading() {
  return (
    <div className="space-y-6">
      {/* Page Title Skeleton */}
      <div className="h-8 w-48 bg-stone-200 rounded animate-pulse" />

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 w-24 bg-stone-200 rounded animate-pulse" />
                <div className="h-8 w-16 bg-stone-200 rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Card Skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-stone-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-stone-200 rounded animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-stone-200 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-stone-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Loading Text */}
      <div className="text-center text-stone-500 text-sm">
        Loading...
      </div>
    </div>
  )
}
