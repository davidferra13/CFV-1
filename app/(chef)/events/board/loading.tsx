import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function EventBoardLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-events-board" size="sm" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-2">
          <Bone className="h-8 w-48" />
          <Bone className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-9 w-24 rounded-lg" />
          <Bone className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <div className="flex gap-2">
        <Bone className="h-8 w-20 rounded-lg" />
        <Bone className="h-8 w-20 rounded-lg" />
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3">
                <Bone className="h-5 w-24" />
                {[1, 2, 3].map((j) => (
                  <div key={j} className="rounded-lg border border-stone-800 p-3 space-y-2">
                    <Bone className="h-4 w-32" />
                    <Bone className="h-3 w-20" />
                    <Bone className="h-3 w-24" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
