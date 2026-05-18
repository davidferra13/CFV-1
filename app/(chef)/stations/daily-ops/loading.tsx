import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function DailyOpsLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-daily-ops" size="sm" className="py-0 items-start" />
      <div className="flex items-start justify-between">
        <div>
          <Bone className="h-8 w-48" />
          <Bone className="h-4 w-64 mt-1" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-9 w-28" />
          <Bone className="h-9 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Bone className="h-5 w-32" />
                <Bone className="h-6 w-16 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center justify-between">
                  <Bone className="h-4 w-28" />
                  <Bone className="h-4 w-12" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Bone className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Bone className="h-6 w-16 rounded-full shrink-0" />
              <Bone className="h-4 w-full" />
              <Bone className="h-3 w-16 shrink-0" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
