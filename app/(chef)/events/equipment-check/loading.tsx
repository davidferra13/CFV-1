import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function EquipmentCheckLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-events-equipment-check" size="sm" />
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Bone className="h-4 w-16" />
          <Bone className="h-8 w-56 mt-1" />
          <Bone className="h-4 w-80 mt-1" />
        </div>
        <Bone className="h-9 w-40 rounded-lg" />
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex gap-3">
            <Bone className="h-9 w-36 rounded-lg" />
            <Bone className="h-9 w-36 rounded-lg" />
            <Bone className="h-9 w-24 rounded-lg" />
          </div>
          <div className="divide-y divide-stone-800">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 py-4">
                <Bone className="h-4 w-40" />
                <Bone className="h-4 w-24" />
                <Bone className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
