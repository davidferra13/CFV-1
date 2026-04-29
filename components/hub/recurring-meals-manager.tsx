'use client'

import { useState, useEffect, useTransition } from 'react'
import type { MealType } from '@/lib/hub/types'
import {
  createRecurringMeal,
  getRecurringMeals,
  deleteRecurringMeal,
  applyRecurringMeals,
} from '@/lib/hub/meal-board-actions'

const PATTERNS = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays (Mon-Fri)' },
  { value: 'weekends', label: 'Weekends (Sat-Sun)' },
  { value: 'weekly', label: 'Weekly (pick day)' },
] as const

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
]

interface RecurringMealsManagerProps {
  groupId: string
  profileToken: string
  currentWeekStart: string
  onMealsApplied: () => void
}

export function RecurringMealsManager({
  groupId,
  profileToken,
  currentWeekStart,
  onMealsApplied,
}: RecurringMealsManagerProps) {
  const [recurrings, setRecurrings] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Form state
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [title, setTitle] = useState('')
  const [pattern, setPattern] = useState('weekdays')
  const [dayOfWeek, setDayOfWeek] = useState<number>(0)

  useEffect(() => {
    setIsLoading(true)
    setLoadError(null)
    setRecurrings([])
    getRecurringMeals(groupId)
      .then((meals) => {
        setRecurrings(meals)
      })
      .catch(() => {
        setLoadError('Failed to load recurring meals')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [groupId])

  const handleCreate = () => {
    if (!title.trim()) return

    startTransition(async () => {
      try {
        const result = await createRecurringMeal({
          groupId,
          profileToken,
          mealType,
          title: title.trim(),
          pattern,
          dayOfWeek: pattern === 'weekly' ? dayOfWeek : null,
        })
        if (result.success) {
          setShowForm(false)
          setTitle('')
          const fresh = await getRecurringMeals(groupId)
          setRecurrings(fresh)
        } else {
          setError(result.error ?? 'Failed to create')
        }
      } catch {
        setError('Failed to create recurring meal')
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteRecurringMeal({ recurringId: id, profileToken })
        setRecurrings((prev) => prev.filter((r) => r.id !== id))
      } catch {
        setError('Failed to remove')
      }
    })
  }

  const handleApply = () => {
    startTransition(async () => {
      try {
        const result = await applyRecurringMeals({
          groupId,
          profileToken,
          weekStart: currentWeekStart,
        })
        if (result.success) {
          onMealsApplied()
          setError(result.filled > 0 ? null : null)
        } else {
          setError(result.error ?? 'Failed to apply')
        }
      } catch {
        setError('Failed to apply recurring meals')
      }
    })
  }

  const patternLabel = (r: any) => {
    if (r.pattern === 'weekly') return `Every ${DAYS[r.day_of_week ?? 0]}`
    return PATTERNS.find((p) => p.value === r.pattern)?.label ?? r.pattern
  }

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-stone-300">Recurring Meals</p>
        <div className="flex gap-1">
          {recurrings.length > 0 && (
            <button
              type="button"
              onClick={handleApply}
              disabled={isPending}
              className="rounded bg-[var(--hub-primary,#e88f47)] px-2 py-0.5 text-[10px] font-medium text-white disabled:opacity-50"
            >
              {isPending ? 'Applying...' : 'Fill This Week'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="rounded bg-stone-800 px-2 py-0.5 text-[10px] text-stone-400 hover:bg-stone-700"
          >
            {showForm ? 'Cancel' : '+ Add'}
          </button>
        </div>
      </div>

      {error && <p className="mb-2 text-[10px] text-red-400">{error}</p>}
      {loadError && !isLoading && <p className="mb-2 text-[10px] text-red-400">{loadError}</p>}
      {isLoading && <p className="text-[10px] text-stone-500">Loading recurring meals...</p>}

      {/* Existing recurring meals */}
      {!isLoading && !loadError && recurrings.length > 0 && (
        <div className="mb-2 space-y-1">
          {recurrings.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg bg-stone-800/40 px-2 py-1.5"
            >
              <div>
                <span className="text-xs text-stone-200">{r.title}</span>
                <span className="ml-1.5 text-[10px] text-stone-500">
                  {r.meal_type} / {patternLabel(r)}
                </span>
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                disabled={isPending}
                className="text-[10px] text-stone-600 hover:text-red-400 disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !loadError && recurrings.length === 0 && !showForm && (
        <p className="text-[10px] text-stone-600">
          Set up repeating meals (e.g., smoothie bowl every weekday breakfast).
        </p>
      )}

      {/* New recurring form */}
      {showForm && (
        <div className="space-y-2 rounded-lg border border-stone-700 bg-stone-800/60 p-2.5">
          <div className="flex gap-2">
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              title="Meal type"
              className="rounded bg-stone-700 px-2 py-1 text-xs text-stone-200 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
            >
              {MEAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              title="Repeat pattern"
              className="rounded bg-stone-700 px-2 py-1 text-xs text-stone-200 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
            >
              {PATTERNS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            {pattern === 'weekly' && (
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                title="Day of week"
                className="rounded bg-stone-700 px-2 py-1 text-xs text-stone-200 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
              >
                {DAYS.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Dish name (e.g., Smoothie Bowl & Fresh Fruit)"
            className="w-full rounded bg-stone-700 px-2 py-1.5 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
            maxLength={200}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && title.trim()) handleCreate()
              if (e.key === 'Escape') setShowForm(false)
            }}
          />

          <button
            type="button"
            onClick={handleCreate}
            disabled={!title.trim() || isPending}
            className="rounded bg-[var(--hub-primary,#e88f47)] px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            Create
          </button>
        </div>
      )}
    </div>
  )
}
