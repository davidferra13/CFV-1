import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function GroceryRunLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-event-grocery-run" size="sm" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <Bone className="h-4 w-28" />
          <Bone className="h-8 w-40 mt-1" />
          <Bone className="h-4 w-56 mt-1" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-9 w-24 rounded-lg" />
          <Bone className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      <Card>
        <CardContent className="p-4 space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Bone className="h-5 w-5 rounded" />
              <Bone className="h-4 w-48" />
              <Bone className="h-3 w-16 ml-auto" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
