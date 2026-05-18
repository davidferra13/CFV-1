import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function SplitBillingLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ContextLoader contextId="nav-event-split-billing" size="sm" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Bone className="h-4 w-28" />
          <Bone className="h-8 w-36 mt-2" />
          <Bone className="h-4 w-64 mt-1" />
        </div>
        <Bone className="h-9 w-40 rounded-lg" />
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Bone className="h-3 w-20" />
                <Bone className="h-7 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Bone className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center justify-between">
                <Bone className="h-4 w-48" />
                <Bone className="h-4 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
