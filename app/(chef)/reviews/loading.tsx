// Reviews Loading Skeleton - header + stacked review cards
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function ReviewsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <ContextLoader contextId="nav-reviews" size="sm" className="py-0 items-start" />
        <Bone className="h-4 w-64 mt-2" />
      </div>

      {/* Star summary */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-6">
            <div className="text-center space-y-1">
              <Bone className="h-10 w-16 mx-auto" />
              <Bone className="h-3 w-20 mx-auto" />
            </div>
            <div className="flex-1 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Bone className="h-3 w-8" />
                  <Bone className="h-2 flex-1" />
                  <Bone className="h-3 w-6" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review cards */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-5 pb-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Bone className="h-4 w-36" />
                  <Bone className="h-3 w-24" />
                </div>
                <Bone className="h-4 w-20" />
              </div>
              <Bone className="h-3 w-full" />
              <Bone className="h-3 w-5/6" />
              <Bone className="h-3 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
