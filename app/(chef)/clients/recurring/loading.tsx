import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function RecurringBoardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Bone className="h-4 w-24" />
          <ContextLoader contextId="nav-clients-recurring" size="sm" className="mt-1" />
          <Bone className="h-4 w-96 mt-1" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Bone className="h-4 w-36" />
            </CardHeader>
            <CardContent>
              <Bone className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Bone className="h-5 w-48" />
            <div className="flex gap-2 pt-2">
              {[1, 2, 3, 4].map((j) => (
                <Bone key={j} className="h-5 w-24 rounded-full" />
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="rounded-lg border border-stone-800 p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Bone className="h-4 w-32" />
                    <Bone className="h-3 w-24" />
                  </div>
                  <Bone className="h-5 w-28 rounded-full" />
                </div>
                <div className="grid gap-2 md:grid-cols-4">
                  {[1, 2, 3, 4].map((k) => (
                    <Bone key={k} className="h-3 w-28" />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
