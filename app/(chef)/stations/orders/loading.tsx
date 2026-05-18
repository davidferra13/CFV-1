import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function OrdersLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <ContextLoader contextId="nav-orders" size="sm" className="py-0 items-start" />
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Bone className="h-4 w-16" />
            <Bone className="h-4 w-4" />
            <Bone className="h-4 w-24" />
          </div>
          <Bone className="h-7 w-36 mt-1" />
          <Bone className="h-4 w-64 mt-1" />
        </div>
      </div>
      <div className="flex gap-1 border-b border-stone-700">
        <Bone className="h-8 w-24" />
        <Bone className="h-8 w-24" />
      </div>
      <Card>
        <CardContent className="p-0 divide-y divide-stone-800">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="flex-1 space-y-1">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-24" />
              </div>
              <Bone className="h-4 w-16" />
              <Bone className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
