'use client'

import { useState, useMemo } from 'react'
import { submitCatalogPicks, type PublicCatalogData } from '@/lib/menus/catalog-selection-actions'

type Props = {
  catalog: PublicCatalogData
  token: string
}

const COURSE_ORDER = [
  'amuse',
  'canapé',
  'appetizer',
  'soup',
  'salad',
  'fish',
  'entrée',
  'cheese',
  'dessert',
  'side',
  'beverage',
  'other',
]

const COURSE_LABELS: Record<string, string> = {
  amuse: 'Amuse-Bouche',
  canapé: 'Canapé',
  appetizer: 'Appetizer',
  soup: 'Soup',
  salad: 'Salad',
  fish: 'Fish Course',
  entrée: 'Entrée',
  cheese: 'Cheese Course',
  dessert: 'Dessert',
  side: 'Side',
  beverage: 'Beverage',
  other: 'Other',
}

export function CatalogPickClient({ catalog, token }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const courseGroups = useMemo(() => {
    const groups = new Map<string, typeof catalog.dishes>()
    for (const dish of catalog.dishes) {
      const course = dish.course || 'other'
      const existing = groups.get(course) || []
      existing.push(dish)
      groups.set(course, existing)
    }
    // Sort by course order
    return Array.from(groups.entries()).sort(([a], [b]) => {
      const ai = COURSE_ORDER.indexOf(a)
      const bi = COURSE_ORDER.indexOf(b)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
  }, [catalog.dishes])

  const toggleDish = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }
    if (selectedIds.size === 0) {
      setError('Please select at least one course')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await submitCatalogPicks({
        token,
        name: name.trim(),
        dishIds: Array.from(selectedIds),
        notes: notes.trim() || undefined,
      })

      if (result.success) {
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
        <h1 className="text-xl font-semibold text-stone-100">Your picks have been sent!</h1>
        <p className="text-sm text-stone-400">
          {catalog.chefName || 'Your chef'} will see your {selectedIds.size} selections and finalize
          your menu. You can close this page.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-stone-100">
          {catalog.selectionName || 'Pick Your Courses'}
        </h1>
        {catalog.chefName && <p className="text-sm text-stone-400">by {catalog.chefName}</p>}
        {catalog.description && <p className="text-sm text-stone-500">{catalog.description}</p>}
        {catalog.eventOccasion && (
          <p className="text-sm text-stone-500">
            {catalog.eventOccasion}
            {catalog.eventDate &&
              ` \u00B7 ${new Date(catalog.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
          </p>
        )}
        <p className="text-xs text-stone-600 mt-2">
          Select the courses you want, then send your picks
        </p>
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

      {/* Courses by type */}
      {courseGroups.map(([course, dishes]) => (
        <div key={course} className="space-y-2">
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider">
            {COURSE_LABELS[course] || course}
            <span className="ml-2 text-stone-600 normal-case font-normal">
              {dishes.filter((d) => selectedIds.has(d.id)).length}/{dishes.length} selected
            </span>
          </h2>
          <div className="space-y-1.5">
            {dishes.map((dish) => {
              const selected = selectedIds.has(dish.id)
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {dish.isSig && (
                          <span className="text-brand-400 text-xs" title="Signature dish">
                            ★
                          </span>
                        )}
                        <p
                          className={`text-sm font-medium ${selected ? 'text-brand-300' : 'text-stone-100'}`}
                        >
                          {dish.name}
                        </p>
                      </div>
                      {dish.description && (
                        <p className="text-xs text-stone-500 mt-0.5">{dish.description}</p>
                      )}
                      {dish.dietaryTags.length > 0 && (
                        <div className="flex gap-1 mt-1.5">
                          {dish.dietaryTags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
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
          placeholder="Allergies, dietary needs, preferences, or anything else..."
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
        disabled={loading || selectedIds.size === 0 || !name.trim()}
        className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading
          ? 'Sending...'
          : `Send My Picks (${selectedIds.size} course${selectedIds.size !== 1 ? 's' : ''})`}
      </button>

      <p className="text-xs text-center text-stone-600">Powered by ChefFlow</p>
    </div>
  )
}
