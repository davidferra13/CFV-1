// Activity Loading Skeleton — resume section + filtered activity feed
import { ContextLoader } from '@/components/ui/context-loader'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function ActivityLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-dashboard" size="sm" className="py-0 items-start" />

      {/* Resume / pick up where you left off */}
      <Card>
        <CardHeader>
          <Bone className="h-5 w-52" />
        </CardHeader>
        <CardContent className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-stone-800 rounded-lg p-3 space-y-2 min-w-[180px]">
              <Bone className="h-3 w-16 rounded-full" />
              <Bone className="h-4 w-36" />
              <Bone className="h-3 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4, 5].map((i) => (
          <Bone key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Activity feed */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Card key={i}>
            <CardContent className="py-3 px-5">
              <div className="flex items-start gap-3">
                <Bone className="h-8 w-8 rounded-full shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-4">
                    <Bone className="h-3 w-60" />
                    <Bone className="h-3 w-16 shrink-0" />
                  </div>
                  <Bone className="h-3 w-40" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
