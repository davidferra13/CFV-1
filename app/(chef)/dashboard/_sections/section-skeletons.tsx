// Dashboard section skeletons — shown while async sections stream in
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Bone({ className }: { className: string }) {
  return <div className={`bg-stone-700 rounded animate-pulse ${className}`} />
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
    <div className="space-y-4">
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
    <div className="space-y-4">
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
    <div className="space-y-3">
      <Bone className="h-12 w-full rounded-lg" />
    </div>
  )
}

export function IntelligenceSkeleton() {
  return (
    <Card>
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
