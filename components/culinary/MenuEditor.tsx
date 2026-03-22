'use client'

// MenuEditor - real, connected menu editor
// Displays a menu's course/component hierarchy and lets the chef build it out.
// All mutations go through lib/menus/actions.ts server actions.
// State is server-driven via revalidatePath - no local optimistic cache needed.

import { useState, useTransition, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  addDishToMenu,
  updateDish,
  deleteDish,
  addComponentToDish,
  updateComponent,
  deleteComponent,
} from '@/lib/menus/actions'
import { searchRecipes } from '@/lib/recipes/actions'
import {
  COMPONENT_CATEGORIES,
  TRANSPORT_CATEGORIES,
  PREP_DAY_OPTIONS,
  PREP_TIMES_OF_DAY,
  PREP_TIME_LABELS,
  PREP_STATION_SUGGESTIONS,
  type ComponentCategory,
  type TransportCategory,
  type PrepTimeOfDay,
} from '@/lib/menus/constants'
import type { getMenuById } from '@/lib/menus/actions'
import { getNextCourseNumber } from '@/lib/menus/course-utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type MenuFull = NonNullable<Awaited<ReturnType<typeof getMenuById>>>
type DishWithComponents = MenuFull['dishes'][number]
type Component = DishWithComponents['components'][number]

// ─── Constants ────────────────────────────────────────────────────────────────

const TRANSPORT_LABELS: Record<TransportCategory, string> = {
  cold: 'Cold (cooler)',
  frozen: 'Frozen (pack last)',
  room_temp: 'Room Temp (dry bag)',
  fragile: 'Fragile (own container)',
  liquid: 'Liquid (upright, sealed)',
}

const TRANSPORT_BADGE_COLORS: Record<
  TransportCategory,
  'default' | 'info' | 'warning' | 'error' | 'success'
> = {
  cold: 'info',
  frozen: 'info',
  room_temp: 'default',
  fragile: 'warning',
  liquid: 'warning',
}

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  sauce: 'Sauce',
  protein: 'Protein',
  starch: 'Starch',
  vegetable: 'Vegetable',
  fruit: 'Fruit',
  dessert: 'Dessert',
  garnish: 'Garnish',
  bread: 'Bread',
  cheese: 'Cheese',
  condiment: 'Condiment',
  beverage: 'Beverage',
  other: 'Other',
}

// ─── Empty form state ─────────────────────────────────────────────────────────

function emptyComponentForm() {
  return {
    name: '',
    category: 'other' as ComponentCategory,
    is_make_ahead: false,
    transport_category: 'room_temp' as TransportCategory,
    make_ahead_window_hours: '',
    execution_notes: '',
    storage_notes: '',
    portion_quantity: '',
    portion_unit: '',
    prep_day_offset: '' as string,
    prep_time_of_day: '' as string,
    prep_station: '',
    recipe_id: null as string | null,
  }
}

// Map recipe categories to component categories
const RECIPE_TO_COMPONENT_CAT: Record<string, ComponentCategory> = {
  sauce: 'sauce',
  protein: 'protein',
  starch: 'starch',
  vegetable: 'vegetable',
  fruit: 'fruit',
  dessert: 'dessert',
  bread: 'bread',
  pasta: 'starch',
  soup: 'other',
  salad: 'vegetable',
  appetizer: 'other',
  condiment: 'condiment',
  beverage: 'beverage',
  other: 'other',
}

type RecipeSummary = Awaited<ReturnType<typeof searchRecipes>>[number]

// ─── ComponentForm ────────────────────────────────────────────────────────────
// Reused for both add and edit

function ComponentForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  disabled,
}: {
  initial: ReturnType<typeof emptyComponentForm>
  onSubmit: (data: ReturnType<typeof emptyComponentForm>) => Promise<void>
  onCancel: () => void
  submitLabel: string
  disabled: boolean
}) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  // Recipe search state
  const [recipeQuery, setRecipeQuery] = useState('')
  const [recipeResults, setRecipeResults] = useState<RecipeSummary[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searching, startSearch] = useTransition()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const set = (key: keyof typeof form, value: string | boolean | null) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // Debounced recipe search
  useEffect(() => {
    if (recipeQuery.length < 2) {
      setRecipeResults([])
      setShowDropdown(false)
      return
    }
    const timer = setTimeout(() => {
      startSearch(async () => {
        try {
          const results = await searchRecipes(recipeQuery)
          setRecipeResults(results)
          setShowDropdown(results.length > 0)
        } catch {
          setRecipeResults([])
        }
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [recipeQuery])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelectRecipe = (recipe: RecipeSummary) => {
    setForm((prev) => ({
      ...prev,
      name: recipe.name,
      category: RECIPE_TO_COMPONENT_CAT[recipe.category] ?? 'other',
      recipe_id: recipe.id,
    }))
    setRecipeQuery(recipe.name)
    setShowDropdown(false)
  }

  const handleClearRecipe = () => {
    set('recipe_id', null)
    setRecipeQuery('')
    setRecipeResults([])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Component name is required')
      return
    }
    setError('')
    startTransition(async () => {
      try {
        await onSubmit(form)
      } catch (err: any) {
        setError(err.message || 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
      {error && (
        <p className="text-xs text-red-600 bg-red-950 border border-red-200 rounded px-2 py-1">
          {error}
        </p>
      )}

      {/* Recipe book search */}
      <div ref={dropdownRef} className="relative">
        <label className="block text-xs text-stone-500 mb-1">
          Link from recipe book{' '}
          <span className="text-stone-600">(optional - auto-fills name and costs)</span>
        </label>
        <div className="relative">
          <Input
            value={form.recipe_id ? recipeQuery : recipeQuery}
            onChange={(e) => {
              setRecipeQuery(e.target.value)
              if (form.recipe_id) set('recipe_id', null)
            }}
            placeholder="Search your recipes..."
            className="text-sm pr-8"
            disabled={disabled || pending}
          />
          {form.recipe_id && (
            <button
              type="button"
              onClick={handleClearRecipe}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-red-400 text-lg leading-none"
              title="Unlink recipe"
            >
              &times;
            </button>
          )}
        </div>
        {searching && <p className="text-xs text-stone-500 mt-1">Searching...</p>}
        {showDropdown && recipeResults.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-stone-800 border border-stone-600 rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
            {recipeResults.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                onClick={() => handleSelectRecipe(recipe)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-stone-700 border-b border-stone-700 last:border-0 flex items-center justify-between gap-2"
              >
                <div>
                  <span className="font-medium text-stone-100">{recipe.name}</span>
                  <span className="text-xs text-stone-400 ml-2 capitalize">{recipe.category}</span>
                </div>
                {recipe.cost_per_serving_cents != null && (
                  <span className="text-xs text-emerald-400 shrink-0">
                    ${(recipe.cost_per_serving_cents / 100).toFixed(2)}/serving
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {form.recipe_id && (
          <p className="text-xs text-emerald-400 mt-1">
            Recipe linked - ingredient costs will flow through automatically
          </p>
        )}
      </div>

      {/* Name + Category */}
      <div className="flex gap-2">
        <Input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Component name (e.g. Sherry Pan Sauce)"
          className="flex-1 text-sm"
          disabled={disabled || pending}
          autoFocus={!form.recipe_id}
        />
        <select
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
          title="Component category"
          className="text-sm border border-stone-600 rounded-lg px-2 py-1.5 bg-stone-900 text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          disabled={disabled || pending}
        >
          {COMPONENT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      {/* Portion per plate */}
      <div>
        <label className="block text-xs text-stone-500 mb-1">Portion per plate</label>
        <div className="flex gap-2">
          <Input
            type="number"
            value={form.portion_quantity}
            onChange={(e) => set('portion_quantity', e.target.value)}
            placeholder="120"
            min="0"
            step="any"
            className="w-24 text-sm"
            disabled={disabled || pending}
          />
          <Input
            value={form.portion_unit}
            onChange={(e) => set('portion_unit', e.target.value)}
            placeholder="g, oz, ml..."
            className="w-32 text-sm"
            disabled={disabled || pending}
          />
        </div>
      </div>

      {/* Make Ahead */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.is_make_ahead}
          onChange={(e) => set('is_make_ahead', e.target.checked)}
          disabled={disabled || pending}
          className="w-4 h-4 rounded border-stone-400 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm text-stone-300">Make-ahead (prep at home, transport to site)</span>
      </label>

      {/* Transport + Window - only visible when make_ahead */}
      {form.is_make_ahead && (
        <div className="flex gap-2 ml-6">
          <div className="flex-1">
            <label className="block text-xs text-stone-500 mb-1">Transport zone</label>
            <select
              value={form.transport_category}
              onChange={(e) => set('transport_category', e.target.value)}
              title="Transport zone"
              className="w-full text-sm border border-stone-600 rounded-lg px-2 py-1.5 bg-stone-900 text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              disabled={disabled || pending}
            >
              {TRANSPORT_CATEGORIES.map((tc) => (
                <option key={tc} value={tc}>
                  {TRANSPORT_LABELS[tc]}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-xs text-stone-500 mb-1">Lead time (hrs)</label>
            <Input
              type="number"
              value={form.make_ahead_window_hours}
              onChange={(e) => set('make_ahead_window_hours', e.target.value)}
              placeholder="e.g. 4"
              min="1"
              step="1"
              className="text-sm"
              disabled={disabled || pending}
            />
          </div>
        </div>
      )}

      {/* Execution notes */}
      <div>
        <label className="block text-xs text-stone-500 mb-1">On-site execution notes</label>
        <textarea
          value={form.execution_notes}
          onChange={(e) => set('execution_notes', e.target.value)}
          placeholder="What needs to happen when you arrive (e.g. Sear to order, finish with butter)"
          rows={2}
          disabled={disabled || pending}
          className="w-full text-sm border border-stone-600 rounded-lg px-3 py-2 bg-stone-900 text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      {/* Storage notes - only visible when make_ahead */}
      {form.is_make_ahead && (
        <div>
          <label className="block text-xs text-stone-500 mb-1">
            Storage notes (after prepping)
          </label>
          <textarea
            value={form.storage_notes}
            onChange={(e) => set('storage_notes', e.target.value)}
            placeholder="e.g. Refrigerate covered, up to 48h. Label with date."
            rows={2}
            disabled={disabled || pending}
            className="w-full text-sm border border-stone-600 rounded-lg px-3 py-2 bg-stone-900 text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>
      )}

      {/* Prep Timeline */}
      <div className="space-y-2">
        <label className="block text-xs text-stone-500">Prep timeline</label>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-stone-500 mb-1">Prep day</label>
            <select
              value={form.prep_day_offset}
              onChange={(e) => {
                const val = e.target.value
                set('prep_day_offset', val)
                // Auto-set make-ahead when prep is before day of service
                if (val !== '' && parseInt(val, 10) < 0) {
                  set('is_make_ahead', true)
                }
              }}
              title="Prep day offset"
              className="w-full text-sm border border-stone-600 rounded-lg px-2 py-1.5 bg-stone-900 text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              disabled={disabled || pending}
            >
              <option value="">-- select --</option>
              {PREP_DAY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-stone-500 mb-1">Time of day</label>
            <select
              value={form.prep_time_of_day}
              onChange={(e) => set('prep_time_of_day', e.target.value)}
              title="Prep time of day"
              className="w-full text-sm border border-stone-600 rounded-lg px-2 py-1.5 bg-stone-900 text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              disabled={disabled || pending}
            >
              <option value="">-- select --</option>
              {PREP_TIMES_OF_DAY.map((t) => (
                <option key={t} value={t}>
                  {PREP_TIME_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Prep station</label>
          <Input
            value={form.prep_station}
            onChange={(e) => set('prep_station', e.target.value)}
            placeholder="e.g. sauté, grill, pastry, cold"
            className="text-sm"
            disabled={disabled || pending}
            list="prep-station-suggestions"
          />
          <datalist id="prep-station-suggestions">
            {PREP_STATION_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={disabled || pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

// ─── ComponentRow ─────────────────────────────────────────────────────────────

function ComponentRow({
  component,
  locked,
  onDeleted,
}: {
  component: Component
  locked: boolean
  onDeleted: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [deleting, startDelete] = useTransition()
  const [showDeleteComponentConfirm, setShowDeleteComponentConfirm] = useState(false)

  const handleDelete = () => {
    setShowDeleteComponentConfirm(true)
  }

  const handleConfirmedDeleteComponent = () => {
    setShowDeleteComponentConfirm(false)
    startDelete(async () => {
      await deleteComponent(component.id)
      onDeleted()
    })
  }

  const handleEditSubmit = async (form: ReturnType<typeof emptyComponentForm>) => {
    await updateComponent(component.id, {
      name: form.name.trim(),
      category: form.category,
      recipe_id: form.recipe_id ?? null,
      is_make_ahead: form.is_make_ahead,
      transport_category: form.is_make_ahead
        ? (form.transport_category as TransportCategory)
        : null,
      make_ahead_window_hours:
        form.is_make_ahead && form.make_ahead_window_hours
          ? parseInt(form.make_ahead_window_hours, 10)
          : null,
      execution_notes: form.execution_notes.trim() || undefined,
      storage_notes:
        form.is_make_ahead && form.storage_notes.trim() ? form.storage_notes.trim() : undefined,
      portion_quantity: form.portion_quantity ? parseFloat(form.portion_quantity) : null,
      portion_unit: form.portion_unit.trim() || null,
      prep_day_offset: form.prep_day_offset !== '' ? parseInt(form.prep_day_offset, 10) : null,
      prep_time_of_day: (form.prep_time_of_day as PrepTimeOfDay) || null,
      prep_station: form.prep_station.trim() || null,
    })
    setEditing(false)
  }

  if (editing) {
    const tc = (component.transport_category ?? 'room_temp') as TransportCategory
    return (
      <div className="border border-brand-700 rounded-lg p-3 bg-brand-950">
        <ComponentForm
          initial={{
            name: component.name,
            category: (component.category ?? 'other') as ComponentCategory,
            is_make_ahead: component.is_make_ahead ?? false,
            transport_category: tc,
            make_ahead_window_hours: component.make_ahead_window_hours?.toString() ?? '',
            execution_notes: component.execution_notes ?? '',
            storage_notes: component.storage_notes ?? '',
            portion_quantity: (component as any).portion_quantity?.toString() ?? '',
            portion_unit: (component as any).portion_unit ?? '',
            prep_day_offset:
              (component as any).prep_day_offset != null
                ? (component as any).prep_day_offset.toString()
                : '',
            prep_time_of_day: (component as any).prep_time_of_day ?? '',
            prep_station: (component as any).prep_station ?? '',
            recipe_id: component.recipe_id ?? null,
          }}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditing(false)}
          submitLabel="Save"
          disabled={false}
        />
      </div>
    )
  }

  return (
    <>
      <div
        className={`flex items-start gap-3 py-2 px-1 rounded group ${deleting ? 'opacity-50' : ''}`}
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-stone-100">{component.name}</span>
            <Badge variant="default">
              {CATEGORY_LABELS[(component.category ?? 'other') as ComponentCategory]}
            </Badge>
            {component.is_make_ahead && (
              <Badge
                variant={
                  TRANSPORT_BADGE_COLORS[
                    (component.transport_category ?? 'room_temp') as TransportCategory
                  ]
                }
              >
                {
                  TRANSPORT_LABELS[
                    (component.transport_category ?? 'room_temp') as TransportCategory
                  ]
                }
              </Badge>
            )}
            {component.is_make_ahead && component.make_ahead_window_hours && (
              <span className="text-xs text-stone-400">
                {component.make_ahead_window_hours}h lead
              </span>
            )}
            {(component as any).portion_quantity && (
              <span className="text-xs text-stone-400">
                {(component as any).portion_quantity}
                {(component as any).portion_unit ?? ''}/plate
              </span>
            )}
          </div>
          {((component as any).prep_day_offset != null ||
            (component as any).prep_time_of_day ||
            (component as any).prep_station) && (
            <p className="text-xs text-stone-400 leading-relaxed">
              {[
                (component as any).prep_day_offset != null
                  ? (PREP_DAY_OPTIONS.find((o) => o.value === (component as any).prep_day_offset)
                      ?.label ?? `${Math.abs((component as any).prep_day_offset)} days before`)
                  : null,
                (component as any).prep_time_of_day
                  ? PREP_TIME_LABELS[(component as any).prep_time_of_day as PrepTimeOfDay]
                  : null,
                (component as any).prep_station
                  ? `${(component as any).prep_station} station`
                  : null,
              ]
                .filter(Boolean)
                .join(' \u00B7 ')}
            </p>
          )}
          {component.execution_notes && (
            <p className="text-xs text-stone-500 leading-relaxed">{component.execution_notes}</p>
          )}
        </div>
        {!locked && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-stone-400 hover:text-stone-300 px-2 py-1 rounded hover:bg-stone-700"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-red-400 hover:text-red-700 px-2 py-1 rounded hover:bg-red-950"
            >
              {deleting ? '…' : 'Delete'}
            </button>
          </div>
        )}
      </div>
      <ConfirmModal
        open={showDeleteComponentConfirm}
        title={`Delete "${component.name}"?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmedDeleteComponent}
        onCancel={() => setShowDeleteComponentConfirm(false)}
      />
    </>
  )
}

// ─── DishCard ─────────────────────────────────────────────────────────────────

function DishCard({
  dish,
  locked,
  onDeleted,
}: {
  dish: DishWithComponents
  locked: boolean
  onDeleted: () => void
}) {
  const [editingDish, setEditingDish] = useState(false)
  const [addingComponent, setAddingComponent] = useState(false)
  const [dishName, setDishName] = useState(dish.course_name)
  const [dishDesc, setDishDesc] = useState(dish.description ?? '')
  const [saving, startSave] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [showDeleteCourseConfirm, setShowDeleteCourseConfirm] = useState(false)
  // Force re-render after component mutations (so new components appear)
  const [, forceRefresh] = useState(0)

  const handleSaveDish = () => {
    startSave(async () => {
      await updateDish(dish.id, {
        course_name: dishName.trim() || dish.course_name,
        description: dishDesc.trim() || undefined,
      })
      setEditingDish(false)
    })
  }

  const handleDeleteDish = () => {
    setShowDeleteCourseConfirm(true)
  }

  const handleConfirmedDeleteCourse = () => {
    setShowDeleteCourseConfirm(false)
    startDelete(async () => {
      await deleteDish(dish.id)
      onDeleted()
    })
  }

  const handleAddComponent = async (form: ReturnType<typeof emptyComponentForm>) => {
    await addComponentToDish({
      dish_id: dish.id,
      name: form.name.trim(),
      category: form.category,
      scale_factor: 1,
      recipe_id: form.recipe_id ?? undefined,
      is_make_ahead: form.is_make_ahead,
      transport_category: form.is_make_ahead
        ? (form.transport_category as TransportCategory)
        : undefined,
      make_ahead_window_hours:
        form.is_make_ahead && form.make_ahead_window_hours
          ? parseInt(form.make_ahead_window_hours, 10)
          : undefined,
      execution_notes: form.execution_notes.trim() || undefined,
      storage_notes:
        form.is_make_ahead && form.storage_notes.trim() ? form.storage_notes.trim() : undefined,
      portion_quantity: form.portion_quantity ? parseFloat(form.portion_quantity) : undefined,
      portion_unit: form.portion_unit.trim() || undefined,
      prep_day_offset: form.prep_day_offset !== '' ? parseInt(form.prep_day_offset, 10) : undefined,
      prep_time_of_day: (form.prep_time_of_day as PrepTimeOfDay) || undefined,
      prep_station: form.prep_station.trim() || undefined,
    })
    setAddingComponent(false)
    forceRefresh((n) => n + 1)
  }

  return (
    <Card className={`${deleting ? 'opacity-50' : ''}`}>
      <CardContent className="p-4 space-y-3">
        {/* Course header */}
        <div className="flex items-start gap-3">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-widest w-16 mt-1 shrink-0">
            Course {dish.course_number}
          </span>
          <div className="flex-1 min-w-0">
            {editingDish ? (
              <div className="space-y-2">
                <Input
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  placeholder="Course name (e.g. Amuse-Bouche, First Course, Main)"
                  className="text-sm font-medium"
                  disabled={saving}
                  autoFocus
                />
                <Input
                  value={dishDesc}
                  onChange={(e) => setDishDesc(e.target.value)}
                  placeholder="Description (shown to client, optional)"
                  className="text-sm"
                  disabled={saving}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={handleSaveDish}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDishName(dish.course_name)
                      setDishDesc(dish.description ?? '')
                      setEditingDish(false)
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="group flex items-start gap-2">
                <div className="flex-1">
                  <p className="font-semibold text-stone-100">{dish.course_name}</p>
                  {dish.description && (
                    <p className="text-sm text-stone-500 mt-0.5">{dish.description}</p>
                  )}
                  {dish.allergen_flags && dish.allergen_flags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {dish.allergen_flags.map((flag: any) => (
                        <Badge key={flag} variant="error">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                {!locked && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingDish(true)}
                      className="text-xs text-stone-400 hover:text-stone-300 px-2 py-1 rounded hover:bg-stone-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteDish}
                      disabled={deleting}
                      className="text-xs text-red-400 hover:text-red-700 px-2 py-1 rounded hover:bg-red-950"
                    >
                      {deleting ? '…' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Components */}
        {dish.components.length > 0 && (
          <div className="border-t border-stone-800 pt-2 divide-y divide-stone-50">
            {dish.components.map((comp: any) => (
              <ComponentRow
                key={comp.id}
                component={comp}
                locked={locked}
                onDeleted={() => forceRefresh((n) => n + 1)}
              />
            ))}
          </div>
        )}

        {/* Add component */}
        {!locked && (
          <div className="pt-1">
            {addingComponent ? (
              <div className="border border-stone-700 rounded-lg p-3 bg-stone-800">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                  New component
                </p>
                <ComponentForm
                  initial={emptyComponentForm()}
                  onSubmit={handleAddComponent}
                  onCancel={() => setAddingComponent(false)}
                  submitLabel="Add"
                  disabled={false}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingComponent(true)}
                className="text-sm text-stone-400 hover:text-stone-300 border border-dashed border-stone-600 hover:border-stone-400 rounded-lg px-3 py-2 w-full text-left transition-colors"
              >
                + Add component
              </button>
            )}
          </div>
        )}

        <ConfirmModal
          open={showDeleteCourseConfirm}
          title={`Delete Course ${dish.course_number}?`}
          description="All components will also be deleted. This cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          loading={deleting}
          onConfirm={handleConfirmedDeleteCourse}
          onCancel={() => setShowDeleteCourseConfirm(false)}
        />
      </CardContent>
    </Card>
  )
}

// ─── MenuEditorClient ─────────────────────────────────────────────────────────

export function MenuEditorClient({ menu }: { menu: MenuFull }) {
  const locked = menu.status === 'locked'
  const [addingCourse, setAddingCourse] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [addingPending, startAdding] = useTransition()
  const [addError, setAddError] = useState('')
  // Force re-render after dish deletions
  const [, forceRefresh] = useState(0)

  const nextCourseNumber = getNextCourseNumber(
    (menu.dishes ?? []).map((dish: any) => dish.course_number)
  )

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCourseName.trim()) {
      setAddError('Course name is required')
      return
    }
    setAddError('')
    startAdding(async () => {
      try {
        await addDishToMenu({
          menu_id: menu.id,
          course_name: newCourseName.trim(),
          course_number: nextCourseNumber,
          sort_order: nextCourseNumber,
          dietary_tags: [],
          allergen_flags: [],
        })
        setNewCourseName('')
        setAddingCourse(false)
        forceRefresh((n) => n + 1)
      } catch (err: any) {
        setAddError(err.message || 'Failed to add course')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Menu header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">{menu.name}</h1>
          {menu.cuisine_type && (
            <p className="text-stone-500 text-sm mt-0.5">{menu.cuisine_type}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              menu.status === 'locked'
                ? 'error'
                : menu.status === 'shared'
                  ? 'info'
                  : menu.status === 'archived'
                    ? 'default'
                    : 'warning'
            }
          >
            {menu.status}
          </Badge>
          {menu.target_guest_count && (
            <span className="text-sm text-stone-500">{menu.target_guest_count} guests</span>
          )}
        </div>
      </div>

      {locked && (
        <div className="bg-amber-950 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800">
          This menu is locked. Unlock it by transitioning to draft before making changes.
        </div>
      )}

      {/* Course cards */}
      {menu.dishes && menu.dishes.length > 0 ? (
        menu.dishes.map((dish: any) => (
          <DishCard
            key={dish.id}
            dish={dish}
            locked={locked}
            onDeleted={() => forceRefresh((n) => n + 1)}
          />
        ))
      ) : (
        <div className="text-center py-10 text-stone-400 border border-dashed border-stone-700 rounded-xl">
          <p className="text-sm">No courses yet.</p>
          <p className="text-xs mt-1">Add the first course to start building this menu.</p>
        </div>
      )}

      {/* Add course */}
      {!locked && (
        <div>
          {addingCourse ? (
            <form
              onSubmit={handleAddCourse}
              className="border border-stone-700 rounded-xl p-4 space-y-2 bg-stone-900"
            >
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Course {nextCourseNumber}
              </p>
              {addError && <p className="text-xs text-red-600">{addError}</p>}
              <Input
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="Course name (e.g. Amuse-Bouche, Appetizer, Main, Dessert)"
                className="text-sm"
                disabled={addingPending}
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" variant="primary" disabled={addingPending}>
                  {addingPending ? 'Adding…' : 'Add Course'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNewCourseName('')
                    setAddingCourse(false)
                    setAddError('')
                  }}
                  disabled={addingPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAddingCourse(true)}
              className="w-full border-2 border-dashed border-stone-600 hover:border-brand-400 rounded-xl py-4 text-sm text-stone-400 hover:text-brand-600 transition-colors"
            >
              + Add Course {nextCourseNumber}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Keep default export for backwards compat with any existing import
export default MenuEditorClient
