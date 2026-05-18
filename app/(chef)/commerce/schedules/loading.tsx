import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function SchedulesLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ContextLoader contextId="nav-commerce-schedules" size="sm" />
          <Bone className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <Bone className="h-4 w-80" />
      <Card>
        <CardHeader>
          <Bone className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-stone-800 last:border-0"
            >
              <div className="space-y-1">
                <Bone className="h-4 w-36" />
                <Bone className="h-3 w-24" />
              </div>
              <Bone className="h-5 w-16 rounded-full" />
              <Bone className="h-4 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
