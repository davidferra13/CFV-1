import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function CannabisLedgerLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-events-cannabis-ledger" size="sm" />
      <div>
        <Bone className="h-4 w-20" />
        <Bone className="h-8 w-48 mt-1" />
        <Bone className="h-4 w-72 mt-1" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Bone className="h-7 w-16" />
              <Bone className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-stone-800">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Bone className="h-4 w-40" />
                <Bone className="h-4 w-24" />
                <Bone className="h-6 w-20 rounded-full" />
                <Bone className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
