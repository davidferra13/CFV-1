'use client'

// MenuDocEditor — Google Doc-style menu editor
// Two-panel layout: document (left) + event context sidebar (right).
// All fields auto-save with 1.5s debounce. No explicit save button needed.
// Simple Mode toggle lets chef bypass structured editor entirely.

import { useState, useRef, useCallback, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { DishPhotoUpload } from '@/components/dishes/dish-photo-upload'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  updateMenuMeta,
  updateDishEditorContent,
  addEditorCourse,
  deleteEditorCourse,
  reorderEditorCourse,
  type EditorMenu,
  type EditorDish,
  type EditorEvent,
  type PreviousMenu,
} from '@/lib/menus/editor-actions'
import { sendMenuForApproval } from '@/lib/events/menu-approval-actions'
import { CocktailBrowserPanel } from '@/components/menus/cocktail-browser-panel'

// ─── Constants ────────────────────────────────────────────────────────────────

const COURSE_SUGGESTIONS = [
  'Amuse-Bouche',
  'Canapés',
  'First Course',
  'Soup',
  'Salad',
  'Intermezzo',
  'Fish Course',
  'Main Course',
  'Cheese Course',
  'Pre-Dessert',
  'Dessert',
  'Petit Fours',
]

const DIETARY_TAG_OPTIONS = [
  { label: 'GF', title: 'Gluten-Free' },
  { label: 'DF', title: 'Dairy-Free' },
  { label: 'V', title: 'Vegetarian' },
  { label: 'VG', title: 'Vegan' },
  { label: 'NF', title: 'Nut-Free' },
  { label: 'SF', title: 'Shellfish-Free' },
  { label: 'EF', title: 'Egg-Free' },
  { label: 'KO', title: 'Kosher' },
  { label: 'HA', title: 'Halal' },
]

const ALLERGEN_OPTIONS = [
  { label: 'Shellfish', short: 'SH' },
  { label: 'Dairy', short: 'DA' },
  { label: 'Eggs', short: 'EG' },
  { label: 'Tree Nuts', short: 'TN' },
  { label: 'Peanuts', short: 'PN' },
  { label: 'Soy', short: 'SY' },
  { label: 'Fish', short: 'FI' },
  { label: 'Gluten', short: 'GL' },
  { label: 'Sesame', short: 'SE' },
]

const SERVICE_STYLE_LABELS: Record<string, string> = {
  plated: 'Plated',
  family_style: 'Family Style',
  buffet: 'Buffet',
  cocktail: 'Cocktail',
  tasting_menu: 'Tasting Menu',
  other: 'Other',
}

const CUISINE_SUGGESTIONS = [
  'American',
  'Italian',
  'French',
  'Japanese',
  'Mediterranean',
  'Mexican',
  'Indian',
  'Thai',
  'Chinese',
  'Greek',
  'Spanish',
  'Middle Eastern',
  'Farm-to-Table',
  'Modern American',
  'Seasonal Local',
  'New American',
  'Pan-Asian',
  'Latin',
  'Nordic',
  'Fusion',
]

// ─── Season utility ───────────────────────────────────────────────────────────

function getSeason(dateStr: string) {
  const m = new Date(dateStr).getMonth() + 1
  if (m >= 3 && m <= 5)
    return {
      label: 'Spring',
      emoji: '🌿',
      ingredients: 'Asparagus · Peas · Ramps · Morels · Artichokes · Mint · Radishes',
    }
  if (m >= 6 && m <= 8)
    return {
      label: 'Summer',
      emoji: '☀️',
      ingredients: 'Heirloom Tomatoes · Corn · Zucchini · Peaches · Basil · Blueberries · Lobster',
    }
  if (m >= 9 && m <= 11)
    return {
      label: 'Fall',
      emoji: '🍂',
      ingredients:
        'Butternut Squash · Porcini · Apples · Pears · Beets · Brussels Sprouts · Chestnuts',
    }
  return {
    label: 'Winter',
    emoji: '❄️',
    ingredients: 'Citrus · Root Vegetables · Cabbage · Blood Oranges · Truffles · Clams · Celeriac',
  }
}

// ─── Auto-save hook ───────────────────────────────────────────────────────────

type SaveState = 'saved' | 'pending' | 'saving' | 'error'

function useAutoSave() {
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const scheduleSave = useCallback((key: string, fn: () => Promise<void>) => {
    if (timers.current[key]) clearTimeout(timers.current[key])
    setSaveState('pending')
    timers.current[key] = setTimeout(async () => {
      setSaveState('saving')
      try {
        await fn()
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }, 1500)
  }, [])

  useEffect(() => {
    const t = timers.current
    return () => {
      Object.values(t).forEach(clearTimeout)
    }
  }, [])

  return { saveState, scheduleSave }
}

// ─── AutoTextarea ─────────────────────────────────────────────────────────────

function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
  minRows = 1,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  minRows?: number
  disabled?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = ref.current.scrollHeight + 'px'
    }
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={minRows}
      className={`resize-none overflow-hidden ${className ?? ''}`}
    />
  )
}

// ─── CourseBlock ──────────────────────────────────────────────────────────────

function CourseBlock({
  dish,
  locked,
  menuId,
  isFirst,
  isLast,
  onDelete,
  onUpdate,
  onMoveUp,
  onMoveDown,
  scheduleSave,
}: {
  dish: EditorDish
  locked: boolean
  menuId: string
  isFirst: boolean
  isLast: boolean
  onDelete: (id: string) => void
  onUpdate: (id: string, data: Partial<EditorDish>) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  scheduleSave: (key: string, fn: () => Promise<void>) => void
}) {
  const [courseName, setCourseName] = useState(dish.course_name)
  const [dishName, setDishName] = useState(dish.name ?? '')
  const [description, setDescription] = useState(dish.description ?? '')
  const [chefNotes, setChefNotes] = useState(dish.chef_notes ?? '')
  const [dietaryTags, setDietaryTags] = useState<string[]>(dish.dietary_tags)
  const [allergenFlags, setAllergenFlags] = useState<string[]>(dish.allergen_flags)
  const [beveragePairing, setBeveragePairing] = useState(dish.beverage_pairing ?? '')
  const [beveragePairingNotes, setBeveragePairingNotes] = useState(
    dish.beverage_pairing_notes ?? ''
  )
  const [platingInstructions, setPlatingInstructions] = useState(dish.plating_instructions ?? '')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [showAllergenPicker, setShowAllergenPicker] = useState(false)
  const [deleting, startDelete] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(dish.photo_url)

  const saveField = (field: string, data: Partial<EditorDish>) => {
    onUpdate(dish.id, data)
    scheduleSave(`dish-${dish.id}-${field}`, () => updateDishEditorContent(dish.id, data))
  }

  const toggleTag = (tag: string) => {
    const next = dietaryTags.includes(tag)
      ? dietaryTags.filter((t) => t !== tag)
      : [...dietaryTags, tag]
    setDietaryTags(next)
    saveField('tags', { dietary_tags: next })
  }

  const toggleAllergen = (short: string) => {
    const next = allergenFlags.includes(short)
      ? allergenFlags.filter((f) => f !== short)
      : [...allergenFlags, short]
    setAllergenFlags(next)
    saveField('allergens', { allergen_flags: next })
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmedDelete = () => {
    setShowDeleteConfirm(false)
    startDelete(async () => {
      await deleteEditorCourse(dish.id, menuId)
      onDelete(dish.id)
    })
  }

  return (
    <div className={`group relative ${deleting ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* Reorder + delete controls (appear on hover) */}
      {!locked && (
        <div className="absolute -right-8 top-0 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onMoveUp(dish.id)}
            disabled={isFirst}
            className="w-6 h-6 flex items-center justify-center text-stone-300 hover:text-stone-400 disabled:opacity-20 disabled:cursor-not-allowed text-base leading-none"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(dish.id)}
            disabled={isLast}
            className="w-6 h-6 flex items-center justify-center text-stone-300 hover:text-stone-400 disabled:opacity-20 disabled:cursor-not-allowed text-base leading-none"
            title="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="w-6 h-6 flex items-center justify-center text-stone-300 hover:text-red-400 text-xl leading-none mt-0.5"
            title="Remove course"
          >
            ×
          </button>
        </div>
      )}

      {/* Course label row */}
      <div className="relative mb-1">
        {!locked ? (
          <>
            <input
              value={courseName}
              onChange={(e) => {
                setCourseName(e.target.value)
                saveField('course_name', { course_name: e.target.value })
                // Only show suggestions when field is empty
                setShowSuggestions(e.target.value.length === 0)
              }}
              onFocus={() => {
                if (!courseName) setShowSuggestions(true)
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="COURSE TYPE"
              className="w-full text-xs font-bold tracking-[0.15em] uppercase text-stone-400 bg-transparent border-none outline-none focus:text-stone-400 placeholder:text-stone-300 py-0 leading-none"
            />
            {showSuggestions && (
              <div className="absolute left-0 top-full z-10 bg-stone-900 border border-stone-700 rounded-lg shadow-lg mt-1 py-1 min-w-[180px] max-h-48 overflow-y-auto">
                {COURSE_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => {
                      setCourseName(s)
                      saveField('course_name', { course_name: s })
                      setShowSuggestions(false)
                    }}
                    className="block w-full text-left px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400 hover:bg-stone-800"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <span className="text-xs font-bold tracking-[0.15em] uppercase text-stone-400">
            {courseName}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-stone-700 mb-4" />

      {/* Dish name + photo thumbnail */}
      <div className="flex gap-3 items-start">
        <div className="flex-1 min-w-0">
          {!locked ? (
            <AutoTextarea
              value={dishName}
              onChange={(v) => {
                setDishName(v)
                saveField('name', { name: v || null })
              }}
              placeholder="Dish name…"
              minRows={1}
              className="w-full text-xl font-semibold text-stone-100 bg-transparent border-none outline-none placeholder:text-stone-300 leading-tight mb-1 py-0 block"
            />
          ) : (
            <p className="text-xl font-semibold text-stone-100 leading-tight mb-1">
              {dishName || <span className="text-stone-300 italic text-base">Unnamed dish</span>}
            </p>
          )}

          {/* Description */}
          {!locked ? (
            <AutoTextarea
              value={description}
              onChange={(v) => {
                setDescription(v)
                saveField('description', { description: v || null })
              }}
              placeholder="Ingredients, preparation, flavour notes — shown to client…"
              minRows={2}
              className="w-full text-sm text-stone-500 italic bg-transparent border-none outline-none placeholder:text-stone-300 leading-relaxed mb-2 py-0 block"
            />
          ) : (
            description && (
              <p className="text-sm text-stone-500 italic leading-relaxed mb-2">{description}</p>
            )
          )}
        </div>

        {/* Dish photo thumbnail — click to add or replace */}
        <DishPhotoUpload
          compact
          entityType="dish"
          entityId={dish.id}
          currentPhotoUrl={photoUrl}
          onPhotoChange={setPhotoUrl}
        />
      </div>

      {/* Dietary tags row — Accommodates */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {dietaryTags.map((tag) => (
          <button
            type="button"
            key={tag}
            onClick={() => !locked && toggleTag(tag)}
            title={DIETARY_TAG_OPTIONS.find((t) => t.label === tag)?.title ?? tag}
            className={`text-xs font-semibold px-2 py-0.5 rounded-full border transition-colors ${
              locked
                ? 'border-emerald-200 text-emerald-700 bg-emerald-950 cursor-default'
                : 'border-emerald-200 text-emerald-700 bg-emerald-950 hover:border-red-300 hover:text-red-500 hover:bg-red-950 cursor-pointer'
            }`}
          >
            {tag}
          </button>
        ))}
        {!locked && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowTagPicker((p) => !p)
                setShowAllergenPicker(false)
              }}
              className="text-xs text-stone-400 hover:text-stone-400 border border-dashed border-stone-600 hover:border-stone-400 px-2 py-0.5 rounded-full transition-colors"
            >
              + tag
            </button>
            {showTagPicker && (
              <div className="absolute left-0 top-full mt-1 z-10 bg-stone-900 border border-stone-700 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 min-w-[210px]">
                <p className="w-full text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1 px-0.5">
                  Accommodates
                </p>
                {DIETARY_TAG_OPTIONS.map(({ label, title }) => (
                  <button
                    type="button"
                    key={label}
                    onMouseDown={() => toggleTag(label)}
                    title={title}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                      dietaryTags.includes(label)
                        ? 'border-emerald-400 bg-emerald-900 text-emerald-800'
                        : 'border-stone-700 text-stone-400 hover:border-stone-400 hover:bg-stone-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Allergen flags row — Contains */}
      {(allergenFlags.length > 0 || !locked) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {allergenFlags.map((short) => {
            const allergenLabel = ALLERGEN_OPTIONS.find((a) => a.short === short)?.label ?? short
            return (
              <button
                type="button"
                key={short}
                onClick={() => !locked && toggleAllergen(short)}
                title={`Contains ${allergenLabel} — click to remove`}
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                  locked
                    ? 'border-orange-200 text-orange-700 bg-orange-950 cursor-default'
                    : 'border-orange-200 text-orange-700 bg-orange-950 hover:border-red-300 hover:text-red-500 hover:bg-red-950 cursor-pointer'
                }`}
              >
                ⚠ {allergenLabel}
              </button>
            )
          })}
          {!locked && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowAllergenPicker((p) => !p)
                  setShowTagPicker(false)
                }}
                className="text-xs text-orange-400 hover:text-orange-600 border border-dashed border-orange-200 hover:border-orange-400 px-2 py-0.5 rounded-full transition-colors"
              >
                + allergen
              </button>
              {showAllergenPicker && (
                <div className="absolute left-0 top-full mt-1 z-10 bg-stone-900 border border-stone-700 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 min-w-[220px]">
                  <p className="w-full text-[10px] font-semibold uppercase tracking-widest text-orange-400 mb-1 px-0.5">
                    Contains
                  </p>
                  {ALLERGEN_OPTIONS.map(({ label, short }) => (
                    <button
                      type="button"
                      key={short}
                      onMouseDown={() => toggleAllergen(short)}
                      title={label}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                        allergenFlags.includes(short)
                          ? 'border-orange-400 bg-orange-900 text-orange-800'
                          : 'border-stone-700 text-stone-400 hover:border-orange-300 hover:bg-orange-950'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Beverage Pairing */}
      {!locked ? (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400 mb-1 px-3 flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 22h8" />
              <path d="M12 17v5" />
              <path d="M7 2h10l-2 9a5 5 0 0 1-3 4 5 5 0 0 1-3-4L7 2z" />
            </svg>
            Pairing
          </p>
          <input
            value={beveragePairing}
            onChange={(e) => {
              setBeveragePairing(e.target.value)
              saveField('beverage_pairing', { beverage_pairing: e.target.value || null })
            }}
            placeholder="e.g. 2022 Sancerre, Negroni..."
            className="w-full text-xs text-purple-300 bg-purple-950/40 border-none outline-none placeholder:text-purple-400/40 rounded-lg px-3 py-2 leading-relaxed mb-1.5"
          />
          <AutoTextarea
            value={beveragePairingNotes}
            onChange={(v) => {
              setBeveragePairingNotes(v)
              saveField('beverage_pairing_notes', { beverage_pairing_notes: v || null })
            }}
            placeholder="Why this pairing..."
            minRows={1}
            className="w-full text-xs text-purple-300/70 bg-purple-950/40 border-none outline-none placeholder:text-purple-400/40 rounded-lg px-3 py-2 leading-relaxed block"
          />
        </div>
      ) : (
        (beveragePairing || beveragePairingNotes) && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400 mb-1 flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 22h8" />
                <path d="M12 17v5" />
                <path d="M7 2h10l-2 9a5 5 0 0 1-3 4 5 5 0 0 1-3-4L7 2z" />
              </svg>
              Pairing
            </p>
            {beveragePairing && (
              <p className="text-xs text-purple-300 bg-purple-950/40 rounded-lg px-3 py-2 leading-relaxed">
                {beveragePairing}
              </p>
            )}
            {beveragePairingNotes && (
              <p className="text-xs text-purple-300/70 bg-purple-950/40 rounded-lg px-3 py-2 leading-relaxed mt-1.5">
                {beveragePairingNotes}
              </p>
            )}
          </div>
        )
      )}

      {/* Chef-only notes */}
      {!locked ? (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500 mb-1 px-3">
            Internal notes
          </p>
          <AutoTextarea
            value={chefNotes}
            onChange={(v) => {
              setChefNotes(v)
              saveField('chef_notes', { chef_notes: v || null })
            }}
            placeholder="Allergens to watch, timing, techniques, client preferences…"
            minRows={1}
            className="w-full text-xs text-amber-700 bg-amber-950 border-none outline-none placeholder:text-amber-300 rounded-lg px-3 py-2 leading-relaxed block"
          />
        </div>
      ) : (
        chefNotes && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500 mb-1">
              Internal notes
            </p>
            <p className="text-xs text-amber-700 bg-amber-950 rounded-lg px-3 py-2 leading-relaxed">
              {chefNotes}
            </p>
          </div>
        )
      )}

      {/* Plating Instructions */}
      {!locked ? (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-400 mb-1 px-3">
            Plating
          </p>
          <AutoTextarea
            value={platingInstructions}
            onChange={(v) => {
              setPlatingInstructions(v)
              saveField('plating_instructions', { plating_instructions: v || null })
            }}
            placeholder="Describe the plate: smear, stack, dot, garnish..."
            minRows={1}
            className="w-full text-xs text-sky-300 bg-sky-950/40 border-none outline-none placeholder:text-sky-400/40 rounded-lg px-3 py-2 leading-relaxed block"
          />
        </div>
      ) : (
        platingInstructions && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-400 mb-1">
              Plating
            </p>
            <p className="text-xs text-sky-300 bg-sky-950/40 rounded-lg px-3 py-2 leading-relaxed">
              {platingInstructions}
            </p>
          </div>
        )
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        title={`Remove "${courseName}" course?`}
        description="This cannot be undone."
        confirmLabel="Remove"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmedDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}

// ─── AddCourseRow ─────────────────────────────────────────────────────────────

function AddCourseRow({
  nextCourseNumber,
  menuId,
  onAdded,
}: {
  nextCourseNumber: number
  menuId: string
  onAdded: (dish: EditorDish) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [adding, startAdd] = useTransition()
  const [error, setError] = useState('')

  const handleAdd = (courseName: string) => {
    if (!courseName.trim()) {
      setError('Course name required')
      return
    }
    setError('')
    startAdd(async () => {
      try {
        const dish = await addEditorCourse(menuId, {
          course_name: courseName.trim(),
          course_number: nextCourseNumber,
        })
        onAdded(dish)
        setName('')
        setOpen(false)
      } catch (e: any) {
        setError(e.message || 'Failed to add course')
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-stone-700 hover:border-brand-600 rounded-xl py-5 text-sm text-stone-400 hover:text-brand-600 transition-colors mt-4"
      >
        + Add Course
      </button>
    )
  }

  return (
    <div className="mt-4 border border-stone-700 rounded-xl p-5 space-y-4 bg-stone-800">
      <p className="text-xs font-bold uppercase tracking-widest text-stone-400">New Course</p>
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-1.5">
        {COURSE_SUGGESTIONS.map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => handleAdd(s)}
            disabled={adding}
            className="text-xs px-3 py-1.5 rounded-full border border-stone-700 text-stone-400 bg-stone-900 hover:border-brand-400 hover:text-brand-400 hover:bg-brand-950 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-stone-700" />
        <span className="text-xs text-stone-400">or type custom name</span>
        <div className="h-px flex-1 bg-stone-700" />
      </div>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd(name)}
          placeholder="Custom course name…"
          disabled={adding}
          autoFocus
          className="flex-1 text-sm border border-stone-600 rounded-lg px-3 py-2 bg-stone-900 text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="button"
          onClick={() => handleAdd(name)}
          disabled={adding || !name.trim()}
          className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {adding ? '…' : 'Add'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setName('')
            setError('')
          }}
          disabled={adding}
          className="px-3 py-2 text-sm text-stone-500 hover:text-stone-300 rounded-lg hover:bg-stone-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── ContextSidebar ───────────────────────────────────────────────────────────

function ContextSidebar({
  event,
  previousMenus,
  pricePerPerson,
  onPriceChange,
  locked,
  onCocktailSelect,
}: {
  event: EditorEvent | null
  previousMenus: PreviousMenu[]
  pricePerPerson: string
  onPriceChange: (v: string) => void
  locked: boolean
  onCocktailSelect?: (cocktail: {
    name: string
    glass: string
    ingredients: string
    instructions: string
    thumbnail: string
    alcoholic: boolean
  }) => void
}) {
  const season = event ? getSeason(event.event_date) : null
  const [sending, startSend] = useTransition()
  const [sendResult, setSendResult] = useState<'sent' | 'error' | null>(null)

  const allergyText = [event?.client?.dietary_restrictions, event?.client?.allergies]
    .filter(Boolean)
    .join(' · ')

  const handleSendForApproval = () => {
    if (!event) return
    startSend(async () => {
      try {
        await sendMenuForApproval(event.id)
        setSendResult('sent')
      } catch {
        setSendResult('error')
      }
    })
  }

  return (
    <div className="sticky top-16 space-y-3 text-sm">
      {/* Event panel */}
      {event ? (
        <div className="bg-stone-900 rounded-xl border border-stone-700 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Event</p>
            <Link href={`/events/${event.id}`} className="text-xs text-brand-600 hover:underline">
              View →
            </Link>
          </div>
          <p className="font-semibold text-stone-100 mb-1">{event.occasion || 'Private Dinner'}</p>
          <p className="text-stone-400 text-xs">
            {format(new Date(event.event_date), 'EEE, MMM d yyyy')}
            {event.event_time && ` · ${event.event_time}`}
          </p>
          {event.guest_count && (
            <p className="text-stone-400 text-xs mt-0.5">
              <span className="font-semibold">{event.guest_count}</span> guests
            </p>
          )}
          {(event.venue_name || event.venue_address) && (
            <p className="text-stone-400 text-xs mt-1 truncate">
              {event.venue_name || event.venue_address}
            </p>
          )}

          {/* Send for approval */}
          {!locked && (
            <div className="mt-3 pt-3 border-t border-stone-800">
              {sendResult === 'sent' ? (
                <p className="text-xs text-emerald-600 font-medium">Menu sent to client ✓</p>
              ) : sendResult === 'error' ? (
                <p className="text-xs text-red-500">Failed to send — try from event page</p>
              ) : (
                <button
                  type="button"
                  onClick={handleSendForApproval}
                  disabled={sending}
                  className="w-full text-xs py-1.5 px-3 rounded-lg border border-brand-700 text-brand-400 bg-brand-950 hover:bg-brand-900 hover:border-brand-600 transition-colors disabled:opacity-50 font-medium"
                >
                  {sending ? 'Sending…' : 'Send menu for approval'}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-stone-800 rounded-xl border border-dashed border-stone-700 p-4 text-center">
          <p className="text-xs text-stone-400 font-medium">No event linked</p>
          <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
            Attach this menu to an event for full context
          </p>
        </div>
      )}

      {/* Client panel */}
      {event?.client && (
        <div className="bg-stone-900 rounded-xl border border-stone-700 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Client</p>
          <p className="font-semibold text-stone-100">{event.client.full_name || 'Client'}</p>
          {allergyText ? (
            <div className="bg-amber-950 border border-amber-200 rounded-lg px-3 py-2 mt-2">
              <p className="text-xs font-semibold text-amber-800 mb-0.5">Dietary needs</p>
              <p className="text-xs text-amber-700 leading-relaxed">{allergyText}</p>
            </div>
          ) : (
            <p className="text-xs text-stone-400 mt-1">No dietary restrictions on file</p>
          )}
        </div>
      )}

      {/* Season panel */}
      {season && (
        <div className="bg-stone-900 rounded-xl border border-stone-700 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Season</p>
          <p className="font-semibold text-stone-100 mb-1">
            {season.emoji} {season.label}
          </p>
          <p className="text-xs text-stone-500 leading-relaxed">{season.ingredients}</p>
        </div>
      )}

      {/* Cocktail Browser panel */}
      {!locked && <CocktailBrowserPanel onSelectCocktail={onCocktailSelect} />}

      {/* Pricing panel */}
      <div className="bg-stone-900 rounded-xl border border-stone-700 p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Pricing</p>
        {!locked ? (
          <div className="flex items-baseline gap-1">
            <span className="text-stone-400 text-base">$</span>
            <input
              type="number"
              value={pricePerPerson}
              onChange={(e) => onPriceChange(e.target.value)}
              placeholder="0"
              min="0"
              step="5"
              className="text-2xl font-bold text-stone-100 border-none outline-none bg-transparent w-20 p-0 focus:ring-0"
            />
            <span className="text-stone-500 text-sm">/ person</span>
          </div>
        ) : (
          <p className="text-2xl font-bold text-stone-100">
            {pricePerPerson ? (
              `$${Number(pricePerPerson).toLocaleString()} / person`
            ) : (
              <span className="text-stone-300">—</span>
            )}
          </p>
        )}
        {event?.quoted_price_cents != null && event.guest_count && (
          <p className="text-xs text-stone-400 mt-1">
            Event quote: ${(event.quoted_price_cents / 100 / event.guest_count).toFixed(0)}/person
          </p>
        )}
      </div>

      {/* Previous menus */}
      {previousMenus.length > 0 && (
        <div className="bg-stone-900 rounded-xl border border-stone-700 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">
            Previous Menus
          </p>
          <div className="space-y-1">
            {previousMenus.map((m) => (
              <Link
                key={m.id}
                href={`/menus/${m.id}/editor`}
                className="block hover:bg-stone-800 rounded-lg py-1.5 px-2 -mx-2 transition-colors group"
              >
                <p className="text-sm font-medium text-stone-200 group-hover:text-brand-400 truncate">
                  {m.name}
                </p>
                <p className="text-xs text-stone-400">
                  {m.cuisine_type && `${m.cuisine_type} · `}
                  {m.event_date
                    ? format(new Date(m.event_date), 'MMM yyyy')
                    : format(new Date(m.created_at), 'MMM yyyy')}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MenuDocEditor (main export) ──────────────────────────────────────────────

export function MenuDocEditor({
  menu: initialMenu,
  event,
  previousMenus,
}: {
  menu: EditorMenu
  event: EditorEvent | null
  previousMenus: PreviousMenu[]
}) {
  const router = useRouter()
  const { saveState, scheduleSave } = useAutoSave()
  const locked = initialMenu.status === 'locked'

  // Menu-level state
  const [menuName, setMenuName] = useState(initialMenu.name)
  const [cuisineType, setCuisineType] = useState(initialMenu.cuisine_type ?? '')
  const [serviceStyle, setServiceStyle] = useState(initialMenu.service_style ?? '')
  const [guestCount, setGuestCount] = useState(initialMenu.target_guest_count?.toString() ?? '')
  const [pricePerPerson, setPricePerPerson] = useState(
    initialMenu.price_per_person_cents ? (initialMenu.price_per_person_cents / 100).toString() : ''
  )
  const [simpleMode, setSimpleMode] = useState(initialMenu.simple_mode)
  const [simpleContent, setSimpleContent] = useState(initialMenu.simple_mode_content ?? '')
  const [dishes, setDishes] = useState<EditorDish[]>(
    [...initialMenu.dishes].sort((a, b) => a.sort_order - b.sort_order)
  )
  const [showCuisineSuggestions, setShowCuisineSuggestions] = useState(false)

  const saveMenuMeta = useCallback(
    (data: Parameters<typeof updateMenuMeta>[1]) => {
      const key = 'menu-meta-' + Object.keys(data).sort().join(',')
      scheduleSave(key, () => updateMenuMeta(initialMenu.id, data))
    },
    [initialMenu.id, scheduleSave]
  )

  // ─── Field handlers ──────────────────────────────────────────────────────────

  const handleMenuName = (v: string) => {
    setMenuName(v)
    if (v.trim()) saveMenuMeta({ name: v.trim() })
  }

  const handleCuisineType = (v: string) => {
    setCuisineType(v)
    saveMenuMeta({ cuisine_type: v || null })
  }

  const handleServiceStyle = (v: string) => {
    setServiceStyle(v)
    saveMenuMeta({ service_style: v || null })
  }

  const handleGuestCount = (v: string) => {
    setGuestCount(v)
    const n = parseInt(v)
    saveMenuMeta({ target_guest_count: isNaN(n) || n <= 0 ? null : n })
  }

  const handlePricePerPerson = (v: string) => {
    setPricePerPerson(v)
    const n = parseFloat(v)
    saveMenuMeta({ price_per_person_cents: isNaN(n) || n <= 0 ? null : Math.round(n * 100) })
  }

  const handleSimpleModeToggle = () => {
    const next = !simpleMode
    setSimpleMode(next)
    saveMenuMeta({ simple_mode: next })
  }

  const handleSimpleContent = (v: string) => {
    setSimpleContent(v)
    saveMenuMeta({ simple_mode_content: v || null })
  }

  const handleDishUpdate = (id: string, data: Partial<EditorDish>) => {
    setDishes((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)))
  }

  const handleDishDelete = (id: string) => {
    setDishes((prev) => prev.filter((d) => d.id !== id))
  }

  const handleCourseAdded = (dish: EditorDish) => {
    setDishes((prev) => [...prev, dish])
  }

  // ─── Cocktail pairing ──────────────────────────────────────────────────────

  const handleCocktailSelect = useCallback(
    (cocktail: {
      name: string
      glass: string
      ingredients: string
      instructions: string
      thumbnail: string
      alcoholic: boolean
    }) => {
      // Add a new "Drinks" course with the cocktail as the dish
      const courseNum = dishes.length > 0 ? Math.max(...dishes.map((d) => d.course_number)) + 1 : 1
      const addCocktailCourse = async () => {
        try {
          const dish = await addEditorCourse(initialMenu.id, {
            course_name: 'Drinks',
            course_number: courseNum,
          })
          // Fill in the dish details with cocktail info
          const updates: Partial<EditorDish> = {
            name: cocktail.name,
            description: `${cocktail.glass}${cocktail.alcoholic ? '' : ' (Non-alcoholic)'}. ${cocktail.ingredients}`,
            beverage_pairing: cocktail.name,
            beverage_pairing_notes: `Served in ${cocktail.glass}. ${cocktail.instructions}`,
          }
          await updateDishEditorContent(dish.id, updates)
          setDishes((prev) => [...prev, { ...dish, ...updates }])
        } catch (err) {
          console.error('[non-blocking] Failed to add cocktail course', err)
        }
      }
      addCocktailCourse()
    },
    [initialMenu.id, dishes]
  )

  // ─── Course reordering ───────────────────────────────────────────────────────

  const handleMoveUp = useCallback(
    (dishId: string) => {
      setDishes((prev) => {
        const sorted = [...prev].sort((a, b) => a.sort_order - b.sort_order)
        const idx = sorted.findIndex((d) => d.id === dishId)
        if (idx <= 0) return prev
        // Swap sort_order values optimistically
        const result = sorted.map((d) => ({ ...d }))
        const tmp = result[idx].sort_order
        result[idx].sort_order = result[idx - 1].sort_order
        result[idx - 1].sort_order = tmp
        return result.sort((a, b) => a.sort_order - b.sort_order)
      })
      // Fire server action (best-effort, page reload will correct any mismatch)
      reorderEditorCourse(initialMenu.id, dishId, 'up').catch(console.error)
    },
    [initialMenu.id]
  )

  const handleMoveDown = useCallback(
    (dishId: string) => {
      setDishes((prev) => {
        const sorted = [...prev].sort((a, b) => a.sort_order - b.sort_order)
        const idx = sorted.findIndex((d) => d.id === dishId)
        if (idx === -1 || idx >= sorted.length - 1) return prev
        const result = sorted.map((d) => ({ ...d }))
        const tmp = result[idx].sort_order
        result[idx].sort_order = result[idx + 1].sort_order
        result[idx + 1].sort_order = tmp
        return result.sort((a, b) => a.sort_order - b.sort_order)
      })
      reorderEditorCourse(initialMenu.id, dishId, 'down').catch(console.error)
    },
    [initialMenu.id]
  )

  // ─── Save indicator ──────────────────────────────────────────────────────────

  const { text: saveText, color: saveColor } = {
    saved: { text: 'All changes saved', color: 'text-stone-400' },
    pending: { text: 'Unsaved…', color: 'text-amber-500' },
    saving: { text: 'Saving…', color: 'text-stone-400' },
    error: { text: 'Save failed', color: 'text-red-500' },
  }[saveState]

  const sortedDishes = [...dishes].sort((a, b) => a.sort_order - b.sort_order)

  const nextCourseNumber =
    dishes.length > 0 ? Math.max(...dishes.map((d) => d.course_number)) + 1 : 1

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-stone-800">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-stone-900 border-b border-stone-700 px-6 py-2.5 flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push(`/menus/${initialMenu.id}`)}
          className="text-sm text-stone-500 hover:text-stone-200 transition-colors"
        >
          ← Back
        </button>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-stone-300 truncate hidden sm:block">
            {menuName || 'Untitled Menu'}
          </span>
        </div>

        <span className={`text-xs ${saveColor} transition-colors shrink-0`}>{saveText}</span>

        {/* Status badge */}
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${
            locked
              ? 'border-amber-300 bg-amber-950 text-amber-700'
              : initialMenu.status === 'shared'
                ? 'border-blue-300 bg-blue-950 text-blue-700'
                : initialMenu.status === 'archived'
                  ? 'border-stone-600 bg-stone-800 text-stone-500'
                  : 'border-stone-700 bg-stone-900 text-stone-400'
          }`}
        >
          {initialMenu.status.charAt(0).toUpperCase() + initialMenu.status.slice(1)}
        </span>

        {/* Simple mode toggle */}
        <button
          type="button"
          onClick={handleSimpleModeToggle}
          title={
            simpleMode
              ? 'Switch back to structured course editor'
              : 'Write freeform or paste menu text'
          }
          className={`text-xs px-3 py-1 rounded-full border transition-colors shrink-0 ${
            simpleMode
              ? 'border-brand-400 bg-brand-950 text-brand-400 font-medium'
              : 'border-stone-700 text-stone-500 hover:border-stone-400 hover:text-stone-300'
          }`}
        >
          {simpleMode ? 'Exit freeform' : 'Freeform text'}
        </button>
      </div>

      {/* Main layout */}
      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-6 items-start">
        {/* ─── Document ─── */}
        <div className="flex-1 min-w-0">
          <div className="bg-stone-900 shadow-xl rounded-xl p-10 min-h-[calc(100vh-8rem)]">
            {/* Title */}
            {!locked ? (
              <AutoTextarea
                value={menuName}
                onChange={handleMenuName}
                placeholder="Menu title…"
                minRows={1}
                className="w-full text-[2rem] leading-tight font-bold text-stone-100 bg-transparent border-none outline-none placeholder:text-stone-300 mb-1 py-0 block"
              />
            ) : (
              <h1 className="text-[2rem] leading-tight font-bold text-stone-100 mb-1">
                {menuName}
              </h1>
            )}

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 mb-10 pb-6 border-b border-stone-800">
              {/* Cuisine */}
              <div className="relative">
                {!locked ? (
                  <>
                    <input
                      value={cuisineType}
                      onChange={(e) => handleCuisineType(e.target.value)}
                      onFocus={() => setShowCuisineSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowCuisineSuggestions(false), 150)}
                      placeholder="Cuisine type"
                      className="text-sm text-stone-500 border-b border-dashed border-stone-600 bg-transparent outline-none focus:border-brand-400 focus:text-stone-200 pb-0.5 min-w-[100px] max-w-[180px] transition-colors"
                    />
                    {showCuisineSuggestions && (
                      <div className="absolute left-0 top-full z-10 bg-stone-900 border border-stone-700 rounded-lg shadow-lg mt-1 py-1 max-h-48 overflow-y-auto min-w-[160px]">
                        {CUISINE_SUGGESTIONS.filter(
                          (s) => !cuisineType || s.toLowerCase().includes(cuisineType.toLowerCase())
                        ).map((s) => (
                          <button
                            type="button"
                            key={s}
                            onMouseDown={() => {
                              handleCuisineType(s)
                              setShowCuisineSuggestions(false)
                            }}
                            className="block w-full text-left px-3 py-1.5 text-sm text-stone-400 hover:bg-stone-800"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  cuisineType && <span className="text-sm text-stone-500">{cuisineType}</span>
                )}
              </div>

              {cuisineType && serviceStyle && <span className="text-stone-300 text-sm">·</span>}

              {/* Service style */}
              {!locked ? (
                <select
                  value={serviceStyle}
                  onChange={(e) => handleServiceStyle(e.target.value)}
                  title="Service style"
                  className="text-sm text-stone-500 border-b border-dashed border-stone-600 bg-transparent outline-none focus:border-brand-400 pb-0.5 appearance-none cursor-pointer transition-colors"
                >
                  <option value="">Service style</option>
                  {Object.entries(SERVICE_STYLE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              ) : (
                serviceStyle && (
                  <span className="text-sm text-stone-500">
                    {SERVICE_STYLE_LABELS[serviceStyle] || serviceStyle}
                  </span>
                )
              )}

              {(cuisineType || serviceStyle) && guestCount && (
                <span className="text-stone-300 text-sm">·</span>
              )}

              {/* Guest count */}
              {!locked ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={guestCount}
                    onChange={(e) => handleGuestCount(e.target.value)}
                    placeholder="—"
                    min="1"
                    className="text-sm text-stone-500 border-b border-dashed border-stone-600 bg-transparent outline-none focus:border-brand-400 w-10 pb-0.5 transition-colors"
                  />
                  <span className="text-sm text-stone-400">guests</span>
                </div>
              ) : (
                guestCount && <span className="text-sm text-stone-500">{guestCount} guests</span>
              )}
            </div>

            {/* ── Simple mode ── */}
            {simpleMode ? (
              <div className="space-y-4">
                <div className="bg-blue-950 border border-blue-200 rounded-lg px-4 py-3 flex items-start gap-3">
                  <span className="text-blue-500 text-lg leading-none">✎</span>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Freeform text mode</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Write your menu as freeform text or paste it in directly. Switch back anytime
                      — your structured courses will still be there.
                    </p>
                  </div>
                </div>
                <textarea
                  value={simpleContent}
                  onChange={(e) => handleSimpleContent(e.target.value)}
                  disabled={locked}
                  placeholder={`Write your menu here…\n\nSTARTER\nAutumn Beet Salad — goat cheese, candied walnuts, honey vinaigrette\n\nMAIN\nGrass-fed Filet Mignon — truffle jus, pommes purée, haricots verts\n\nDESSERT\nValrhona Chocolate Fondant — crème anglaise, raspberry coulis`}
                  className="w-full min-h-[420px] text-sm text-stone-300 bg-stone-800 border border-stone-700 rounded-xl px-6 py-5 outline-none focus:ring-2 focus:ring-brand-700 leading-relaxed font-mono resize-none"
                />
              </div>
            ) : (
              /* ── Structured editor ── */
              <div className="space-y-10">
                {dishes.length === 0 && !locked && (
                  <div className="text-center py-16 text-stone-400 border-2 border-dashed border-stone-700 rounded-xl">
                    <p className="text-base font-medium mb-1">No courses yet</p>
                    <p className="text-sm">
                      Add your first course below to start building the menu
                    </p>
                  </div>
                )}
                {locked && dishes.length === 0 && (
                  <p className="text-center text-stone-400 py-16">No courses on this menu.</p>
                )}

                {sortedDishes.map((dish, idx) => (
                  <CourseBlock
                    key={dish.id}
                    dish={dish}
                    locked={locked}
                    menuId={initialMenu.id}
                    isFirst={idx === 0}
                    isLast={idx === sortedDishes.length - 1}
                    onDelete={handleDishDelete}
                    onUpdate={handleDishUpdate}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    scheduleSave={scheduleSave}
                  />
                ))}

                {!locked && (
                  <AddCourseRow
                    nextCourseNumber={nextCourseNumber}
                    menuId={initialMenu.id}
                    onAdded={handleCourseAdded}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── Sidebar ─── */}
        <div className="w-72 shrink-0">
          <ContextSidebar
            event={event}
            previousMenus={previousMenus}
            pricePerPerson={pricePerPerson}
            onPriceChange={handlePricePerPerson}
            locked={locked}
            onCocktailSelect={handleCocktailSelect}
          />
        </div>
      </div>
    </div>
  )
}
