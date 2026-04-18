'use client'

// First Menu Step - Setup Wizard
// Simple menu creation: name + dish names. No costing, no recipes.
// Just get something on the board so the chef sees the system working.

import { useState, useTransition } from 'react'
import { createMenuWithCourses } from '@/lib/menus/actions'
import type { StepCopy } from '@/lib/onboarding/archetype-copy'

interface FirstMenuStepProps {
  onComplete: (data?: Record<string, unknown>) => void
  onSkip: () => void
  copy?: StepCopy
}

export function FirstMenuStep({ onComplete, onSkip, copy }: FirstMenuStepProps) {
  const [menuName, setMenuName] = useState('')
  const [dishes, setDishes] = useState<string[]>(['', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function addDish() {
    if (dishes.length < 10) {
      setDishes([...dishes, ''])
    }
  }

  function updateDish(index: number, value: string) {
    const updated = [...dishes]
    updated[index] = value
    setDishes(updated)
  }

  function removeDish(index: number) {
    if (dishes.length > 1) {
      setDishes(dishes.filter((_, i) => i !== index))
    }
  }

  function handleSubmit() {
    if (!menuName.trim()) {
      setError('Give your menu a name')
      return
    }

    const filledDishes = dishes.filter((d) => d.trim())
    if (filledDishes.length === 0) {
      setError('Add at least one dish')
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        const courses = filledDishes.map((dishName, i) => ({
          course_label: `Course ${i + 1}`,
          dish_name: dishName.trim(),
        }))

        const result = await createMenuWithCourses({ name: menuName.trim() }, courses)

        if (result.menu) {
          onComplete({ menuId: result.menu.id, dishCount: filledDishes.length })
        } else {
          setError('Failed to create menu. Try again.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create menu')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          {copy?.title || 'Your first menu'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {copy?.description ||
            'Type in a menu name and a few dishes. You can edit everything later, add recipes, set pricing, and build out full courses. For now, get something on the board.'}
        </p>
      </div>

      {/* Menu name */}
      <div>
        <label htmlFor="menu-name" className="block text-sm font-medium text-foreground mb-1">
          Menu name
        </label>
        <input
          id="menu-name"
          type="text"
          value={menuName}
          onChange={(e) => setMenuName(e.target.value)}
          placeholder={
            copy?.placeholder
              ? `e.g. ${copy.placeholder}`
              : 'e.g. Summer Tasting Menu, Date Night, Holiday Dinner'
          }
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Dishes */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Dishes</label>
        <div className="space-y-2">
          {dishes.map((dish, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                {i + 1}.
              </span>
              <input
                type="text"
                value={dish}
                onChange={(e) => updateDish(i, e.target.value)}
                placeholder={
                  i === 0
                    ? 'e.g. Seared scallops with lemon butter'
                    : i === 1
                      ? 'e.g. Braised short rib'
                      : 'e.g. Chocolate lava cake'
                }
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {dishes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDish(i)}
                  className="text-muted-foreground hover:text-foreground p-1"
                  aria-label="Remove dish"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        {dishes.length < 10 && (
          <button
            type="button"
            onClick={addDish}
            className="mt-2 text-sm text-brand-500 hover:text-brand-400"
          >
            + Add another dish
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-md bg-orange-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-500 disabled:opacity-60"
        >
          {isPending ? 'Creating...' : 'Create Menu'}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Skip for now
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        You can add more menus, recipes, and costing details anytime from the Culinary section.
      </p>
    </div>
  )
}
