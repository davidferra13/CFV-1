import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function KDSLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-event-kds" size="sm" />
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Bone className="h-4 w-28" />
          <Bone className="h-8 w-44 mt-1" />
          <Bone className="h-4 w-64 mt-1" />
        </div>
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-stone-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Bone className="h-5 w-32" />
                <Bone className="h-6 w-20 rounded-full" />
              </div>
              <Bone className="h-4 w-3/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
