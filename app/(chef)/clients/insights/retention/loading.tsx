import { Card } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function RetentionLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Bone className="h-4 w-28" />
        <ContextLoader contextId="nav-clients-insights-retention" size="sm" className="mt-1" />
        <Bone className="h-4 w-72 mt-1" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 text-center space-y-1">
            <Bone className="h-8 w-12 mx-auto" />
            <Bone className="h-3 w-24 mx-auto" />
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <Bone className="h-5 w-28 mb-3" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-start justify-between py-2 border-b border-stone-800 last:border-0"
            >
              <div className="space-y-1">
                <Bone className="h-4 w-32" />
                <Bone className="h-3 w-24" />
              </div>
              <Bone className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-4">
        <Bone className="h-5 w-28 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
            >
              <Bone className="h-4 w-32" />
              <Bone className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
