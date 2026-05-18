import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function BenchmarksLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-benchmarks" size="sm" className="py-0 items-start" />
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Bone className="h-4 w-20" />
          <Bone className="h-8 w-52 mt-1" />
          <Bone className="h-4 w-56 mt-1" />
        </div>
      </div>
      <div className="flex gap-2">
        <Bone className="h-8 w-36" />
        <Bone className="h-8 w-24" />
      </div>
      <Card>
        <CardHeader>
          <Bone className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Bone className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
