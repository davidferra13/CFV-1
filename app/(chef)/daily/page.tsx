// Daily Ops - "Open App -> Approve -> Go Cook"
// The chef's structured daily plan. Pulls from all existing systems
// (queue, DOP, NBA, follow-ups, todos, recipe debt, calls) and organizes
// everything into 4 swim lanes: Quick Admin, Event Prep, Creative, Relationship.
// Protected by layout via requireChef().

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { format } from 'date-fns'
import { getDailyPlan } from '@/lib/daily-ops/actions'
import { DailyPlanView } from '@/components/daily-ops/daily-plan-view'
import { BriefingAlertsBanner } from '@/components/daily-ops/briefing-alerts-banner'

export const metadata: Metadata = { title: 'Daily Ops' }

export default async function DailyOpsPage() {
  let plan: Awaited<ReturnType<typeof getDailyPlan>> | null = null
  try {
    plan = await getDailyPlan()
  } catch {
    // getDailyPlan failure shows error state rather than crash
  }
  const todayFormatted = format(new Date(), 'EEEE, MMMM d')

  if (!plan) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display text-stone-100">Daily Ops</h1>
          <p className="text-sm text-stone-400 mt-0.5">{todayFormatted}</p>
        </div>
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 px-6 py-8 text-center">
          <p className="text-stone-400 font-medium mb-1">Could not load today&apos;s plan</p>
          <p className="text-stone-500 text-sm">Check your connection and refresh the page.</p>
        </div>
      </div>
    )
  }

  const { stats } = plan
  const remaining = stats.totalItems - stats.completedItems
  const pct = stats.totalItems > 0 ? Math.round((stats.completedItems / stats.totalItems) * 100) : 0

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-display text-stone-100">Daily Ops</h1>
          {stats.totalItems > 0 && (
            <span className="text-sm text-stone-400 tabular-nums shrink-0">
              {stats.completedItems}/{stats.totalItems} done
              {remaining > 0 && (
                <span className="text-stone-600"> · {stats.estimatedMinutes}m left</span>
              )}
            </span>
          )}
        </div>
        <p className="text-sm text-stone-400 mt-0.5">{todayFormatted}</p>
        {stats.totalItems > 0 && (
          // eslint-disable-next-line tailwindcss/no-arbitrary-value
          <div className="mt-2 h-1 w-full rounded-full bg-stone-800 overflow-hidden">
            {/* dynamic width requires inline style - no static Tailwind class exists */}
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-brand-600'}`}
              style={{ width: `${pct}%` }} // eslint-disable-line react/forbid-component-props
            />
          </div>
        )}
      </div>

      {/* Urgent alerts from morning briefing */}
      <Suspense fallback={null}>
        <BriefingAlertsBanner />
      </Suspense>

      {/* Plan */}
      <DailyPlanView plan={plan} />
    </div>
  )
}
