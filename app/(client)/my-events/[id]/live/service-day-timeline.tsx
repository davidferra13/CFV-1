'use client'

// Service Day Timeline - Vertical milestone tracker with auto-refresh
// Shows each milestone with icon, label, timestamp, and active pulse animation.

import { useEffect, useState, useTransition } from 'react'
import { CheckCircle, ShoppingCart, Clock, Truck, UtensilsCrossed } from '@/components/ui/icons'
import { getServiceDayMilestones } from '@/lib/events/service-day-live-actions'
import type { ServiceMilestone } from '@/lib/events/service-day-live-actions'
import { formatDistanceToNow } from 'date-fns'

const MILESTONE_ICONS: Record<ServiceMilestone['key'], typeof CheckCircle> = {
  confirmed: CheckCircle,
  shopping: ShoppingCart,
  prepping: Clock,
  en_route: Truck,
  serving: UtensilsCrossed,
}

function formatTime(timestamp: string | null): string {
  if (!timestamp) return ''
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
  } catch {
    return ''
  }
}

export function ServiceDayTimeline({
  milestones: initialMilestones,
  lastUpdatedAt,
}: {
  milestones: ServiceMilestone[]
  lastUpdatedAt: string | null
}) {
  const [milestones, setMilestones] = useState(initialMilestones)
  const [updatedAt, setUpdatedAt] = useState(lastUpdatedAt)
  const [isPending, startTransition] = useTransition()

  // Poll every 30 seconds for updates
  useEffect(() => {
    const eventId = window.location.pathname.split('/my-events/')[1]?.split('/')[0]
    if (!eventId) return

    const interval = setInterval(() => {
      startTransition(async () => {
        try {
          const fresh = await getServiceDayMilestones(eventId)
          if (fresh) {
            setMilestones(fresh)
            // Derive last updated from fresh milestones
            const timestamps = fresh.map((m) => m.reachedAt).filter(Boolean) as string[]
            if (timestamps.length > 0) {
              const sorted = timestamps.sort(
                (a, b) => new Date(b).getTime() - new Date(a).getTime()
              )
              setUpdatedAt(sorted[0])
            }
          }
        } catch {
          // Silent fail on poll; data stays stale
        }
      })
    }, 30_000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-4">
      {/* Last updated indicator */}
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <span
          className={`w-2 h-2 rounded-full ${isPending ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}
        />
        {updatedAt ? (
          <span>Last update {formatTime(updatedAt)}</span>
        ) : (
          <span>Waiting for updates</span>
        )}
        <span className="ml-auto text-stone-600">Auto-refreshes every 30s</span>
      </div>

      {/* Vertical timeline */}
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-stone-800" />

        <div className="space-y-6">
          {milestones.map((milestone) => {
            const Icon = MILESTONE_ICONS[milestone.key]
            const reached = Boolean(milestone.reachedAt)
            const active = milestone.isActive

            return (
              <div key={milestone.key} className="relative flex items-start gap-4">
                {/* Node */}
                <div
                  className={`
                    relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0
                    ${active ? 'border-brand-500 bg-brand-500/20' : reached ? 'border-brand-500 bg-brand-950' : 'border-stone-700 bg-stone-900'}
                  `}
                >
                  <Icon
                    className={`w-4 h-4 ${active ? 'text-brand-400' : reached ? 'text-brand-500' : 'text-stone-600'}`}
                  />
                  {active && (
                    <span className="absolute inset-0 rounded-full border-2 border-brand-400 animate-pulse opacity-60" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pt-0.5">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`font-medium ${active ? 'text-brand-400' : reached ? 'text-stone-100' : 'text-stone-500'}`}
                    >
                      {milestone.label}
                    </span>
                    {reached && milestone.reachedAt && (
                      <span className="text-xs text-stone-500">
                        {formatTime(milestone.reachedAt)}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm mt-0.5 ${active ? 'text-stone-300' : reached ? 'text-stone-400' : 'text-stone-600'}`}
                  >
                    {milestone.description}
                  </p>
                  {!reached && (
                    <span className="inline-block mt-1 text-xs text-stone-600 italic">Waiting</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
