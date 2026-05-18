import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function SafetyIncidentDetailLoading() {
  return (
    <div className="space-y-6">
      <div>
        <ContextLoader contextId="nav-safety-incidents-detail" size="sm" />
        <Bone className="mt-2 h-4 w-72" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((card) => (
          <Card key={card}>
            <CardContent className="space-y-3 p-5">
              <Bone className="h-4 w-24" />
              <Bone className="h-7 w-32" />
              <Bone className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Bone className="h-6 w-44" />
          <Bone className="h-3 w-80 max-w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((section) => (
            <div key={section} className="space-y-2">
              <Bone className="h-4 w-32" />
              <Bone className="h-16 w-full rounded-md" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
