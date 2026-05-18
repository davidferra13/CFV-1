import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function NewServiceDayLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <ContextLoader contextId="nav-service-log-new" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-7 w-48" />
        <Bone className="h-4 w-64 mt-1" />
      </div>
      <Card>
        <CardContent className="py-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <Bone className="h-3 w-24" />
              <Bone className="h-10 w-full" />
            </div>
          ))}
          <Bone className="h-10 w-36 mt-2" />
        </CardContent>
      </Card>
    </div>
  )
}
