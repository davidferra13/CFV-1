import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function LedgerLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Bone className="h-3 w-16 mb-1" />
        <ContextLoader contextId="nav-finance-ledger" size="sm" />
        <Bone className="h-4 w-72 mt-2" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Bone className="h-8 w-24" />
              <Bone className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-2">
              <Bone className="h-5 w-36" />
              <Bone className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
