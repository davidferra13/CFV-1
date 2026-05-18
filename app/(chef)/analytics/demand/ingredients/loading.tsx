import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function IngredientDemandLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-demand-ingredients" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-4 w-28" />
        <Bone className="h-8 w-52 mt-1" />
        <Bone className="h-4 w-72 mt-1" />
      </div>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Bone key={i} className="h-8 w-16" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <Bone className="h-5 w-32" />
              <Bone className="h-4 w-full" />
              <Bone className="h-4 w-2/3" />
              <div className="flex justify-between">
                <Bone className="h-4 w-20" />
                <Bone className="h-4 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
