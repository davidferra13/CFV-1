import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function DishDetailLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-culinary-dish-detail" size="sm" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Bone className="h-4 w-24" />
          <Bone className="h-8 w-56" />
          <div className="flex gap-2">
            <Bone className="h-5 w-16 rounded-full" />
            <Bone className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <Bone className="h-9 w-24 rounded-lg" />
      </div>
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Bone className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center justify-between">
                <Bone className="h-4 w-48" />
                <Bone className="h-4 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
