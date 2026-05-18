import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function DevSimulateLoading() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <ContextLoader contextId="nav-dev-simulate" size="sm" />
        <Bone className="mt-2 h-4 w-96 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((stat) => (
          <Card key={stat}>
            <CardContent className="space-y-2 pt-4">
              <Bone className="h-7 w-16" />
              <Bone className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Bone className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Bone className="mb-2 h-4 w-36" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((module) => (
                <Bone key={module} className="h-7 w-28 rounded-full" />
              ))}
            </div>
          </div>
          <div>
            <Bone className="mb-2 h-4 w-44" />
            <Bone className="h-2 w-full max-w-xs rounded-full" />
          </div>
          <Bone className="h-14 w-full rounded-lg" />
          <Bone className="h-9 w-32" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Bone className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((run) => (
            <div
              key={run}
              className="flex items-center justify-between rounded-md border border-stone-800 p-3"
            >
              <div className="space-y-2">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-28" />
              </div>
              <Bone className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
