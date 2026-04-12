'use client'

// DailyPlanView - Main client component for the Daily Ops page.
// Renders Remy's summary, 4 swim lanes, and the celebration state.

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import Link from 'next/link'
import { RefreshCw } from '@/components/ui/icons'
import { PlanLane } from './plan-lane'
import { RemySummary } from './remy-summary'
import { CompletionCelebration } from './completion-celebration'
import type { DailyPlan } from '@/lib/daily-ops/types'

type Props = {
  plan: DailyPlan
}

export function DailyPlanView({ plan }: Props) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    router.refresh()
    // Reset after a brief delay (server revalidation takes a moment)
    setTimeout(() => setRefreshing(false), 1500)
  }, [router])

  const handleItemUpdate = useCallback(() => {
    // Soft refresh - revalidation happens via server action
    router.refresh()
  }, [router])

  const activeLanes = plan.lanes.filter((l) => l.items.some((i) => !i.dismissed))
  const allClear =
    activeLanes.every((l) => l.items.every((i) => i.completed || i.dismissed)) ||
    plan.stats.totalItems === 0

  return (
    <div className="space-y-6">
      {/* Remy summary */}
      <RemySummary
        summary={plan.remySummary}
        todayEventCount={plan.todayEvents.length}
        estimatedMinutes={plan.stats.estimatedMinutes}
      />

      {/* Today's event quick-links - one card per event */}
      {plan.todayEvents.map((event) => (
        <div
          key={event.id}
          className="rounded-lg border border-amber-800/40 bg-amber-950/30 px-4 py-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs text-amber-600 font-medium uppercase tracking-wide mb-0.5">
                Tonight
              </p>
              <p className="text-stone-100 font-semibold">
                {event.occasion || 'Event'} at {event.serveTime}
              </p>
              <p className="text-stone-400 text-sm">
                {event.clientName}
                {event.guestCount > 0 ? ` · ${event.guestCount} guests` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/events/${event.id}/pack`}
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium transition-colors"
              >
                Pack List
              </Link>
              <Link
                href={`/events/${event.id}/grocery-quote`}
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs font-medium transition-colors"
              >
                Grocery List
              </Link>
              <Link
                href={`/events/${event.id}`}
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs font-medium transition-colors"
              >
                Full Event
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Protected time reminder */}
      {plan.protectedTime.length > 0 && (
        <div className="rounded-lg border border-purple-200 bg-purple-950/50 px-4 py-3">
          <p className="text-sm text-purple-700">
            <span className="font-medium">Protected time today:</span>{' '}
            {plan.protectedTime.map((b) => b.title).join(', ')}
          </p>
        </div>
      )}

      {/* Swim lanes */}
      {allClear ? (
        <CompletionCelebration />
      ) : (
        <div className="space-y-4">
          {plan.lanes.map((lane) => (
            <PlanLane key={lane.lane} data={lane} onItemUpdate={handleItemUpdate} />
          ))}
        </div>
      )}

      {/* Refresh button */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-400 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh plan
        </button>
      </div>
    </div>
  )
}
