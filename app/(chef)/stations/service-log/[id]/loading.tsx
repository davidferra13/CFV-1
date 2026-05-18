import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ServiceDayDetailLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <ContextLoader contextId="nav-service-day" size="sm" className="py-0 items-start" />
      <div className="flex items-start justify-between">
        <div>
          <Bone className="h-4 w-24" />
          <Bone className="h-7 w-52 mt-1" />
          <div className="flex items-center gap-3 mt-2">
            <Bone className="h-5 w-16 rounded-full" />
            <Bone className="h-4 w-16" />
          </div>
        </div>
        <div className="flex gap-2">
          <Bone className="h-8 w-24" />
          <Bone className="h-8 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Bone className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Bone className="h-4 w-full" />
              <Bone className="h-4 w-3/4" />
              <Bone className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
