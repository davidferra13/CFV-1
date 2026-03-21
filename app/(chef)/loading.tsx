// Chef Portal Loading Page
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

export default function ChefLoading() {
  return (
    <div className="space-y-6">
      {/* Reassuring loading message */}
      <ContextLoader
        contextId="nav-dashboard"
        messages={[
          'Loading your workspace...',
          'Preparing your dashboard...',
          "Pulling today's schedule...",
        ]}
        size="sm"
        className="py-2 items-start"
      />

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 w-24 loading-bone loading-bone-dark" />
                <div className="h-8 w-16 loading-bone loading-bone-dark" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Card Skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 w-32 loading-bone loading-bone-dark" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-12 w-12 loading-bone loading-bone-dark" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 loading-bone loading-bone-dark" />
                  <div className="h-3 w-1/2 loading-bone loading-bone-dark" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
