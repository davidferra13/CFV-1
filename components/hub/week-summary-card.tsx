'use client'

import { useMemo } from 'react'
import type { MealBoardEntry } from '@/lib/hub/types'
import type { ScheduleChange } from '@/lib/hub/meal-board-actions'

interface WeekSummaryCardProps {
  weekEntries: MealBoardEntry[]
  scheduleChanges: ScheduleChange[]
  defaultHeadCount: number | null
  feedbackData: Record<
    string,
    { summary: { loved: number; liked: number; neutral: number; disliked: number; total: number } }
  >
}

export function WeekSummaryCard({
  weekEntries,
  scheduleChanges,
  defaultHeadCount,
  feedbackData,
}: WeekSummaryCardProps) {
  const stats = useMemo(() => {
    const planned = weekEntries.filter((e) => e.status !== 'cancelled')
    const breakfast = planned.filter((e) => e.meal_type === 'breakfast').length
    const lunch = planned.filter((e) => e.meal_type === 'lunch').length
    const dinner = planned.filter((e) => e.meal_type === 'dinner').length

    // Head count range
    const headCounts = planned
      .map((e) => e.head_count ?? defaultHeadCount)
      .filter((h): h is number => h !== null)
    const minHead = headCounts.length > 0 ? Math.min(...headCounts) : null
    const maxHead = headCounts.length > 0 ? Math.max(...headCounts) : null

    // Unresolved schedule changes
    const unresolvedChanges = scheduleChanges.filter((c) => !c.acknowledged_at).length

    // Feedback summary
    let totalLoved = 0
    let totalFeedback = 0
    for (const fb of Object.values(feedbackData)) {
      totalLoved += fb.summary.loved
      totalFeedback += fb.summary.total
    }

    return {
      totalMeals: planned.length,
      breakfast,
      lunch,
      dinner,
      minHead,
      maxHead,
      unresolvedChanges,
      totalFeedback,
      totalLoved,
    }
  }, [weekEntries, scheduleChanges, defaultHeadCount, feedbackData])

  if (stats.totalMeals === 0) return null

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {/* Total meals */}
        <span className="font-medium text-stone-200">{stats.totalMeals} meals</span>

        {/* Breakdown */}
        <span className="text-stone-500">
          {stats.breakfast > 0 && `${stats.breakfast}B`}
          {stats.breakfast > 0 && stats.lunch > 0 && ' / '}
          {stats.lunch > 0 && `${stats.lunch}L`}
          {(stats.breakfast > 0 || stats.lunch > 0) && stats.dinner > 0 && ' / '}
          {stats.dinner > 0 && `${stats.dinner}D`}
        </span>

        {/* Head count */}
        {stats.minHead !== null && (
          <span className="text-stone-400">
            👥{' '}
            {stats.minHead === stats.maxHead ? stats.minHead : `${stats.minHead}-${stats.maxHead}`}
          </span>
        )}

        {/* Schedule changes */}
        {stats.unresolvedChanges > 0 && (
          <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-amber-300">
            ⚠ {stats.unresolvedChanges} change{stats.unresolvedChanges > 1 ? 's' : ''}
          </span>
        )}

        {/* Feedback */}
        {stats.totalFeedback > 0 && (
          <span className="text-stone-500">
            {stats.totalLoved > 0 && `❤️ ${stats.totalLoved}`}
            {stats.totalLoved > 0 && stats.totalFeedback > stats.totalLoved && ' / '}
            {stats.totalFeedback} reactions
          </span>
        )}
      </div>
    </div>
  )
}
