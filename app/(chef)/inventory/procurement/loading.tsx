import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ProcurementLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-procurement" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-4 w-20" />
        <Bone className="h-8 w-48 mt-1" />
        <Bone className="h-4 w-72 mt-1" />
      </div>
      <Card>
        <CardHeader>
          <Bone className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Bone className="h-10 w-10 rounded shrink-0" />
              <div className="flex-1 space-y-1">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-28" />
              </div>
              <Bone className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Bone className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Bone className="h-4 w-36" />
              <Bone className="h-4 w-20" />
              <Bone className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
