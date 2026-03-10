'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, X, Search, AlertTriangle, Check, Trash2 } from '@/components/ui/icons'
import type { DayPlan, MealEntry, VarietyWarning } from '@/lib/meal-prep/meal-plan-actions'
import {
  saveMealPlan,
  checkVariety,
  searchRecipesForMealPlan,
} from '@/lib/meal-prep/meal-plan-actions'

// ============================================
// Constants
// ============================================

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ============================================
// Types
// ============================================

interface DietaryContext {
  allergies: string[]
  dietary_restrictions: string[]
  dislikes: string[]
  favorite_cuisines: string[]
}

interface MealPlanBuilderProps {
  programId: string
  initialPlan: DayPlan[]
  rotationWeek: number
  totalRotationWeeks: number
  clientName: string
  dietary: DietaryContext
  onWeekChange: (week: number) => void
}

// ============================================
// Recipe Picker Sub-Component
// ============================================

function RecipePicker({
  onSelect,
  onCancel,
}: {
  onSelect: (meal: MealEntry) => void
  onCancel: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; name: string; category: string | null }[]>(
    []
  )
  const [searching, setSearching] = useState(false)
  const [mode, setMode] = useState<'recipe' | 'freetext'>('recipe')
  const [freeText, setFreeText] = useState('')
  const [freeNotes, setFreeNotes] = useState('')

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const data = await searchRecipesForMealPlan(q.trim())
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  return (
    <div className="bg-stone-800/80 border border-stone-700 rounded-lg p-3 space-y-3">
      {/* Mode tabs */}
      <div className="flex gap-1">
        <button
          onClick={() => setMode('recipe')}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            mode === 'recipe'
              ? 'bg-stone-700 text-stone-100'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          From Recipe Book
        </button>
        <button
          onClick={() => setMode('freetext')}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            mode === 'freetext'
              ? 'bg-stone-700 text-stone-100'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          Free Text
        </button>
      </div>

      {mode === 'recipe' ? (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              type="text"
              placeholder="Search recipes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full pl-8 pr-3 py-2 text-sm bg-stone-900 border border-stone-700 rounded-lg text-stone-200 placeholder:text-stone-600"
            />
          </div>
          {searching && <p className="text-xs text-stone-500">Searching...</p>}
          {results.length > 0 && (
            <ul className="max-h-40 overflow-y-auto space-y-1">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() =>
                      onSelect({ name: r.name, recipeId: r.id, category: r.category ?? undefined })
                    }
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-stone-700 text-stone-200 flex items-center justify-between"
                  >
                    <span>{r.name}</span>
                    {r.category && <Badge variant="default">{r.category}</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.length >= 2 && !searching && results.length === 0 && (
            <p className="text-xs text-stone-500">No recipes found. Try free text instead.</p>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Dish name"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            autoFocus
            className="w-full px-3 py-2 text-sm bg-stone-900 border border-stone-700 rounded-lg text-stone-200 placeholder:text-stone-600"
          />
          <input
            type="text"
            placeholder="Notes (optional)"
            value={freeNotes}
            onChange={(e) => setFreeNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-stone-900 border border-stone-700 rounded-lg text-stone-200 placeholder:text-stone-600"
          />
          <Button
            variant="primary"
            size="sm"
            disabled={!freeText.trim()}
            onClick={() =>
              onSelect({
                name: freeText.trim(),
                notes: freeNotes.trim() || undefined,
              })
            }
          >
            <Plus className="w-3.5 h-3.5" />
            Add Dish
          </Button>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-300">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export function MealPlanBuilder({
  programId,
  initialPlan,
  rotationWeek,
  totalRotationWeeks,
  clientName,
  dietary,
  onWeekChange,
}: MealPlanBuilderProps) {
  const [plan, setPlan] = useState<DayPlan[]>(initialPlan)
  const [pending, startTransition] = useTransition()
  const [addingToDay, setAddingToDay] = useState<number | null>(null)
  const [warnings, setWarnings] = useState<VarietyWarning[]>([])
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Update plan when week changes
  useEffect(() => {
    setPlan(initialPlan)
    setWarnings([])
    setSaved(false)
    setSaveError(null)
  }, [initialPlan, rotationWeek])

  const hasAllergies = dietary.allergies.length > 0
  const hasRestrictions = dietary.dietary_restrictions.length > 0
  const hasDislikes = dietary.dislikes.length > 0

  function addMealToDay(dayIndex: number, meal: MealEntry) {
    setPlan((prev) =>
      prev.map((d) => (d.dayIndex === dayIndex ? { ...d, meals: [...d.meals, meal] } : d))
    )
    setAddingToDay(null)
    setSaved(false)

    // Run variety check
    startTransition(async () => {
      try {
        const updatedPlan = plan.map((d) =>
          d.dayIndex === dayIndex ? { ...d, meals: [...d.meals, meal] } : d
        )
        const w = await checkVariety(programId, rotationWeek, updatedPlan)
        setWarnings(w)
      } catch {
        // Non-blocking
      }
    })
  }

  function removeMeal(dayIndex: number, mealIndex: number) {
    setPlan((prev) =>
      prev.map((d) =>
        d.dayIndex === dayIndex ? { ...d, meals: d.meals.filter((_, i) => i !== mealIndex) } : d
      )
    )
    setSaved(false)
  }

  function handleSave() {
    const previous = [...plan]
    startTransition(async () => {
      try {
        const result = await saveMealPlan(programId, rotationWeek, plan)
        if (result.error) {
          setSaveError(result.error)
          setPlan(previous)
        } else {
          setSaved(true)
          setSaveError(null)
          // Also run variety check after save
          const w = await checkVariety(programId, rotationWeek, plan)
          setWarnings(w)
        }
      } catch {
        setSaveError('Failed to save meal plan')
        setPlan(previous)
      }
    })
  }

  function getDuplicateWarning(dishName: string): VarietyWarning | undefined {
    return warnings.find((w) => w.dishName === dishName.toLowerCase().trim())
  }

  const totalMeals = plan.reduce((sum, d) => sum + d.meals.length, 0)

  return (
    <div className="space-y-4">
      {/* Dietary banner */}
      {(hasAllergies || hasRestrictions || hasDislikes) && (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-stone-200">Dietary Notes for {clientName}</p>
              <div className="flex flex-wrap gap-2">
                {dietary.allergies.map((a) => (
                  <Badge key={`allergy-${a}`} variant="error">
                    Allergy: {a}
                  </Badge>
                ))}
                {dietary.dietary_restrictions.map((r) => (
                  <Badge key={`restriction-${r}`} variant="warning">
                    {r}
                  </Badge>
                ))}
                {dietary.dislikes.map((d) => (
                  <Badge key={`dislike-${d}`} variant="default">
                    Dislikes: {d}
                  </Badge>
                ))}
              </div>
              {dietary.favorite_cuisines.length > 0 && (
                <p className="text-xs text-stone-500">
                  Favorites: {dietary.favorite_cuisines.join(', ')}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Week selector + save */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm text-stone-400">Rotation Week:</label>
          <select
            value={rotationWeek}
            onChange={(e) => onWeekChange(Number(e.target.value))}
            className="px-3 py-1.5 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
          >
            {Array.from({ length: totalRotationWeeks }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Week {i + 1}
              </option>
            ))}
          </select>
          <span className="text-xs text-stone-500">{totalMeals} meals planned</span>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <Check className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
          {saveError && <span className="text-xs text-red-400">{saveError}</span>}
          <Button
            variant="primary"
            size="sm"
            disabled={pending}
            loading={pending}
            onClick={handleSave}
          >
            Save Plan
          </Button>
        </div>
      </div>

      {/* Variety warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-950/50 border border-amber-800/60 rounded-lg p-3 space-y-1">
          <p className="text-xs font-medium text-amber-400">Variety Warnings</p>
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-300/80">
              {w.details}
            </p>
          ))}
        </div>
      )}

      {/* 7-day grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {plan.map((day) => {
          const isAdding = addingToDay === day.dayIndex

          return (
            <div
              key={day.dayIndex}
              className="bg-stone-900/60 border border-stone-700/60 rounded-xl p-3 space-y-2 min-h-[200px] flex flex-col"
            >
              {/* Day header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-200 hidden lg:block">
                  {DAY_SHORT[day.dayIndex]}
                </h3>
                <h3 className="text-sm font-semibold text-stone-200 lg:hidden">
                  {DAY_NAMES[day.dayIndex]}
                </h3>
                <span className="text-xs text-stone-600">{day.meals.length}</span>
              </div>

              {/* Meals list */}
              <div className="flex-1 space-y-1.5">
                {day.meals.map((meal, mealIdx) => {
                  const warning = getDuplicateWarning(meal.name)
                  return (
                    <div
                      key={mealIdx}
                      className={`group flex items-start gap-1.5 p-2 rounded-lg text-xs ${
                        warning
                          ? 'bg-amber-950/40 border border-amber-800/50'
                          : 'bg-stone-800/60 border border-stone-700/40'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-stone-200 font-medium truncate">{meal.name}</p>
                        {meal.recipeId && (
                          <p className="text-stone-500 text-[10px]">From recipe book</p>
                        )}
                        {meal.category && (
                          <Badge variant="default" className="mt-0.5 text-[10px] px-1.5 py-0">
                            {meal.category}
                          </Badge>
                        )}
                        {meal.notes && (
                          <p className="text-stone-500 text-[10px] mt-0.5">{meal.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeMeal(day.dayIndex, mealIdx)}
                        className="opacity-0 group-hover:opacity-100 text-stone-600 hover:text-red-400 transition-opacity p-0.5"
                        title="Remove"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Add meal */}
              {isAdding ? (
                <RecipePicker
                  onSelect={(meal) => addMealToDay(day.dayIndex, meal)}
                  onCancel={() => setAddingToDay(null)}
                />
              ) : (
                <button
                  onClick={() => setAddingToDay(day.dayIndex)}
                  className="flex items-center justify-center gap-1 w-full py-1.5 text-xs text-stone-500 hover:text-stone-300 hover:bg-stone-800/60 rounded-lg border border-dashed border-stone-700/50 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Meal
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
