import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function RecipeDetailLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-culinary-recipe-detail" size="sm" />
      <Bone className="h-48 w-full rounded-xl" />
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-2">
          <Bone className="h-7 w-56" />
          <div className="flex gap-2">
            <Bone className="h-5 w-16 rounded-full" />
            <Bone className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Bone className="h-8 w-24 rounded-lg" />
          <Bone className="h-8 w-20 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5 space-y-4">
            <Bone className="h-5 w-20" />
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-3/4" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between">
                <Bone className="h-4 w-24" />
                <Bone className="h-4 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-4">
            <Bone className="h-5 w-28" />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <Bone className="h-4 w-40" />
                <Bone className="h-4 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
