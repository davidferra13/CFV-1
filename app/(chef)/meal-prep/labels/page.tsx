'use client'

import { useState, useCallback, useTransition, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LabelGrid } from '@/components/meal-prep/container-label'
import { generateLabels, generateLabelsFromEvent } from '@/lib/meal-prep/label-actions'
import type { ContainerLabel, LabelDish } from '@/lib/meal-prep/label-actions'
import { format } from 'date-fns'

const COMMON_ALLERGENS = [
  'Dairy', 'Gluten', 'Nuts', 'Shellfish', 'Soy', 'Eggs', 'Fish', 'Sesame',
]

interface DishEntry {
  id: string
  name: string
  servings: number
  reheatingInstructions: string
  allergens: string[]
  calories: string
  protein: string
  carbs: string
  fat: string
}

function createEmptyDish(): DishEntry {
  return {
    id: crypto.randomUUID(),
    name: '',
    servings: 1,
    reheatingInstructions: '',
    allergens: [],
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  }
}

export default function MealPrepLabelsPage() {
  const [dishes, setDishes] = useState<DishEntry[]>([createEmptyDish()])
  const [prepDate, setPrepDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [shelfLifeDays, setShelfLifeDays] = useState(5)
  const [clientName, setClientName] = useState('')
  const [chefName, setChefName] = useState('')
  const [includeNutrition, setIncludeNutrition] = useState(false)
  const [labels, setLabels] = useState<ContainerLabel[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // ─── Event loading state ────────────────────────────────────────────────
  const searchParams = useSearchParams()
  const [eventId, setEventId] = useState(searchParams.get('eventId') || '')
  const [loadingEvent, setLoadingEvent] = useState(false)
  const [autoLoaded, setAutoLoaded] = useState(false)

  // Auto-load dishes when eventId is in the URL
  useEffect(() => {
    const eid = searchParams.get('eventId')
    if (eid && !autoLoaded) {
      setAutoLoaded(true)
      setLoadingEvent(true)
      generateLabelsFromEvent(eid)
        .then((result) => {
          if (result.dishes.length > 0) {
            setDishes(
              result.dishes.map((d) => ({
                id: crypto.randomUUID(),
                name: d.name,
                servings: d.servings,
                reheatingInstructions: d.reheatingInstructions,
                allergens: d.allergens,
                calories: d.calories?.toString() || '',
                protein: d.protein?.toString() || '',
                carbs: d.carbs?.toString() || '',
                fat: d.fat?.toString() || '',
              }))
            )
            if (result.clientName) setClientName(result.clientName)
            if (result.chefName) setChefName(result.chefName)
          }
        })
        .catch(() => {
          setError('Failed to auto-load dishes from event.')
        })
        .finally(() => setLoadingEvent(false))
    }
  }, [searchParams, autoLoaded])

  const addDish = useCallback(() => {
    setDishes((prev) => [...prev, createEmptyDish()])
  }, [])

  const removeDish = useCallback((id: string) => {
    setDishes((prev) => prev.length > 1 ? prev.filter((d) => d.id !== id) : prev)
  }, [])

  const updateDish = useCallback((id: string, field: keyof DishEntry, value: any) => {
    setDishes((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    )
  }, [])

  const toggleAllergen = useCallback((dishId: string, allergen: string) => {
    setDishes((prev) =>
      prev.map((d) => {
        if (d.id !== dishId) return d
        const has = d.allergens.includes(allergen)
        return {
          ...d,
          allergens: has
            ? d.allergens.filter((a) => a !== allergen)
            : [...d.allergens, allergen],
        }
      })
    )
  }, [])

  // ─── Generate labels ──────────────────────────────────────────────────────

  const handleGenerate = () => {
    setError(null)
    const validDishes = dishes.filter((d) => d.name.trim())
    if (validDishes.length === 0) {
      setError('Add at least one dish with a name.')
      return
    }

    const labelDishes: LabelDish[] = validDishes.map((d) => ({
      name: d.name.trim(),
      servings: d.servings,
      reheatingInstructions: d.reheatingInstructions,
      allergens: d.allergens,
      calories: d.calories ? parseInt(d.calories, 10) : undefined,
      protein: d.protein ? parseInt(d.protein, 10) : undefined,
      carbs: d.carbs ? parseInt(d.carbs, 10) : undefined,
      fat: d.fat ? parseInt(d.fat, 10) : undefined,
    }))

    startTransition(async () => {
      try {
        const result = await generateLabels({
          dishes: labelDishes,
          prepDate,
          shelfLifeDays,
          clientName: clientName.trim() || undefined,
          chefName: chefName.trim() || 'Chef',
          includeNutrition,
        })
        setLabels(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate labels')
        setLabels([])
      }
    })
  }

  // ─── Load from event ──────────────────────────────────────────────────────

  const handleLoadFromEvent = () => {
    if (!eventId.trim()) {
      setError('Enter an event ID to load dishes.')
      return
    }

    setLoadingEvent(true)
    setError(null)

    startTransition(async () => {
      try {
        const result = await generateLabelsFromEvent(eventId.trim())
        if (result.dishes.length === 0) {
          setError('No dishes found for this event. Make sure a menu with dishes is attached.')
          setLoadingEvent(false)
          return
        }
        setDishes(
          result.dishes.map((d) => ({
            id: crypto.randomUUID(),
            name: d.name,
            servings: d.servings,
            reheatingInstructions: d.reheatingInstructions,
            allergens: d.allergens,
            calories: d.calories?.toString() || '',
            protein: d.protein?.toString() || '',
            carbs: d.carbs?.toString() || '',
            fat: d.fat?.toString() || '',
          }))
        )
        if (result.clientName) setClientName(result.clientName)
        if (result.chefName) setChefName(result.chefName)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load event dishes')
      } finally {
        setLoadingEvent(false)
      }
    })
  }

  // ─── Print ────────────────────────────────────────────────────────────────

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-stone-900">Meal Prep Container Labels</h1>
        <p className="text-sm text-stone-500 mt-1">
          Generate printable labels for meal prep containers with dish info, dates, reheating instructions, and allergen warnings.
        </p>
      </div>

      {/* Load from Event */}
      <Card className="p-4 print:hidden">
        <h2 className="text-sm font-semibold text-stone-200 mb-3">Load from Event</h2>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-stone-500 mb-1">Event ID</label>
            <input
              type="text"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder="Paste event ID here"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <Button
            variant="secondary"
            onClick={handleLoadFromEvent}
            disabled={loadingEvent || isPending}
          >
            {loadingEvent ? 'Loading...' : 'Load Dishes'}
          </Button>
        </div>
      </Card>

      {/* Settings */}
      <Card className="p-4 print:hidden">
        <h2 className="text-sm font-semibold text-stone-200 mb-3">Label Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Prep Date</label>
            <input
              type="date"
              value={prepDate}
              onChange={(e) => setPrepDate(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Shelf Life (days)</label>
            <input
              type="number"
              min={1}
              max={30}
              value={shelfLifeDays}
              onChange={(e) => setShelfLifeDays(parseInt(e.target.value, 10) || 5)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Client Name (optional)</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Smith Family"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Chef / Brand Name</label>
            <input
              type="text"
              value={chefName}
              onChange={(e) => setChefName(e.target.value)}
              placeholder="Your name or business"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="flex items-center gap-2 text-sm text-stone-200 cursor-pointer">
            <input
              type="checkbox"
              checked={includeNutrition}
              onChange={(e) => setIncludeNutrition(e.target.checked)}
              className="rounded border-stone-300"
            />
            Include nutrition info (calories, macros)
          </label>
        </div>
      </Card>

      {/* Dish List */}
      <div className="space-y-4 print:hidden">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-200">Dishes</h2>
          <Button variant="secondary" onClick={addDish}>
            + Add Dish
          </Button>
        </div>

        {dishes.map((dish, idx) => (
          <Card key={dish.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-medium text-stone-400">Dish {idx + 1}</span>
              {dishes.length > 1 && (
                <button
                  onClick={() => removeDish(dish.id)}
                  className="text-xs text-red-500 hover:text-red-200"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs text-stone-500 mb-1">Dish Name</label>
                <input
                  type="text"
                  value={dish.name}
                  onChange={(e) => updateDish(dish.id, 'name', e.target.value)}
                  placeholder="e.g. Chicken Marsala"
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-500 mb-1">Servings / Labels</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={dish.servings}
                  onChange={(e) =>
                    updateDish(dish.id, 'servings', parseInt(e.target.value, 10) || 1)
                  }
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-500 mb-1">
                  Reheating Instructions
                </label>
                <input
                  type="text"
                  value={dish.reheatingInstructions}
                  onChange={(e) =>
                    updateDish(dish.id, 'reheatingInstructions', e.target.value)
                  }
                  placeholder="e.g. Microwave 3 min or Oven 350F 15 min"
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Allergen checkboxes */}
              <div className="sm:col-span-2">
                <label className="block text-xs text-stone-500 mb-1">Allergens</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_ALLERGENS.map((a) => (
                    <label
                      key={a}
                      className="flex items-center gap-1 text-xs text-stone-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={dish.allergens.includes(a)}
                        onChange={() => toggleAllergen(dish.id, a)}
                        className="rounded border-stone-300"
                      />
                      {a}
                    </label>
                  ))}
                </div>
              </div>

              {/* Nutrition fields (visible when toggle is on) */}
              {includeNutrition && (
                <>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Calories</label>
                    <input
                      type="number"
                      min={0}
                      value={dish.calories}
                      onChange={(e) => updateDish(dish.id, 'calories', e.target.value)}
                      placeholder="kcal"
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Protein (g)</label>
                    <input
                      type="number"
                      min={0}
                      value={dish.protein}
                      onChange={(e) => updateDish(dish.id, 'protein', e.target.value)}
                      placeholder="g"
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      min={0}
                      value={dish.carbs}
                      onChange={(e) => updateDish(dish.id, 'carbs', e.target.value)}
                      placeholder="g"
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Fat (g)</label>
                    <input
                      type="number"
                      min={0}
                      value={dish.fat}
                      onChange={(e) => updateDish(dish.id, 'fat', e.target.value)}
                      placeholder="g"
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-200 print:hidden">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 print:hidden">
        <Button variant="primary" onClick={handleGenerate} disabled={isPending}>
          {isPending ? 'Generating...' : 'Generate Labels'}
        </Button>
        {labels.length > 0 && (
          <Button variant="secondary" onClick={handlePrint}>
            Print Labels
          </Button>
        )}
      </div>

      {/* Preview / Print Area */}
      {labels.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-200 mb-3 print:hidden">
            Preview ({labels.length} label{labels.length !== 1 ? 's' : ''})
          </h2>
          <LabelGrid labels={labels} />
        </div>
      )}
    </div>
  )
}
