import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ServiceLogLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <ContextLoader contextId="nav-service-log" size="sm" className="py-0 items-start" />
      <div className="flex items-start justify-between">
        <div>
          <Bone className="h-7 w-36" />
          <Bone className="h-4 w-56 mt-1" />
        </div>
        <Bone className="h-9 w-36" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Bone className="h-5 w-40" />
                  <div className="flex items-center gap-3">
                    <Bone className="h-5 w-16 rounded-full" />
                    <Bone className="h-4 w-16" />
                  </div>
                </div>
                <Bone className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
