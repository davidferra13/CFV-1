import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ReconciliationLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ContextLoader contextId="nav-commerce-reconciliation" size="sm" />
          <Bone className="h-5 w-10 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Bone className="h-9 w-28 rounded-lg" />
          <Bone className="h-9 w-36 rounded-lg" />
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="py-4 flex items-center justify-between">
              <div className="space-y-1">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-24" />
              </div>
              <Bone className="h-5 w-16 rounded-full" />
              <Bone className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
