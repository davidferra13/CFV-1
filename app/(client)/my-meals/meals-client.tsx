'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Star, Utensils } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getMyMealBoard,
  submitMealFeedback,
  type WeekMeals,
  type MealEntry,
} from '@/lib/meals/client-meal-actions'

const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'snack', 'dinner']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function MealCard({
  meal,
  onFeedback,
}: {
  meal: MealEntry
  onFeedback: (id: string, rating: number) => void
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-stone-800/50 border border-stone-700/50">
      {meal.photo_url ? (
        <img
          src={meal.photo_url}
          alt={meal.dish_name}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-stone-700/50 flex items-center justify-center flex-shrink-0">
          <Utensils className="w-6 h-6 text-stone-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-brand-400 uppercase">{meal.meal_type}</span>
          {meal.dietary_tags.length > 0 && (
            <div className="flex gap-1">
              {meal.dietary_tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-800/30"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <p className="text-sm font-medium text-stone-100 mt-0.5">{meal.dish_name}</p>
        {meal.description && (
          <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">{meal.description}</p>
        )}
        <div className="flex items-center gap-1 mt-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onFeedback(meal.id, n)}
              className="p-0.5 hover:scale-110 transition-transform"
            >
              <Star
                className={`w-4 h-4 ${
                  meal.feedback_rating && n <= meal.feedback_rating
                    ? 'text-amber-400'
                    : 'text-stone-600 hover:text-stone-400'
                }`}
                weight={meal.feedback_rating && n <= meal.feedback_rating ? 'fill' : 'regular'}
              />
            </button>
          ))}
          {meal.feedback_rating && <span className="text-xs text-stone-500 ml-1">Rated</span>}
        </div>
      </div>
    </div>
  )
}

export function MealsClient({ initialWeek }: { initialWeek: WeekMeals }) {
  const [week, setWeek] = useState(initialWeek)
  const [offset, setOffset] = useState(0)
  const [isPending, startTransition] = useTransition()

  function navigateWeek(direction: -1 | 1) {
    const newOffset = offset + direction
    setOffset(newOffset)
    startTransition(async () => {
      try {
        const data = await getMyMealBoard(newOffset)
        setWeek(data)
      } catch {
        toast.error('Failed to load meals')
      }
    })
  }

  function handleFeedback(mealId: string, rating: number) {
    setWeek((prev) => ({
      ...prev,
      meals: prev.meals.map((m) => (m.id === mealId ? { ...m, feedback_rating: rating } : m)),
    }))
    startTransition(async () => {
      try {
        await submitMealFeedback(mealId, rating)
        toast.success('Feedback saved')
      } catch {
        toast.error('Failed to save feedback')
      }
    })
  }

  // Group meals by date
  const mealsByDate = new Map<string, MealEntry[]>()
  for (const meal of week.meals) {
    const existing = mealsByDate.get(meal.date) || []
    existing.push(meal)
    mealsByDate.set(meal.date, existing)
  }

  // Sort meals within each day by type
  for (const [date, meals] of mealsByDate) {
    meals.sort(
      (a, b) => MEAL_TYPE_ORDER.indexOf(a.meal_type) - MEAL_TYPE_ORDER.indexOf(b.meal_type)
    )
    mealsByDate.set(date, meals)
  }

  const weekStartLabel = formatDate(week.weekStart)
  const weekEndLabel = formatDate(week.weekEnd)

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigateWeek(-1)}
          disabled={isPending}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>
        <span className={`text-sm font-medium ${isPending ? 'text-stone-500' : 'text-stone-300'}`}>
          {weekStartLabel} &ndash; {weekEndLabel}
          {offset === 0 && <span className="text-brand-400 ml-2">This Week</span>}
        </span>
        <button
          type="button"
          onClick={() => navigateWeek(1)}
          disabled={isPending}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors disabled:opacity-50"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {!week.hasActiveMealProgram ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Utensils className="w-10 h-10 text-stone-600 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">No meal program active this week.</p>
            <p className="text-stone-500 text-xs mt-1">
              When your chef posts meals to your circle, they will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Array.from(mealsByDate.entries()).map(([date, meals]) => {
            const d = new Date(date + 'T12:00:00')
            const dayName = DAY_NAMES[d.getDay()]
            const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

            return (
              <Card key={date}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {dayName}
                    <span className="text-stone-500 font-normal ml-2 text-sm">{dateLabel}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {meals.map((meal) => (
                    <MealCard key={meal.id} meal={meal} onFeedback={handleFeedback} />
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
