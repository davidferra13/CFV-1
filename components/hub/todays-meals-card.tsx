'use client'

import { useMemo } from 'react'
import type { MealBoardEntry, MealType, MealStatus } from '@/lib/hub/types'

interface TodaysMealsCardProps {
  entries: MealBoardEntry[]
  defaultHeadCount: number | null
  isChefOrAdmin: boolean
  onStatusChange?: (entryId: string, status: MealStatus) => void
}

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}

const STATUS_CONFIG: Record<
  MealStatus,
  { label: string; color: string; bg: string; next: MealStatus | null }
> = {
  planned: {
    label: 'Planned',
    color: 'text-stone-400',
    bg: 'bg-stone-700/50',
    next: 'confirmed',
  },
  confirmed: {
    label: 'Confirmed',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    next: 'served',
  },
  served: {
    label: 'Served',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    next: null,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    next: null,
  },
}

function formatTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function TodaysMealsCard({
  entries,
  defaultHeadCount,
  isChefOrAdmin,
  onStatusChange,
}: TodaysMealsCardProps) {
  const todayStr = useMemo(() => {
    const now = new Date()
    return now.toISOString().split('T')[0]
  }, [])

  const todaysMeals = useMemo(() => {
    return entries
      .filter((e) => e.meal_date === todayStr && e.status !== 'cancelled')
      .sort((a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type))
  }, [entries, todayStr])

  if (todaysMeals.length === 0) return null

  const dayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="rounded-xl border border-[var(--hub-primary,#e88f47)]/30 bg-gradient-to-br from-stone-900 to-stone-900/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">Today&apos;s Menu</h3>
          <p className="text-[10px] text-stone-500">{dayLabel}</p>
        </div>
        <span className="rounded-full bg-[var(--hub-primary,#e88f47)]/20 px-2.5 py-0.5 text-xs font-medium text-[var(--hub-primary,#e88f47)]">
          {todaysMeals.length} meal{todaysMeals.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2.5">
        {todaysMeals.map((meal) => {
          const statusConf = STATUS_CONFIG[meal.status]
          const headCount = meal.head_count ?? defaultHeadCount

          return (
            <div key={meal.id} className="flex items-start gap-3 rounded-lg bg-stone-800/50 p-3">
              <span className="mt-0.5 text-xl">{MEAL_EMOJI[meal.meal_type]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-stone-100 truncate">{meal.title}</p>
                  {headCount && (
                    <span className="shrink-0 text-[10px] text-stone-500">👥 {headCount}</span>
                  )}
                </div>
                {meal.description && (
                  <p className="mt-0.5 text-xs text-stone-400 line-clamp-2">{meal.description}</p>
                )}
                {isChefOrAdmin && meal.prep_notes && (
                  <p className="mt-0.5 text-[10px] text-amber-600 italic">{meal.prep_notes}</p>
                )}
                {(meal.dietary_tags.length > 0 || meal.allergen_flags.length > 0) && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {meal.dietary_tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-emerald-900/40 px-1.5 py-0.5 text-[10px] text-emerald-400"
                      >
                        {tag}
                      </span>
                    ))}
                    {meal.allergen_flags.map((flag) => (
                      <span
                        key={flag}
                        className="rounded-full bg-red-900/40 px-1.5 py-0.5 text-[10px] text-red-300"
                      >
                        ⚠ {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Status badge + progression */}
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusConf.bg} ${statusConf.color}`}
                >
                  {statusConf.label}
                </span>
                {isChefOrAdmin && statusConf.next && onStatusChange && (
                  <button
                    type="button"
                    onClick={() => onStatusChange(meal.id, statusConf.next!)}
                    className="text-[10px] text-[var(--hub-primary,#e88f47)] hover:underline"
                  >
                    Mark {STATUS_CONFIG[statusConf.next].label}
                  </button>
                )}
                {isChefOrAdmin &&
                  meal.status !== 'cancelled' &&
                  meal.status !== 'served' &&
                  onStatusChange && (
                    <button
                      type="button"
                      onClick={() => onStatusChange(meal.id, 'cancelled')}
                      className="text-[10px] text-stone-600 hover:text-red-400"
                    >
                      Cancel
                    </button>
                  )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
