import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function GoalSetupLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ContextLoader contextId="nav-goals-setup" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-4 w-28 mb-4" />
        <Bone className="h-8 w-36" />
        <Bone className="h-4 w-72 mt-1" />
      </div>
      <Card>
        <CardContent className="pt-6 space-y-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-3 w-24" />
              <Bone className="h-10 w-full" />
            </div>
          ))}
          <Bone className="h-10 w-32 mt-4" />
        </CardContent>
      </Card>
    </div>
  )
}
