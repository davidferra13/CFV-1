'use client'

// Daily Command Shell - Client wrapper that manages view toggle state
// and renders header, plan view (by type or by time), and end-of-day summary.

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DailyCommandHeader } from './daily-command-header'
import { DailyPlanView } from './daily-plan-view'
import { DailyTimeBuckets } from './daily-time-buckets'
import { EndOfDaySummary } from './end-of-day-summary'
import type { DailyPlan } from '@/lib/daily-ops/types'

type ViewMode = 'type' | 'time'

type Props = {
  plan: DailyPlan
  unreadMessages: number
}

export function DailyCommandShell({ plan, unreadMessages }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('type')
  const router = useRouter()

  const handleItemUpdate = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <div className="flex flex-col gap-6">
      {/* Command Header with greeting, stats, toggle */}
      <DailyCommandHeader
        totalItems={plan.stats.totalItems}
        estimatedMinutes={plan.stats.estimatedMinutes}
        unreadMessages={unreadMessages}
        viewMode={viewMode}
        onToggleView={setViewMode}
      />

      {/* Plan content: either lane-based or time-bucketed */}
      {viewMode === 'type' ? (
        <DailyPlanView plan={plan} />
      ) : (
        <DailyTimeBuckets plan={plan} onItemUpdate={handleItemUpdate} />
      )}

      {/* End of day summary (auto-shows after 4pm or when all done) */}
      <EndOfDaySummary plan={plan} />
    </div>
  )
}
