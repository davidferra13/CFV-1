import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function IngredientsLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-culinary-ingredients" size="sm" />
      <div>
        <Bone className="h-4 w-20" />
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3">
            <Bone className="h-8 w-40" />
            <Bone className="h-5 w-8 rounded-full" />
          </div>
          <Bone className="h-9 w-28 rounded-lg" />
        </div>
        <Bone className="h-4 w-64 mt-1" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Bone className="h-7 w-16" />
              <Bone className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-4 px-6 py-3 border-b border-stone-800">
            <Bone className="h-3 w-28" />
            <Bone className="h-3 w-20" />
            <Bone className="h-3 w-20" />
            <Bone className="h-3 w-16" />
            <Bone className="h-3 w-20" />
          </div>
          <div className="divide-y divide-stone-800">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 space-y-2">
                  <Bone className="h-4 w-48" />
                  <Bone className="h-3 w-32" />
                </div>
                <Bone className="h-4 w-20" />
                <Bone className="h-6 w-20 rounded-full" />
                <Bone className="h-8 w-16 rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
