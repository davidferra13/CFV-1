import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function GoalHistoryLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <ContextLoader contextId="nav-goal-history" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-4 w-28 mb-4" />
        <Bone className="h-8 w-48" />
        <Bone className="h-4 w-56 mt-1" />
      </div>
      <Card>
        <CardHeader>
          <Bone className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Bone className="h-48 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Bone className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Bone className="h-4 w-32" />
              <Bone className="h-4 w-20" />
              <Bone className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
