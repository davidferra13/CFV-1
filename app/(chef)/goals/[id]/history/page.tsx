import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireChef } from '@/lib/auth/get-user'
import { getGoalHistory, getGoalById } from '@/lib/goals/actions'
import { formatGoalValue, isRevenueGoal, formatPeriod } from '@/lib/goals/engine'
import { GoalHistorySparkline } from '@/components/goals/goal-history-sparkline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Goal History - ChefFlow' }

function formatMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number)
  const date = new Date(y, (m || 1) - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default async function GoalHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireChef()
  const { id: goalId } = await params

  // getGoalById works for any status — archived/paused goals can still have history viewed
  const goal = await getGoalById(goalId)

  if (!goal) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/goals"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Goals
        </Link>
        <p className="text-stone-400">Goal not found.</p>
      </div>
    )
  }

  const snapshots = await getGoalHistory(goalId, 12)
  const revenue = isRevenueGoal(goal.goalType)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/goals"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Goals
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">{goal.label}</h1>
        <p className="text-stone-500 text-sm mt-1">
          {formatPeriod(goal.periodStart, goal.periodEnd)} · Target:{' '}
          {formatGoalValue(goal.targetValue, goal.goalType)}
        </p>
      </div>

      {/* Sparkline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress over time</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <p className="text-sm text-stone-400 italic">
              No snapshots yet. History is recorded automatically by the daily cron job.
            </p>
          ) : (
            <GoalHistorySparkline snapshots={[...snapshots].reverse()} />
          )}
        </CardContent>
      </Card>

      {/* History table */}
      {snapshots.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto pt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 text-left">
                  <th className="pb-2 pr-4 font-medium text-stone-400">Month</th>
                  <th className="pb-2 pr-4 font-medium text-stone-400">Progress</th>
                  <th className="pb-2 pr-4 font-medium text-stone-400">Current</th>
                  <th className="pb-2 pr-4 font-medium text-stone-400">Target</th>
                  <th className="pb-2 pr-4 font-medium text-stone-400">Gap</th>
                  {revenue && <th className="pb-2 font-medium text-stone-400">Events needed</th>}
                </tr>
              </thead>
              <tbody>
                {snapshots.map((snap) => {
                  const onTrack = snap.progressPercent >= 100
                  return (
                    <tr key={snap.id} className="border-b border-stone-800">
                      <td className="py-2 pr-4 text-stone-300">
                        {formatMonth(snap.snapshotMonth)}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`font-medium ${onTrack ? 'text-emerald-600' : 'text-amber-600'}`}
                        >
                          {snap.progressPercent}%
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-stone-300">
                        {formatGoalValue(snap.currentValue, goal.goalType)}
                      </td>
                      <td className="py-2 pr-4 text-stone-300">
                        {formatGoalValue(snap.targetValue, goal.goalType)}
                      </td>
                      <td
                        className={`py-2 pr-4 ${snap.gapValue > 0 ? 'text-amber-600' : 'text-emerald-600'}`}
                      >
                        {snap.gapValue > 0 ? formatGoalValue(snap.gapValue, goal.goalType) : '✓'}
                      </td>
                      {revenue && (
                        <td className="py-2 text-stone-300">{snap.eventsNeeded ?? '—'}</td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
