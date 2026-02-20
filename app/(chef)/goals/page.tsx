import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireChef } from '@/lib/auth/get-user'
import { getGoalsDashboard } from '@/lib/goals/actions'
import { GoalCard } from '@/components/goals/goal-card'
import { GoalsEmptyState } from '@/components/goals/goals-empty-state'

export const metadata: Metadata = { title: 'Goals - ChefFlow' }

export default async function GoalsPage() {
  await requireChef()
  const dashboard = await getGoalsDashboard()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Goals</h1>
          <p className="text-stone-600 mt-1">
            Track your targets. Get specific recommendations to close the gap.
          </p>
        </div>
        <Link
          href="/goals/setup"
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          Add Goal
        </Link>
      </div>

      {dashboard.activeGoals.length === 0 ? (
        <GoalsEmptyState />
      ) : (
        <div className="space-y-4">
          {dashboard.activeGoals.map((view) => (
            <GoalCard key={view.goal.id} view={view} />
          ))}
        </div>
      )}

      <p className="text-xs text-stone-400 text-right">
        Updated {new Date(dashboard.computedAt).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })}
      </p>
    </div>
  )
}
