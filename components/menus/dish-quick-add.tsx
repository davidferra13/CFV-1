'use client'

import { useState, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createDishIndexEntry } from '@/lib/menus/dish-index-actions'
import { DISH_COURSES, DISH_COURSE_LABELS } from '@/lib/menus/dish-index-constants'

interface DishQuickAddProps {
  onDishAdded: () => void
}

export function DishQuickAdd({ onDishAdded }: DishQuickAddProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [course, setCourse] = useState<string>('entrée')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState(0)
  const nameRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!name.trim()) return

      setSaving(true)
      setError(null)

      try {
        const result = await createDishIndexEntry({
          name: name.trim(),
          course,
          description: description.trim() || undefined,
        } as any)

        if (result && 'error' in result) {
          setError(result.error as string)
          setSaving(false)
          return
        }

        setSuccessCount((c) => c + 1)
        setName('')
        setDescription('')
        setSaving(false)
        onDishAdded()
        // Focus name input for rapid entry
        nameRef.current?.focus()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add dish')
        setSaving(false)
      }
    },
    [name, course, description, onDishAdded]
  )

  if (!isOpen) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setIsOpen(true)}>
        + Quick Add
      </Button>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-stone-300">Quick Add Dishes</h3>
        <div className="flex items-center gap-2">
          {successCount > 0 && <span className="text-xs text-green-500">{successCount} added</span>}
          <button
            onClick={() => {
              setIsOpen(false)
              setSuccessCount(0)
            }}
            className="text-stone-500 hover:text-stone-300 text-sm"
          >
            Close
          </button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="quick-dish-name" className="text-xs text-stone-500 mb-1 block">
            Dish Name
          </label>
          <input
            ref={nameRef}
            id="quick-dish-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pan-Seared Diver Scallops"
            className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-200 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="quick-dish-course" className="text-xs text-stone-500 mb-1 block">
            Course
          </label>
          <select
            id="quick-dish-course"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-300"
          >
            {DISH_COURSES.map((c) => (
              <option key={c} value={c}>
                {DISH_COURSE_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label htmlFor="quick-dish-desc" className="text-xs text-stone-500 mb-1 block">
            Description (optional)
          </label>
          <input
            id="quick-dish-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="with cauliflower purée"
            className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-200 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
          />
        </div>
        <Button type="submit" size="sm" disabled={saving || !name.trim()}>
          {saving ? 'Adding...' : 'Add'}
        </Button>
      </form>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      <p className="text-xs text-stone-600 mt-2">
        Press Enter to add and keep typing - build your index from memory
      </p>
    </Card>
  )
}
