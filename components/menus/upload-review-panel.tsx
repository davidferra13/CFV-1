'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DISH_COURSES, DISH_COURSE_LABELS, type DishCourse } from '@/lib/menus/dish-index-constants'
import { approveAndIndexDishes } from '@/lib/menus/upload-actions'

interface ParsedDish {
  dish_name: string
  course: string
  description: string
  dietary_tags: string[]
}

interface UploadReviewPanelProps {
  jobId: string
  dishes: ParsedDish[]
  rawText?: string
  onComplete: () => void
}

export function UploadReviewPanel({
  jobId,
  dishes: initialDishes,
  rawText,
  onComplete,
}: UploadReviewPanelProps) {
  const [dishes, setDishes] = useState<ParsedDish[]>(initialDishes)
  const [approving, setApproving] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const updateDish = useCallback((index: number, updates: Partial<ParsedDish>) => {
    setDishes((prev) => prev.map((d, i) => (i === index ? { ...d, ...updates } : d)))
  }, [])

  const removeDish = useCallback((index: number) => {
    setDishes((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const addDish = useCallback(() => {
    setDishes((prev) => [
      ...prev,
      { dish_name: '', course: 'other', description: '', dietary_tags: [] },
    ])
    setEditingIndex(dishes.length)
  }, [dishes.length])

  const handleApproveAll = useCallback(async () => {
    const valid = dishes.filter((d) => d.dish_name.trim())
    if (valid.length === 0) return

    setApproving(true)
    try {
      await approveAndIndexDishes({ job_id: jobId, dishes: valid })
      onComplete()
    } catch (err) {
      console.error('Failed to approve dishes:', err)
    } finally {
      setApproving(false)
    }
  }, [dishes, jobId, onComplete])

  const courseColor = (course: string) => {
    const colors: Record<string, string> = {
      amuse: 'bg-violet-900/50 text-violet-400',
      canapé: 'bg-pink-900/50 text-pink-400',
      appetizer: 'bg-purple-900/50 text-purple-400',
      soup: 'bg-teal-900/50 text-teal-400',
      salad: 'bg-emerald-900/50 text-emerald-400',
      fish: 'bg-cyan-900/50 text-cyan-400',
      entrée: 'bg-red-900/50 text-red-400',
      cheese: 'bg-amber-900/50 text-amber-400',
      dessert: 'bg-pink-900/50 text-pink-400',
      side: 'bg-lime-900/50 text-lime-400',
      beverage: 'bg-sky-900/50 text-sky-400',
      other: 'bg-stone-800 text-stone-400',
    }
    return colors[course] || colors.other
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-stone-200">Review Parsed Dishes</h3>
          <p className="text-sm text-stone-500">
            {dishes.length} dish{dishes.length !== 1 ? 'es' : ''} found — edit, remove, or add
            before approving
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={addDish}>
            + Add Dish
          </Button>
          <Button
            size="sm"
            onClick={handleApproveAll}
            disabled={approving || dishes.filter((d) => d.dish_name.trim()).length === 0}
          >
            {approving
              ? 'Indexing...'
              : `Approve ${dishes.filter((d) => d.dish_name.trim()).length} Dishes`}
          </Button>
        </div>
      </div>

      {/* Two-column layout: source text | parsed dishes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: source text */}
        {rawText && (
          <Card className="p-4">
            <h4 className="text-sm font-medium text-stone-400 mb-2">Source Text</h4>
            <pre className="text-xs text-stone-500 whitespace-pre-wrap font-mono max-h-[600px] overflow-y-auto">
              {rawText}
            </pre>
          </Card>
        )}

        {/* Right: parsed dishes */}
        <div className="space-y-2">
          {dishes.map((dish, index) => (
            <Card
              key={index}
              className={`p-3 ${editingIndex === index ? 'ring-1 ring-brand-500/50' : ''}`}
            >
              {editingIndex === index ? (
                /* Edit mode */
                <div className="space-y-2">
                  <input
                    type="text"
                    value={dish.dish_name}
                    onChange={(e) => updateDish(index, { dish_name: e.target.value })}
                    placeholder="Dish name"
                    className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm text-stone-200 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <select
                      value={dish.course}
                      onChange={(e) => updateDish(index, { course: e.target.value })}
                      className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm text-stone-300 focus:outline-none"
                    >
                      {DISH_COURSES.map((c) => (
                        <option key={c} value={c}>
                          {DISH_COURSE_LABELS[c]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={dish.description}
                      onChange={(e) => updateDish(index, { description: e.target.value })}
                      placeholder="Description (optional)"
                      className="flex-1 bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm text-stone-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditingIndex(null)}>
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="flex items-start gap-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5 ${courseColor(dish.course)}`}
                  >
                    {DISH_COURSE_LABELS[dish.course as DishCourse] || dish.course}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-200">
                      {dish.dish_name || '(unnamed)'}
                    </p>
                    {dish.description && (
                      <p className="text-xs text-stone-500 mt-0.5">{dish.description}</p>
                    )}
                    {dish.dietary_tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {dish.dietary_tags.map((tag) => (
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
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingIndex(index)}
                      className="text-stone-600 hover:text-stone-400 text-xs px-1"
                    >
                      edit
                    </button>
                    <button
                      onClick={() => removeDish(index)}
                      className="text-stone-600 hover:text-red-400 text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}

          {dishes.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-stone-500 text-sm">
                No dishes parsed. Add manually or try a different file.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
