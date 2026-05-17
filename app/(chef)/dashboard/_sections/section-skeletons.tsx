// Dashboard section skeletons - shown while async sections stream in
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { WidgetCardSkeleton } from '@/components/dashboard/widget-cards/widget-card-shell'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

/** Priority banner + daily ops skeleton */
export function BannersSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-lg border border-stone-700 bg-stone-800 px-4 py-3">
        <Bone className="w-2.5 h-2.5 rounded-full shrink-0" />
        <Bone className="h-4 w-64" />
      </div>
    </div>
  )
}

/** Today's schedule + week strip skeleton */
export function ScheduleSkeleton() {
  return (
    <div className="col-span-1 md:col-span-2 space-y-4">
      <Card>
        <CardHeader>
          <Bone className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Bone className="h-4 w-3/4" />
          <Bone className="h-24 w-full" />
        </CardContent>
      </Card>
      {/* Week strip */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Bone key={i} className="h-16 flex-1 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

/** Queue + action items skeleton */
export function QueueSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Bone className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Bone className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-4 w-3/4" />
              <Bone className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/** Business snapshot + analytics skeleton */
export function BusinessSkeleton() {
  return (
    <div className="col-span-1 md:col-span-2 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Bone className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Bone className="h-8 w-20" />
              <Bone className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/** Activity section skeleton */
export function ActivitySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Bone className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-2">
                <Bone className="h-3 w-3 rounded-full shrink-0" />
                <Bone className="h-3 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/** Alerts section skeleton */
export function AlertsSkeleton() {
  return (
    <div className="col-span-1 md:col-span-2 space-y-3">
      <Bone className="h-12 w-full rounded-lg" />
    </div>
  )
}

export function HeroMetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="py-2">
          <div className="h-3 w-20 loading-bone loading-bone-muted rounded" />
          <div className="h-9 w-24 loading-bone loading-bone-muted rounded mt-2" />
        </div>
      ))}
    </div>
  )
}

export function ScheduleCardsSkeleton() {
  return (
    <>
      <WidgetCardSkeleton size="md" />
      <WidgetCardSkeleton size="md" />
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
    </>
  )
}

export function SaturationCardsSkeleton() {
  return (
    <>
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="md" />
    </>
  )
}

export function AlertCardsSkeleton() {
  return (
    <>
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
    </>
  )
}

export function BusinessCardsSkeleton() {
  return (
    <>
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
    </>
  )
}

export function IntelligenceCardsSkeleton() {
  return <WidgetCardSkeleton size="md" />
}

export function CommandCenterSkeleton() {
  return (
    <section>
      <div className="section-label mb-4">Core Areas</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
            <div className="flex items-start justify-between mb-2.5">
              <div className="w-8 h-8 rounded-lg loading-bone loading-bone-muted" />
            </div>
            <div className="h-4 w-20 loading-bone loading-bone-muted rounded mt-1" />
            <div className="h-3 w-28 loading-bone loading-bone-muted rounded mt-1.5" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function TouchpointsSkeleton() {
  return (
    <div className="col-span-1 sm:col-span-2">
      <WidgetCardSkeleton size="md" />
    </div>
  )
}

export function PriorityQueueSkeleton() {
  return <WidgetCardSkeleton size="md" />
}

export function ResolveNextSkeleton() {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-950/80 px-5 py-6 sm:px-6">
      <div className="h-5 w-28 loading-bone loading-bone-muted rounded" />
      <div className="mt-4 h-10 w-3/4 loading-bone loading-bone-muted rounded" />
      <div className="mt-3 h-4 w-full loading-bone loading-bone-muted rounded" />
      <div className="mt-2 h-4 w-2/3 loading-bone loading-bone-muted rounded" />
      <div className="mt-5 flex gap-2">
        <div className="h-8 w-28 loading-bone loading-bone-muted rounded-full" />
        <div className="h-8 w-36 loading-bone loading-bone-muted rounded-full" />
      </div>
    </div>
  )
}

export function PriorityActionsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-32 loading-bone loading-bone-muted rounded" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl loading-bone loading-bone-muted" />
        ))}
      </div>
    </div>
  )
}

export function IntelligenceSkeleton() {
  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <Bone className="h-5 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <Bone className="w-12 h-12 rounded-full" />
          <div className="flex-1 grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Bone key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
        <Bone className="h-14 w-full rounded-lg" />
        <Bone className="h-14 w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}
