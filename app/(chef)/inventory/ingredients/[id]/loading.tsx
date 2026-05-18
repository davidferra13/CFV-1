import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function IngredientDetailLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-ingredient-detail" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-4 w-20" />
        <div className="flex items-start gap-4 mt-2">
          <Bone className="h-24 w-24 rounded-lg shrink-0" />
          <div className="space-y-2">
            <Bone className="h-8 w-48" />
            <Bone className="h-4 w-32" />
            <Bone className="h-4 w-24" />
          </div>
        </div>
      </div>
      <Card>
        <CardHeader>
          <Bone className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          <Bone className="h-64 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Bone className="h-6 w-44" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Bone className="h-4 w-32" />
              <Bone className="h-4 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
