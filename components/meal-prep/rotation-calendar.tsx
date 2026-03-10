'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRight, Calendar } from '@/components/ui/icons'
import type { MealPrepWeek } from '@/lib/meal-prep/program-actions'
import { advanceRotation } from '@/lib/meal-prep/program-actions'
import type { DayPlan } from '@/lib/meal-prep/meal-plan-actions'

// ============================================
// Constants
// ============================================

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ============================================
// Types
// ============================================

interface RotationCalendarProps {
  programId: string
  weeks: MealPrepWeek[]
  currentRotationWeek: number
  totalRotationWeeks: number
}

// ============================================
// Helpers
// ============================================

function getWeekStatus(
  week: MealPrepWeek,
  isCurrent: boolean
): { label: string; variant: 'success' | 'warning' | 'info' | 'default' } {
  if (isCurrent) return { label: 'Current', variant: 'info' }
  if (week.delivered_at) return { label: 'Delivered', variant: 'success' }

  // Check if any meals are planned in custom_dishes
  const dishes = week.custom_dishes
  const hasPlan =
    week.menu_id ||
    (Array.isArray(dishes) &&
      dishes.some((d: any) => Array.isArray(d?.meals) && d.meals.length > 0))

  if (hasPlan) return { label: 'Planned', variant: 'warning' }
  return { label: 'Unplanned', variant: 'default' }
}

function getMealCountsForWeek(week: MealPrepWeek): number[] {
  // Returns array of 7 meal counts (Mon-Sun)
  const counts = new Array(7).fill(0)
  const dishes = week.custom_dishes

  if (Array.isArray(dishes)) {
    for (const day of dishes) {
      if (typeof day?.dayIndex === 'number' && Array.isArray(day?.meals)) {
        if (day.dayIndex >= 0 && day.dayIndex < 7) {
          counts[day.dayIndex] = day.meals.length
        }
      }
    }
  }

  return counts
}

function getTotalMeals(week: MealPrepWeek): number {
  return getMealCountsForWeek(week).reduce((sum, c) => sum + c, 0)
}

function getDishPreview(week: MealPrepWeek, dayIndex: number): string[] {
  const dishes = week.custom_dishes
  if (!Array.isArray(dishes)) return []

  const day = dishes.find((d: any) => d?.dayIndex === dayIndex)
  if (!day || !Array.isArray(day.meals)) return []

  return day.meals.slice(0, 2).map((m: any) => m.name ?? 'Unnamed')
}

// ============================================
// Component
// ============================================

export function RotationCalendar({
  programId,
  weeks,
  currentRotationWeek,
  totalRotationWeeks,
}: RotationCalendarProps) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleAdvance() {
    startTransition(async () => {
      try {
        await advanceRotation(programId)
        router.refresh()
      } catch {
        // Revalidation handles refresh
      }
    })
  }

  function handleEditWeek(rotationWeek: number) {
    router.push(`/meal-prep/${programId}/plan?week=${rotationWeek}`)
  }

  // Build week data (some weeks may not have DB rows yet)
  const weekData = Array.from({ length: totalRotationWeeks }, (_, i) => {
    const weekNum = i + 1
    return weeks.find((w) => w.rotation_week === weekNum) ?? null
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-stone-800 rounded-lg">
            <Calendar className="w-5 h-5 text-stone-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-200">Menu Rotation Calendar</h2>
            <p className="text-sm text-stone-500">
              {totalRotationWeeks}-week rotation, currently on Week {currentRotationWeek}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" disabled={pending} onClick={handleAdvance}>
          <ChevronRight className="w-4 h-4" />
          Advance Rotation
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs text-stone-500 font-medium px-3 py-2 w-28">Week</th>
              {DAY_SHORT.map((day) => (
                <th key={day} className="text-center text-xs text-stone-500 font-medium px-2 py-2">
                  {day}
                </th>
              ))}
              <th className="text-center text-xs text-stone-500 font-medium px-2 py-2 w-20">
                Total
              </th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {weekData.map((week, i) => {
              const weekNum = i + 1
              const isCurrent = weekNum === currentRotationWeek
              const mealCounts = week ? getMealCountsForWeek(week) : new Array(7).fill(0)
              const total = mealCounts.reduce((s: number, c: number) => s + c, 0)
              const status = week
                ? getWeekStatus(week, isCurrent)
                : { label: 'Unplanned', variant: 'default' as const }

              return (
                <tr
                  key={weekNum}
                  onClick={() => handleEditWeek(weekNum)}
                  className={`border-t border-stone-800/60 cursor-pointer transition-colors hover:bg-stone-800/40 ${
                    isCurrent ? 'bg-stone-800/30 ring-1 ring-inset ring-amber-700/30' : ''
                  }`}
                >
                  {/* Week label */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-200">Week {weekNum}</span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  </td>

                  {/* Day cells */}
                  {mealCounts.map((count: number, dayIdx: number) => {
                    const previews = week ? getDishPreview(week, dayIdx) : []
                    return (
                      <td key={dayIdx} className="px-1 py-3 text-center">
                        {count > 0 ? (
                          <div className="space-y-0.5" title={previews.join(', ')}>
                            <div className="mx-auto w-7 h-7 rounded-lg bg-amber-900/40 border border-amber-800/40 flex items-center justify-center">
                              <span className="text-xs font-medium text-amber-300">{count}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="mx-auto w-7 h-7 rounded-lg bg-stone-800/40 border border-stone-700/30 flex items-center justify-center">
                            <span className="text-xs text-stone-600">-</span>
                          </div>
                        )}
                      </td>
                    )
                  })}

                  {/* Total */}
                  <td className="px-2 py-3 text-center">
                    <span
                      className={`text-sm font-medium ${
                        total > 0 ? 'text-stone-200' : 'text-stone-600'
                      }`}
                    >
                      {total}
                    </span>
                  </td>

                  {/* Edit arrow */}
                  <td className="px-2 py-3 text-right">
                    <ChevronRight className="w-4 h-4 text-stone-600 inline-block" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-stone-500">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-amber-900/40 border border-amber-800/40" />
          <span>Has meals</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-stone-800/40 border border-stone-700/30" />
          <span>Empty</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="info">Current</Badge>
          <span>Active week</span>
        </div>
      </div>
    </div>
  )
}
