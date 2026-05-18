import { Card } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function InsightsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Bone className="h-4 w-16" />
        <ContextLoader contextId="nav-clients-insights" size="sm" className="mt-1" />
        <Bone className="h-4 w-80 mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 space-y-1">
            <Bone className="h-3 w-32" />
            <Bone className="h-6 w-20" />
            <Bone className="h-3 w-24" />
          </Card>
        ))}
        <Card className="col-span-2 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Bone className="h-3 w-32" />
              <Bone className="h-7 w-12" />
              <Bone className="h-3 w-48" />
            </div>
            <Bone className="h-4 w-32" />
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Card key={i} className="p-5">
            <Bone className="h-8 w-8 mb-2" />
            <Bone className="h-5 w-28" />
            <Bone className="h-3 w-full mt-1" />
          </Card>
        ))}
      </div>
    </div>
  )
}
