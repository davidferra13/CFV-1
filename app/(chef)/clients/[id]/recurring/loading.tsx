import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ClientRecurringLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <ContextLoader contextId="nav-client-recurring" size="sm" />
          <Bone className="h-4 w-28" />
        </div>
        <Bone className="h-4 w-96 mt-1" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Bone className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Bone className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        <Bone className="h-5 w-40" />
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Bone className="h-4 w-36" />
                  <Bone className="h-3 w-48" />
                  <Bone className="h-3 w-24" />
                </div>
                <Bone className="h-5 w-14 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Bone className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-stone-800 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Bone className="h-4 w-32" />
                  <Bone className="h-3 w-24" />
                </div>
                <Bone className="h-5 w-14 rounded-full" />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="space-y-1">
                    <Bone className="h-3 w-28" />
                    <Bone className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
