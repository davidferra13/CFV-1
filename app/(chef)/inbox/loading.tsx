// Inbox Loading Skeleton - tabbed communication inbox
import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function InboxLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <ContextLoader contextId="nav-inbox" size="sm" className="py-0 items-start" />
        <Bone className="h-9 w-32" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-stone-700 pb-0">
        {[1, 2, 3, 4].map((i) => (
          <Bone key={i} className="h-9 w-28 rounded-t rounded-b-none" />
        ))}
      </div>

      {/* Inbox items */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Card key={i}>
            <CardContent className="py-4 px-5">
              <div className="flex items-start gap-4">
                <Bone className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <Bone className="h-4 w-44" />
                    <Bone className="h-3 w-20 shrink-0" />
                  </div>
                  <Bone className="h-3 w-full" />
                  <Bone className="h-3 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
