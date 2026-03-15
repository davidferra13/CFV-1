// Recipes Loading Skeleton — seasonal banner + searchable recipe grid
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function RecipesLoading() {
  return (
    <div className="space-y-6">
      {/* Context-aware message */}
      <ContextLoader contextId="nav-recipes" size="sm" className="py-0 items-start" />

      {/* Seasonal banner */}
      <Card className="bg-stone-800">
        <CardContent className="py-5 px-6 space-y-2">
          <Bone className="h-5 w-48" />
          <Bone className="h-3 w-full max-w-xl" />
          <Bone className="h-3 w-3/4 max-w-md" />
        </CardContent>
      </Card>

      {/* Filter + search bar */}
      <div className="flex gap-3 flex-wrap">
        <Bone className="h-9 flex-1 min-w-[200px]" />
        <Bone className="h-9 w-32" />
        <Bone className="h-9 w-28" />
        <Bone className="h-9 w-32" />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Bone key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>

      {/* Recipe table */}
      <Card>
        <CardHeader>
          <Bone className="h-5 w-32" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-stone-800">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 space-y-1.5">
                  <Bone className="h-4 w-48" />
                  <Bone className="h-3 w-28" />
                </div>
                <Bone className="h-5 w-16 rounded-full" />
                <Bone className="h-4 w-12" />
                <Bone className="h-4 w-16" />
                <Bone className="h-8 w-14" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
