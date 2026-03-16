'use client'

// DailyPlanView - Main client component for the Daily Ops page.
// Renders Remy's summary, 4 swim lanes, and the celebration state.

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
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
