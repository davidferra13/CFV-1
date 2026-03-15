'use client'

// TastingMenuForm - Create/edit tasting menus with course progression
// Handles header fields + ordered course list with up/down reordering

import { useState, useTransition } from 'react'
import {
  createTastingMenu,
  updateTastingMenu,
  addCourse,
  updateCourse,
  removeCourse,
  reorderCourses,
  type TastingMenuWithCourses,
  type TastingMenuInput,
  type CourseInput,
  type CourseType,
  type PortionSize,
  type TastingMenuCourse,
} from '@/lib/menus/tasting-menu-actions'

// ─── Constants ──────────────────────────────────────────────────────────────────

const COURSE_TYPES: { value: CourseType; label: string; color: string }[] = [
  { value: 'amuse_bouche', label: 'Amuse-Bouche', color: 'bg-purple-100 text-purple-800' },
  { value: 'appetizer', label: 'Appetizer', color: 'bg-blue-100 text-blue-800' },
  { value: 'soup', label: 'Soup', color: 'bg-amber-100 text-amber-800' },
  { value: 'salad', label: 'Salad', color: 'bg-green-100 text-green-800' },
  { value: 'fish', label: 'Fish', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'intermezzo', label: 'Intermezzo', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'main', label: 'Main', color: 'bg-red-100 text-red-800' },
  { value: 'cheese', label: 'Cheese', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'pre_dessert', label: 'Pre-Dessert', color: 'bg-pink-100 text-pink-800' },
  { value: 'dessert', label: 'Dessert', color: 'bg-rose-100 text-rose-800' },
  { value: 'mignardise', label: 'Mignardise', color: 'bg-fuchsia-100 text-fuchsia-800' },
]

const PORTION_SIZES: { value: PortionSize; label: string }[] = [
  { value: 'bite', label: 'Bite' },
  { value: 'small', label: 'Small' },
  { value: 'standard', label: 'Standard' },
]

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'Year-Round']

function getCourseColor(type: CourseType): string {
  return COURSE_TYPES.find((ct) => ct.value === type)?.color ?? 'bg-gray-100 text-gray-800'
}

// ─── Types ──────────────────────────────────────────────────────────────────────

type LocalCourse = CourseInput & { _localId: string; id?: string }

type Props = {
  menu?: TastingMenuWithCourses
  onSaved?: (id: string) => void
  onCancel?: () => void
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function TastingMenuForm({ menu, onSaved, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Header fields
  const [name, setName] = useState(menu?.name ?? '')
  const [description, setDescription] = useState(menu?.description ?? '')
  const [courseCount, setCourseCount] = useState(menu?.course_count ?? 5)
  const [pricePerPerson, setPricePerPerson] = useState(
    menu?.price_per_person_cents ? (menu.price_per_person_cents / 100).toFixed(2) : ''
  )
  const [wineUpcharge, setWineUpcharge] = useState(
    menu?.wine_pairing_upcharge_cents ? (menu.wine_pairing_upcharge_cents / 100).toFixed(2) : ''
  )
  const [occasion, setOccasion] = useState(menu?.occasion ?? '')
  const [season, setSeason] = useState(menu?.season ?? '')

  // Courses
  const [courses, setCourses] = useState<LocalCourse[]>(
    menu?.courses.map((c) => ({
      _localId: c.id,
      id: c.id,
      course_number: c.course_number,
      course_type: c.course_type,
      dish_name: c.dish_name,
      description: c.description,
      recipe_id: c.recipe_id,
      wine_pairing: c.wine_pairing,
      pairing_notes: c.pairing_notes,
      portion_size: c.portion_size,
      prep_notes: c.prep_notes,
    })) ?? []
  )

  const isEditing = !!menu

  function getMenuInput(): TastingMenuInput {
    return {
      name: name.trim(),
      description: description.trim() || null,
      course_count: courseCount,
      price_per_person_cents: pricePerPerson ? Math.round(parseFloat(pricePerPerson) * 100) : null,
      wine_pairing_upcharge_cents: wineUpcharge ? Math.round(parseFloat(wineUpcharge) * 100) : null,
      occasion: occasion.trim() || null,
      season: season || null,
    }
  }

  function addNewCourse() {
    const nextNumber = courses.length + 1
    // Suggest the next course type in the standard progression
    const suggestedType = COURSE_TYPES[Math.min(nextNumber - 1, COURSE_TYPES.length - 1)].value

    setCourses((prev) => [
      ...prev,
      {
        _localId: crypto.randomUUID(),
        course_number: nextNumber,
        course_type: suggestedType,
        dish_name: '',
        description: null,
        recipe_id: null,
        wine_pairing: null,
        pairing_notes: null,
        portion_size: 'small',
        prep_notes: null,
      },
    ])
  }

  function removeCourseLocal(localId: string) {
    setCourses((prev) => {
      const filtered = prev.filter((c) => c._localId !== localId)
      // Renumber
      return filtered.map((c, i) => ({ ...c, course_number: i + 1 }))
    })
  }

  function updateCourseLocal(localId: string, field: string, value: string | null) {
    setCourses((prev) =>
      prev.map((c) => (c._localId === localId ? { ...c, [field]: value } : c))
    )
  }

  function moveCourse(localId: string, direction: 'up' | 'down') {
    setCourses((prev) => {
      const idx = prev.findIndex((c) => c._localId === localId)
      if (idx < 0) return prev
      if (direction === 'up' && idx === 0) return prev
      if (direction === 'down' && idx === prev.length - 1) return prev

      const next = [...prev]
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]

      // Renumber
      return next.map((c, i) => ({ ...c, course_number: i + 1 }))
    })
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Menu name is required')
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        let menuId = menu?.id

        if (isEditing && menuId) {
          await updateTastingMenu(menuId, getMenuInput())

          // Handle course changes: remove deleted, update existing, add new
          const existingIds = new Set(courses.filter((c) => c.id).map((c) => c.id!))
          const originalIds = menu.courses.map((c) => c.id)

          // Remove courses that were deleted
          for (const origId of originalIds) {
            if (!existingIds.has(origId)) {
              await removeCourse(origId)
            }
          }

          // Update existing + add new
          for (const course of courses) {
            if (course.id) {
              await updateCourse(course.id, {
                course_number: course.course_number,
                course_type: course.course_type,
                dish_name: course.dish_name,
                description: course.description,
                recipe_id: course.recipe_id,
                wine_pairing: course.wine_pairing,
                pairing_notes: course.pairing_notes,
                portion_size: course.portion_size,
                prep_notes: course.prep_notes,
              })
            } else if (course.dish_name.trim()) {
              await addCourse(menuId, {
                course_number: course.course_number,
                course_type: course.course_type,
                dish_name: course.dish_name,
                description: course.description,
                recipe_id: course.recipe_id,
                wine_pairing: course.wine_pairing,
                pairing_notes: course.pairing_notes,
                portion_size: course.portion_size,
                prep_notes: course.prep_notes,
              })
            }
          }

          // Reorder
          const orderedIds = courses.filter((c) => c.id).map((c) => c.id!)
          if (orderedIds.length > 0) {
            await reorderCourses(menuId, orderedIds)
          }
        } else {
          const result = await createTastingMenu(getMenuInput())
          menuId = result.id

          // Add courses
          for (const course of courses) {
            if (course.dish_name.trim()) {
              await addCourse(menuId, {
                course_number: course.course_number,
                course_type: course.course_type,
                dish_name: course.dish_name,
                description: course.description,
                recipe_id: course.recipe_id,
                wine_pairing: course.wine_pairing,
                pairing_notes: course.pairing_notes,
                portion_size: course.portion_size,
                prep_notes: course.prep_notes,
              })
            }
          }
        }

        onSaved?.(menuId!)
      } catch (err) {
        console.error('[TastingMenuForm] Save error:', err)
        setError(err instanceof Error ? err.message : 'Failed to save tasting menu')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          {isEditing ? 'Edit Tasting Menu' : 'New Tasting Menu'}
        </h2>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Menu Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Spring Tasting Experience"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="A journey through seasonal flavors..."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Row: course count, price, wine upcharge */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Course Count</label>
            <input
              type="number"
              min={1}
              max={20}
              value={courseCount}
              onChange={(e) => setCourseCount(parseInt(e.target.value) || 5)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Price per Person ($)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={pricePerPerson}
              onChange={(e) => setPricePerPerson(e.target.value)}
              placeholder="0.00"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Wine Pairing Upcharge ($)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={wineUpcharge}
              onChange={(e) => setWineUpcharge(e.target.value)}
              placeholder="0.00"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Row: occasion, season */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Occasion</label>
            <input
              type="text"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="e.g. Anniversary, Birthday, Wine Dinner"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Season</label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select season...</option>
              {SEASONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Courses */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Courses ({courses.length})
          </h3>
          <button
            type="button"
            onClick={addNewCourse}
            className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            + Add Course
          </button>
        </div>

        {courses.length === 0 && (
          <p className="text-sm text-gray-500 italic">
            No courses yet. Click "Add Course" to start building your tasting menu.
          </p>
        )}

        <div className="space-y-3">
          {courses.map((course, idx) => (
            <div
              key={course._localId}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              {/* Course header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-500">
                    #{course.course_number}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getCourseColor(course.course_type)}`}
                  >
                    {COURSE_TYPES.find((ct) => ct.value === course.course_type)?.label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveCourse(course._localId, 'up')}
                    disabled={idx === 0}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                    title="Move up"
                  >
                    &#x25B2;
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCourse(course._localId, 'down')}
                    disabled={idx === courses.length - 1}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                    title="Move down"
                  >
                    &#x25BC;
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCourseLocal(course._localId)}
                    className="ml-2 rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                    title="Remove course"
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* Course fields */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Course Type</label>
                  <select
                    value={course.course_type}
                    onChange={(e) =>
                      updateCourseLocal(course._localId, 'course_type', e.target.value)
                    }
                    className="mt-0.5 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {COURSE_TYPES.map((ct) => (
                      <option key={ct.value} value={ct.value}>
                        {ct.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Dish Name *</label>
                  <input
                    type="text"
                    value={course.dish_name}
                    onChange={(e) =>
                      updateCourseLocal(course._localId, 'dish_name', e.target.value)
                    }
                    placeholder="e.g. Seared Scallop with Citrus Beurre Blanc"
                    className="mt-0.5 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600">Description</label>
                  <input
                    type="text"
                    value={course.description ?? ''}
                    onChange={(e) =>
                      updateCourseLocal(
                        course._localId,
                        'description',
                        e.target.value || null
                      )
                    }
                    placeholder="Brief description of the dish"
                    className="mt-0.5 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Wine Pairing</label>
                  <input
                    type="text"
                    value={course.wine_pairing ?? ''}
                    onChange={(e) =>
                      updateCourseLocal(
                        course._localId,
                        'wine_pairing',
                        e.target.value || null
                      )
                    }
                    placeholder="e.g. 2022 Sancerre, Loire Valley"
                    className="mt-0.5 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Portion Size</label>
                  <select
                    value={course.portion_size ?? 'small'}
                    onChange={(e) =>
                      updateCourseLocal(course._localId, 'portion_size', e.target.value)
                    }
                    className="mt-0.5 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {PORTION_SIZES.map((ps) => (
                      <option key={ps.value} value={ps.value}>
                        {ps.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600">Pairing Notes</label>
                  <input
                    type="text"
                    value={course.pairing_notes ?? ''}
                    onChange={(e) =>
                      updateCourseLocal(
                        course._localId,
                        'pairing_notes',
                        e.target.value || null
                      )
                    }
                    placeholder="Why this pairing works..."
                    className="mt-0.5 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600">Prep Notes</label>
                  <input
                    type="text"
                    value={course.prep_notes ?? ''}
                    onChange={(e) =>
                      updateCourseLocal(
                        course._localId,
                        'prep_notes',
                        e.target.value || null
                      )
                    }
                    placeholder="Timing, plating, temperature notes..."
                    className="mt-0.5 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !name.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : isEditing ? 'Update Menu' : 'Create Menu'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
