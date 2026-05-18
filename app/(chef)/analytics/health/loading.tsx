import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function HealthLoading() {
  return (
    <div className="space-y-8">
      <ContextLoader contextId="nav-health" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-4 w-20" />
        <Bone className="h-6 w-52 mt-3" />
        <Bone className="h-4 w-64 mt-1" />
      </div>
      <div className="flex items-center justify-center py-6">
        <Bone className="h-40 w-40 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Bone className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Bone className="h-4 w-full" />
              <Bone className="h-2 w-full rounded-full" />
              <Bone className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Bone className="h-5 w-28" />
        </CardHeader>
        <CardContent>
          <Bone className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
