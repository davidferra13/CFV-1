import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function OpsLogLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <ContextLoader contextId="nav-ops-log" size="sm" className="py-0 items-start" />
      <Bone className="h-4 w-32" />
      <div>
        <Bone className="h-7 w-44" />
        <Bone className="h-4 w-72 mt-1" />
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bone className="h-5 w-32" />
            <Bone className="h-5 w-12 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-stone-800">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-3 px-6 py-3">
              <Bone className="h-3 w-16 shrink-0" />
              <Bone className="h-5 w-16 rounded-full shrink-0" />
              <Bone className="h-4 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
