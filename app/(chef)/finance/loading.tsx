// Finance Loading Skeleton — shown instantly when navigating to /finance
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

export default function FinanceLoading() {
  return (
    <div className="space-y-6">
      {/* Context-aware header */}
      <ContextLoader contextId="nav-finance" size="sm" className="py-0 items-start" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 w-28 bg-stone-700 rounded animate-pulse" />
                <div className="h-8 w-24 bg-stone-700 rounded animate-pulse" />
                <div className="h-3 w-16 bg-stone-700 rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 w-40 bg-stone-700 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-24 bg-stone-700 rounded animate-pulse" />
                  <div className="h-4 w-40 bg-stone-700 rounded animate-pulse" />
                </div>
                <div className="h-4 w-20 bg-stone-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
