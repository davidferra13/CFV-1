import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function ShiftHistoryLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <ContextLoader contextId="nav-shift-history" size="sm" className="py-0 items-start" />
      <div>
        <div className="flex items-center gap-2">
          <Bone className="h-4 w-16" />
          <Bone className="h-4 w-4" />
          <Bone className="h-4 w-28" />
        </div>
        <Bone className="h-8 w-48 mt-1" />
      </div>
      <Card>
        <CardContent className="p-0 divide-y divide-stone-800">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Bone className="h-6 w-16 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-28" />
              </div>
              <Bone className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
