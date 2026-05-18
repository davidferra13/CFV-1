import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function CountsLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ContextLoader contextId="nav-inventory-counts" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-4 w-20" />
        <div className="flex items-center justify-between mt-1">
          <Bone className="h-8 w-48" />
          <Bone className="h-9 w-28" />
        </div>
        <Bone className="h-4 w-72 mt-1" />
      </div>
      <Card>
        <CardContent className="p-0 divide-y divide-stone-800">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-3">
              <div className="flex-1 space-y-1">
                <Bone className="h-4 w-36" />
              </div>
              <Bone className="h-8 w-20" />
              <Bone className="h-4 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
