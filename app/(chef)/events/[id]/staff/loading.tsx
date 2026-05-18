import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function StaffLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-event-staff" size="sm" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <Bone className="h-4 w-28" />
          <Bone className="h-8 w-40 mt-1" />
          <Bone className="h-4 w-56 mt-1" />
        </div>
        <Bone className="h-9 w-28 rounded-lg" />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-stone-800">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 space-y-2">
                  <Bone className="h-4 w-48" />
                  <Bone className="h-3 w-32" />
                </div>
                <Bone className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
