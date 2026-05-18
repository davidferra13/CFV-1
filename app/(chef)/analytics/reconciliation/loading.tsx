import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ReconciliationLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-reconciliation" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-4 w-20" />
        <Bone className="h-8 w-56 mt-1" />
        <Bone className="h-4 w-72 mt-1" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex items-center justify-center rounded-xl border border-stone-700/40 bg-stone-900 p-6">
          <Bone className="h-32 w-32 rounded-full" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-3">
            <Bone className="h-5 w-36" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Bone className="h-4 w-32" />
                <Bone className="h-4 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Bone className="h-5 w-32" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <Bone className="h-5 w-40" />
              <Bone className="h-4 w-full" />
              <Bone className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
