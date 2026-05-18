import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ClientRiskLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-client-risk" size="sm" className="py-0 items-start" />
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Bone className="h-4 w-20" />
          <Bone className="h-8 w-48 mt-1" />
          <Bone className="h-4 w-80 mt-1" />
        </div>
        <Bone className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Bone className="h-3 w-20" />
              <Bone className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-0 divide-y divide-stone-800">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Bone className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-28" />
              </div>
              <Bone className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
