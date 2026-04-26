'use client'

import { useState, useMemo } from 'react'
import { submitTokenMenuSelections, type PublicMenuData } from '@/lib/menus/menu-share-actions'

type Props = {
  menu: PublicMenuData
  token: string
}

export function MenuPickClient({ menu, token }: Props) {
  const [selectedDishIds, setSelectedDishIds] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // Group dishes by course
  const courseGroups = useMemo(() => {
    const groups = new Map<string, typeof menu.dishes>()
    for (const dish of menu.dishes) {
      const course = dish.course || 'Other'
      const existing = groups.get(course) || []
      existing.push(dish)
      groups.set(course, existing)
    }
    return Array.from(groups.entries())
  }, [menu.dishes])

  const toggleDish = (dishId: string) => {
    setSelectedDishIds((prev) => {
      const next = new Set(prev)
      if (next.has(dishId)) {
        next.delete(dishId)
      } else {
        next.add(dishId)
      }
      return next
    })
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }
    if (selectedDishIds.size === 0) {
      setError('Please select at least one dish')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await submitTokenMenuSelections({
        token,
        name: name.trim(),
        dishIds: Array.from(selectedDishIds),
        notes: notes.trim() || undefined,
      })

      if (!result.success) {
        setError(result.error || 'Something went wrong')
      } else {
        setSubmitted(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-4xl">&#10003;</div>
        <h1 className="text-xl font-semibold text-stone-100">
          Your picks have been sent to the chef!
        </h1>
        <p className="text-sm text-stone-400">
          {menu.chefName ? `${menu.chefName} will` : 'The chef will'} see your selections. You can
          close this page.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-stone-100">Pick Your Dishes</h1>
        {menu.chefName && <p className="text-sm text-stone-400">Menu by {menu.chefName}</p>}
        {menu.eventOccasion && (
          <p className="text-sm text-stone-500">
            {menu.eventOccasion}
            {menu.eventDate &&
              ` \u00B7 ${new Date(menu.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
          </p>
        )}
      </div>

      {/* Name input */}
      <div>
        <label htmlFor="picker-name" className="block text-sm font-medium text-stone-300 mb-1">
          Your name
        </label>
        <input
          id="picker-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sarah"
          className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Dishes by course */}
      {courseGroups.map(([course, dishes]) => (
        <div key={course} className="space-y-2">
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider">
            {course}
          </h2>
          <div className="space-y-1">
            {dishes.map((dish) => {
              const selected = selectedDishIds.has(dish.id)
              return (
                <button
                  key={dish.id}
                  type="button"
                  onClick={() => toggleDish(dish.id)}
                  className={`w-full text-left rounded-lg border p-3 transition ${
                    selected
                      ? 'border-brand-500 bg-brand-950/50'
                      : 'border-stone-700 bg-stone-900 hover:border-stone-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                        selected ? 'border-brand-500 bg-brand-500' : 'border-stone-600'
                      }`}
                    >
                      {selected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-medium ${selected ? 'text-brand-300' : 'text-stone-100'}`}
                      >
                        {dish.name}
                      </p>
                      {dish.description && (
                        <p className="text-xs text-stone-500 mt-0.5">{dish.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Notes */}
      <div>
        <label htmlFor="picker-notes" className="block text-sm font-medium text-stone-300 mb-1">
          Notes for the chef (optional)
        </label>
        <textarea
          id="picker-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Allergies, dietary needs, or preferences..."
          rows={3}
          className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || selectedDishIds.size === 0 || !name.trim()}
        className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? 'Sending...' : `Send My Picks (${selectedDishIds.size})`}
      </button>

      <p className="text-xs text-center text-stone-600">Powered by ChefFlow</p>
    </div>
  )
}
