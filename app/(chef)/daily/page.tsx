// Daily Ops — "Open App -> Approve -> Go Cook"
// The chef's structured daily plan. Pulls from all existing systems
// (queue, DOP, NBA, follow-ups, todos, recipe debt, calls) and organizes
// everything into 4 swim lanes: Quick Admin, Event Prep, Creative, Relationship.
// Protected by layout via requireChef().

import type { Metadata } from 'next'
import { format } from 'date-fns'
import { getDailyPlan } from '@/lib/daily-ops/actions'
import { DailyPlanView } from '@/components/daily-ops/daily-plan-view'

export const metadata: Metadata = { title: 'Daily Ops - ChefFlow' }

export default async function DailyOpsPage() {
  const plan = await getDailyPlan()
  const todayFormatted = format(new Date(), 'EEEE, MMMM d')

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display text-stone-100">Daily Ops</h1>
        <p className="text-sm text-stone-400 mt-0.5">{todayFormatted}</p>
      </div>

      {/* Plan */}
      <DailyPlanView plan={plan} />
    </div>
  )
}
