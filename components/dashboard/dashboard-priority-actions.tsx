// Dashboard Priority Actions - Top 3 urgent items needing attention
// Red = needs action NOW, Amber = needs attention this week
// Uses highlight card variant with left border color coding

import Link from 'next/link'
import { ArrowRight, AlertTriangle, Clock } from '@/components/ui/icons'
import { Card } from '@/components/ui/card'
import type { PriorityQueue } from '@/lib/queue/types'

const URGENCY_STYLES = {
  critical: {
    border: 'border-l-red-500',
    icon: 'text-red-400',
    bg: 'bg-red-950/20',
    label: 'text-red-400',
    labelText: 'Urgent',
  },
  high: {
    border: 'border-l-amber-500',
    icon: 'text-amber-400',
    bg: 'bg-amber-950/20',
    label: 'text-amber-400',
    labelText: 'This week',
  },
  normal: {
    border: 'border-l-brand-500',
    icon: 'text-brand-400',
    bg: 'bg-brand-950/20',
    label: 'text-brand-400',
    labelText: 'Action needed',
  },
  low: {
    border: 'border-l-stone-600',
    icon: 'text-stone-400',
    bg: 'bg-stone-900/20',
    label: 'text-stone-400',
    labelText: 'When ready',
  },
} as const

export function DashboardPriorityActions({ queue }: { queue: PriorityQueue }) {
  // Show only items with critical or high urgency, max 3
  const urgentItems = queue.items
    .filter((item) => item.urgency === 'critical' || item.urgency === 'high')
    .slice(0, 3)

  if (urgentItems.length === 0) return null

  const totalUrgent = queue.items.filter(
    (item) => item.urgency === 'critical' || item.urgency === 'high'
  ).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="section-label mb-0 pb-0">Priority Actions</div>
        {totalUrgent > 3 && (
          <Link
            href="/queue"
            className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            View all {totalUrgent} items &rarr;
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {urgentItems.map((item) => {
          const styles = URGENCY_STYLES[item.urgency]
          const IconComponent = item.urgency === 'critical' ? AlertTriangle : Clock

          return (
            <Link key={item.id} href={item.href} className="group">
              <Card
                variant="highlight"
                interactive
                className={`border-l-[3px] ${styles.border} ${styles.bg} px-4 py-4`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <IconComponent className={`h-4 w-4 ${styles.icon}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${styles.label}`}
                      >
                        {styles.labelText}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-stone-100 leading-snug line-clamp-2">
                      {item.title}
                    </p>
                    <p className="text-xs text-stone-400 mt-1 truncate">
                      {item.context.primaryLabel}
                      {item.context.secondaryLabel ? ` \u00b7 ${item.context.secondaryLabel}` : ''}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-stone-600 group-hover:text-brand-400 transition-colors shrink-0 mt-1" />
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
