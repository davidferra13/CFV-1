import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function RecipeNewLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ContextLoader contextId="nav-culinary-recipes-new" size="sm" />
      <div>
        <Bone className="h-8 w-40" />
        <Bone className="h-4 w-56 mt-1" />
      </div>
      <Card>
        <CardContent className="p-6 space-y-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-4 w-24" />
              <Bone className="h-10 w-full rounded-lg" />
            </div>
          ))}
          <Bone className="h-10 w-32 rounded-lg" />
        </CardContent>
      </Card>
    </div>
  )
}
