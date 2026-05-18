import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function FoodCostLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-food-cost" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-4 w-20" />
        <Bone className="h-8 w-52 mt-1" />
        <Bone className="h-4 w-72 mt-1" />
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
        <CardContent className="p-0 divide-y divide-stone-800">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between px-6 py-4">
              <Bone className="h-4 w-40" />
              <Bone className="h-4 w-20" />
              <Bone className="h-4 w-20" />
              <Bone className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
