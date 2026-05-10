'use client'

// Daily Time Buckets - alternative view of DailyPlan data grouped by temporal urgency.
// "Do Now" = priority 1 or event today
// "Do Today" = priority 2 or timeEstimate < 15min
// "Do This Week" = everything else

import { Zap, Clock, Calendar } from '@/components/ui/icons'
import { PlanItem as PlanItemCard } from './plan-item'
import type { DailyPlan, PlanItem } from '@/lib/daily-ops/types'

type Props = {
  plan: DailyPlan
  onItemUpdate: () => void
}

type Bucket = {
  id: string
  label: string
  icon: React.ReactNode
  items: PlanItem[]
  color: string
}

function bucketize(plan: DailyPlan): Bucket[] {
  const today = new Date().toISOString().split('T')[0]
  const allItems = plan.lanes.flatMap((lane) => lane.items).filter((i) => !i.dismissed)

  const doNow: PlanItem[] = []
  const doToday: PlanItem[] = []
  const doThisWeek: PlanItem[] = []

  for (const item of allItems) {
    const eventIsToday = item.eventContext?.eventDate?.startsWith(today)
    if (item.priority === 1 || eventIsToday) {
      doNow.push(item)
    } else if (item.priority === 2 || item.timeEstimateMinutes < 15) {
      doToday.push(item)
    } else {
      doThisWeek.push(item)
    }
  }

  return [
    {
      id: 'now',
      label: 'Do Now',
      icon: <Zap className="h-4 w-4 text-red-400" />,
      items: doNow,
      color: 'border-red-800/40 bg-red-950/20',
    },
    {
      id: 'today',
      label: 'Do Today',
      icon: <Clock className="h-4 w-4 text-amber-400" />,
      items: doToday,
      color: 'border-amber-800/40 bg-amber-950/20',
    },
    {
      id: 'week',
      label: 'Do This Week',
      icon: <Calendar className="h-4 w-4 text-stone-400" />,
      items: doThisWeek,
      color: 'border-stone-700 bg-stone-800/30',
    },
  ]
}

export function DailyTimeBuckets({ plan, onItemUpdate }: Props) {
  const buckets = bucketize(plan)

  return (
    <div className="space-y-4">
      {buckets.map((bucket) => {
        if (bucket.items.length === 0) return null
        const completedCount = bucket.items.filter((i) => i.completed).length
        return (
          <div key={bucket.id} className={`rounded-lg border p-4 ${bucket.color}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {bucket.icon}
                <h3 className="text-sm font-semibold text-stone-200">{bucket.label}</h3>
                <span className="text-xs text-stone-500">
                  {bucket.items.length} item{bucket.items.length !== 1 ? 's' : ''}
                </span>
              </div>
              {completedCount > 0 && (
                <span className="text-xs text-stone-500">
                  {completedCount}/{bucket.items.length} done
                </span>
              )}
            </div>
            <div className="space-y-2">
              {bucket.items.map((item) => (
                <PlanItemCard key={item.id} item={item} onUpdate={onItemUpdate} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
