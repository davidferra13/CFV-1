import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function DemandLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-inventory-demand" size="sm" className="py-0 items-start" />
      <div>
        <Bone className="h-4 w-20" />
        <Bone className="h-8 w-52 mt-1" />
        <Bone className="h-4 w-72 mt-1" />
      </div>
      <Card>
        <CardContent className="p-0 divide-y divide-stone-800">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="flex-1 space-y-1">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-28" />
              </div>
              <Bone className="h-4 w-16" />
              <Bone className="h-4 w-16" />
              <Bone className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="rounded-lg border border-stone-700 bg-stone-900 p-5 space-y-3">
        <Bone className="h-5 w-36" />
        <Bone className="h-4 w-64" />
        <Bone className="h-9 w-40" />
      </div>
    </div>
  )
}
