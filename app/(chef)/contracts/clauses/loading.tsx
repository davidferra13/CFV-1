import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ContractsClausesLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <ContextLoader contextId="nav-contracts-clauses" size="sm" />
          <Bone className="mt-2 h-4 w-96 max-w-full" />
        </div>
        <Bone className="h-5 w-28" />
      </div>

      <Card>
        <CardHeader>
          <Bone className="h-5 w-40" />
          <Bone className="h-3 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((clause) => (
            <div key={clause} className="rounded-md border border-stone-800 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <Bone className="h-4 w-48" />
                  <Bone className="h-3 w-28" />
                </div>
                <Bone className="h-8 w-20" />
              </div>
              <Bone className="mt-4 h-16 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
