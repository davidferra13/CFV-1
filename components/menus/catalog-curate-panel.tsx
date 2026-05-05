'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DISH_COURSES,
  DISH_COURSE_LABELS,
  DISH_COURSE_COLORS,
  DISH_COURSE_ICONS,
  type DishCourse,
} from '@/lib/menus/dish-index-constants'
import {
  createCatalogSelection,
  shareCatalogSelection,
  getAvailableCatalog,
} from '@/lib/menus/catalog-selection-actions'

interface CatalogDish {
  id: string
  name: string
  course: string
  description?: string | null
  dietary_tags?: string[]
  allergen_flags?: string[]
  is_signature?: boolean
  season_affinity?: string[]
  available_from?: string | null
  available_until?: string | null
}

interface Client {
  id: string
  name: string
}

interface CatalogCuratePanelProps {
  initialDishes: CatalogDish[]
  clients?: Client[]
  preSelectedIds?: string[]
  onComplete?: (result: { selectionId: string; shareUrl?: string }) => void
  onClose?: () => void
}

export function CatalogCuratePanel({
  initialDishes,
  clients = [],
  preSelectedIds = [],
  onComplete,
  onClose,
}: CatalogCuratePanelProps) {
  const [dishes, setDishes] = useState<CatalogDish[]>(initialDishes)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(preSelectedIds))
  const [selectionName, setSelectionName] = useState('')
  const [description, setDescription] = useState('')
  const [clientId, setClientId] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [search, setSearch] = useState('')
  const [step, setStep] = useState<'pick' | 'details' | 'done'>('pick')
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filter dishes client-side for responsiveness
  const filteredDishes = dishes.filter((d) => {
    if (courseFilter && d.course !== courseFilter) return false
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Group by course
  const grouped = filteredDishes.reduce<Record<string, CatalogDish[]>>((acc, dish) => {
    const key = dish.course || 'other'
    if (!acc[key]) acc[key] = []
    acc[key].push(dish)
    return acc
  }, {})

  const toggleDish = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredDishes.map((d) => d.id)))
  }, [filteredDishes])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleCreateAndShare = useCallback(() => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one dish')
      return
    }
    if (!selectionName.trim()) {
      toast.error('Name your selection')
      return
    }

    startTransition(async () => {
      try {
        const result = await createCatalogSelection({
          name: selectionName.trim(),
          description: description.trim() || undefined,
          clientId: clientId || undefined,
          dishIds: Array.from(selectedIds),
        })

        const sel = result.selection
        toast.success(`Selection "${selectionName}" created with ${selectedIds.size} courses`)

        // Auto-share
        const shareResult = await shareCatalogSelection(sel.id, 30)
        setShareUrl(shareResult.url)

        // Copy to clipboard
        try {
          await navigator.clipboard.writeText(shareResult.url)
          toast.success('Share link copied to clipboard')
        } catch {
          // Clipboard may not be available
        }

        setStep('done')
        onComplete?.({ selectionId: sel.id, shareUrl: shareResult.url })
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to create selection')
      }
    })
  }, [selectedIds, selectionName, description, clientId, onComplete])

  const handleSaveDraft = useCallback(() => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one dish')
      return
    }
    if (!selectionName.trim()) {
      toast.error('Name your selection')
      return
    }

    startTransition(async () => {
      try {
        const result = await createCatalogSelection({
          name: selectionName.trim(),
          description: description.trim() || undefined,
          clientId: clientId || undefined,
          dishIds: Array.from(selectedIds),
        })
        toast.success(`Draft saved: ${selectedIds.size} courses`)
        onComplete?.({ selectionId: result.selection.id })
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to save draft')
      }
    })
  }, [selectedIds, selectionName, description, clientId, onComplete])

  if (step === 'done' && shareUrl) {
    return (
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-200">Selection Shared</h2>
        <p className="text-sm text-stone-400">
          {selectedIds.size} courses ready for your client. Link expires in 30 days.
        </p>
        <div className="bg-stone-800 rounded-lg p-3 flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            aria-label="Share URL"
            className="flex-1 bg-transparent text-sm text-stone-300 outline-none"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(shareUrl)
              toast.success('Copied')
            }}
          >
            Copy
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </Card>
    )
  }

  if (step === 'details') {
    return (
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-200">Send {selectedIds.size} Courses</h2>

        <div>
          <label className="text-sm text-stone-400 block mb-1">Selection Name</label>
          <input
            type="text"
            value={selectionName}
            onChange={(e) => setSelectionName(e.target.value)}
            placeholder="e.g. Summer 2026 Options, June Dinner Menu"
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="text-sm text-stone-400 block mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A note for your client about this selection..."
            rows={2}
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 outline-none focus:border-brand-500 resize-none"
          />
        </div>

        {clients.length > 0 && (
          <div>
            <label htmlFor="curate-client" className="text-sm text-stone-400 block mb-1">
              Client (optional)
            </label>
            <select
              id="curate-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 outline-none focus:border-brand-500"
            >
              <option value="">No specific client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="text-xs text-stone-500">
          {selectedIds.size} courses selected across{' '}
          {new Set(dishes.filter((d) => selectedIds.has(d.id)).map((d) => d.course)).size} course
          types
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setStep('pick')}>
            Back
          </Button>
          <Button onClick={handleCreateAndShare} disabled={isPending || !selectionName.trim()}>
            {isPending ? 'Creating...' : 'Create & Share Link'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            disabled={isPending || !selectionName.trim()}
          >
            Save Draft
          </Button>
        </div>
      </Card>
    )
  }

  // Step: pick
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-stone-200">Pick Courses to Send</h2>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search dishes..."
          className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-200 outline-none focus:border-brand-500 w-48"
        />
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          aria-label="Filter by course"
          className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-200 outline-none"
        >
          <option value="">All courses</option>
          {DISH_COURSES.map((c) => (
            <option key={c} value={c}>
              {DISH_COURSE_LABELS[c]}
            </option>
          ))}
        </select>
        <Button variant="secondary" size="sm" onClick={selectAll}>
          Select All
        </Button>
        <Button variant="secondary" size="sm" onClick={deselectAll}>
          Clear
        </Button>
      </div>

      {/* Selection counter */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-stone-400">
          {selectedIds.size} of {dishes.length} courses selected
        </span>
        {selectedIds.size > 0 && (
          <Button size="sm" onClick={() => setStep('details')}>
            Next: Send {selectedIds.size} Courses
          </Button>
        )}
      </div>

      {/* Dishes grouped by course */}
      {Object.entries(grouped)
        .sort(([a], [b]) => {
          const order = DISH_COURSES as readonly string[]
          return order.indexOf(a) - order.indexOf(b)
        })
        .map(([course, courseDishes]) => (
          <div key={course}>
            <div
              className={`flex items-center gap-2 mb-2 pb-1.5 border-b ${DISH_COURSE_COLORS[course as DishCourse]?.border || 'border-stone-800'}`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${DISH_COURSE_COLORS[course as DishCourse]?.stripe || 'bg-stone-600'}`}
              />
              <span className="text-sm">{DISH_COURSE_ICONS[course as DishCourse] || '📋'}</span>
              <h3
                className={`text-xs font-semibold uppercase tracking-wider ${DISH_COURSE_COLORS[course as DishCourse]?.text || 'text-stone-500'}`}
              >
                {DISH_COURSE_LABELS[course as DishCourse] || course}
              </h3>
              <span className="text-[10px] text-stone-600">
                {courseDishes.filter((d) => selectedIds.has(d.id)).length}/{courseDishes.length}
              </span>
            </div>
            <div className="space-y-1">
              {courseDishes.map((dish) => (
                <button
                  key={dish.id}
                  type="button"
                  onClick={() => toggleDish(dish.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-start gap-3 ${
                    selectedIds.has(dish.id)
                      ? 'bg-brand-900/30 border border-brand-700/50'
                      : 'bg-stone-800/50 border border-transparent hover:bg-stone-800'
                  }`}
                >
                  <div
                    className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                      selectedIds.has(dish.id)
                        ? 'bg-brand-500 border-brand-500'
                        : 'border-stone-600'
                    }`}
                  >
                    {selectedIds.has(dish.id) && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
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
                      {dish.is_signature && <span className="text-brand-400 text-xs">★</span>}
                      <span className="text-sm text-stone-200">{dish.name}</span>
                    </div>
                    {dish.description && (
                      <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                        {dish.description}
                      </p>
                    )}
                    {dish.dietary_tags && dish.dietary_tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {dish.dietary_tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xxs bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

      {/* Bottom action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 bg-stone-900/95 backdrop-blur border-t border-stone-800 -mx-4 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-stone-300">
            {selectedIds.size} courses selected
          </span>
          <Button onClick={() => setStep('details')}>Next: Send {selectedIds.size} Courses</Button>
        </div>
      )}
    </div>
  )
}
