import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function NutritionMenuLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <ContextLoader contextId="nav-nutrition-menu" size="sm" />
          <Bone className="mt-2 h-4 w-64" />
        </div>
        <Bone className="h-9 w-28" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((stat) => (
          <Card key={stat}>
            <CardContent className="space-y-3 p-6">
              <Bone className="h-4 w-24" />
              <Bone className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Bone className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-48" />
                <Bone className="h-3 w-32" />
              </div>
              <Bone className="h-4 w-20" />
              <Bone className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
