// Events Travel Loading Skeleton

import { Card } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function EventsTravelLoading() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Bone className="h-4 w-16" />

      {/* Header */}
      <div className="space-y-2">
        <Bone className="h-7 w-48" />
        <Bone className="h-4 w-72" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 text-center space-y-2">
            <Bone className="h-7 w-10 mx-auto" />
            <Bone className="h-3 w-24 mx-auto" />
          </Card>
        ))}
      </div>

      {/* Week cards */}
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Bone className="h-4 w-40" />
            <Bone className="h-3 w-16" />
          </div>
          <div className="space-y-0 divide-y divide-stone-800">
            {[1, 2].map((j) => (
              <div key={j} className="flex items-start gap-3 py-3">
                <Bone className="h-10 w-10" />
                <div className="space-y-1.5 flex-1">
                  <Bone className="h-4 w-32" />
                  <Bone className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
