// Calendar Loading Skeleton — monthly grid with event chips
import { Card, CardContent } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
}

export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <ContextLoader contextId="nav-calendar" size="sm" className="py-0 items-start" />
        <div className="flex gap-2">
          <Bone className="h-9 w-9" />
          <Bone className="h-9 w-9" />
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center">
            <Bone className="h-4 w-8 mx-auto" />
          </div>
        ))}
      </div>

      {/* Calendar grid — 5 rows × 7 cols */}
      <Card>
        <CardContent className="p-2">
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="min-h-[72px] rounded border border-stone-800 p-1.5 space-y-1">
                <Bone className="h-5 w-5 rounded-full" />
                {/* Occasional event chips */}
                {[3, 7, 12, 16, 22, 28].includes(i) && <Bone className="h-4 w-full rounded" />}
                {[7, 22].includes(i) && <Bone className="h-4 w-3/4 rounded" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
