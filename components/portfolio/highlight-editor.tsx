'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Edit2, X, GripVertical } from '@/components/ui/icons'
import {
  createHighlight,
  updateHighlight,
  deleteHighlight,
} from '@/lib/portfolio/highlight-actions'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HighlightItem {
  id: string
  title: string
  category: 'events' | 'behind_scenes' | 'testimonials' | 'press'
  items: string[]
  displayOrder: number
}

interface HighlightEditorProps {
  highlights: HighlightItem[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  events: 'Events',
  behind_scenes: 'Behind the Scenes',
  testimonials: 'Testimonials',
  press: 'Press',
}

const CATEGORY_BADGE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> =
  {
    events: 'info',
    behind_scenes: 'warning',
    testimonials: 'success',
    press: 'default',
  }

const CATEGORY_OPTIONS: { value: HighlightItem['category']; label: string }[] = [
  { value: 'events', label: 'Events' },
  { value: 'behind_scenes', label: 'Behind the Scenes' },
  { value: 'testimonials', label: 'Testimonials' },
  { value: 'press', label: 'Press' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function HighlightEditor({ highlights: initialHighlights }: HighlightEditorProps) {
  const [highlights, setHighlights] = useState<HighlightItem[]>(initialHighlights)
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formCategory, setFormCategory] = useState<HighlightItem['category']>('events')
  const [formItems, setFormItems] = useState<string[]>([''])

  function resetForm() {
    setFormTitle('')
    setFormCategory('events')
    setFormItems([''])
    setEditingId(null)
    setShowAddForm(false)
  }

  function startEdit(highlight: HighlightItem) {
    setEditingId(highlight.id)
    setFormTitle(highlight.title)
    setFormCategory(highlight.category)
    setFormItems(highlight.items.length > 0 ? highlight.items : [''])
    setShowAddForm(false)
  }

  function startAdd() {
    resetForm()
    setShowAddForm(true)
  }

  function handleAddFormItem() {
    setFormItems((prev) => [...prev, ''])
  }

  function handleUpdateFormItem(index: number, value: string) {
    setFormItems((prev) => prev.map((item, i) => (i === index ? value : item)))
  }

  function handleRemoveFormItem(index: number) {
    setFormItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSave() {
    if (!formTitle.trim()) {
      toast.error('Title is required')
      return
    }

    const cleanedItems = formItems.filter((item) => item.trim() !== '')

    if (editingId) {
      startTransition(async () => {
        try {
          await updateHighlight(editingId, {
            title: formTitle.trim(),
            category: formCategory,
            items: cleanedItems,
          })
          setHighlights((prev) =>
            prev.map((h) =>
              h.id === editingId
                ? { ...h, title: formTitle.trim(), category: formCategory, items: cleanedItems }
                : h
            )
          )
          resetForm()
          toast.success('Highlight updated')
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to update highlight'
          toast.error(message)
        }
      })
    } else {
      startTransition(async () => {
        try {
          const result = await createHighlight({
            title: formTitle.trim(),
            category: formCategory,
            items: cleanedItems,
          })
          if (result.highlight) {
            setHighlights((prev) => [
              ...prev,
              {
                id: result.highlight.id,
                title: result.highlight.title,
                category: result.highlight.category,
                items: result.highlight.items as string[],
                displayOrder: result.highlight.displayOrder,
              },
            ])
          }
          resetForm()
          toast.success('Highlight added')
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to add highlight'
          toast.error(message)
        }
      })
    }
  }

  function handleDelete(highlightId: string) {
    startTransition(async () => {
      try {
        await deleteHighlight(highlightId)
        setHighlights((prev) => prev.filter((h) => h.id !== highlightId))
        if (editingId === highlightId) resetForm()
        toast.success('Highlight removed')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to remove highlight'
        toast.error(message)
      }
    })
  }

  // Group highlights by category
  const grouped = CATEGORY_OPTIONS.reduce<Record<string, HighlightItem[]>>((acc, cat) => {
    acc[cat.value] = highlights
      .filter((h) => h.category === cat.value)
      .sort((a, b) => a.displayOrder - b.displayOrder)
    return acc
  }, {})

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Story Highlights</CardTitle>
        <Button size="sm" variant="ghost" onClick={startAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add Highlight
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {isPending && (
          <div className="absolute inset-0 bg-stone-900/50 z-10 rounded-xl pointer-events-none" />
        )}

        {/* Add / Edit Form */}
        {(showAddForm || editingId) && (
          <div className="rounded-lg border border-brand-700 bg-brand-950/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-stone-100">
                {editingId ? 'Edit Highlight' : 'New Highlight'}
              </h4>
              <button onClick={resetForm} className="text-stone-400 hover:text-stone-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Summer Wedding Series"
                required
              />
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1.5">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as HighlightItem['category'])}
                  className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-stone-300">Items</label>
                <Button size="sm" variant="ghost" onClick={handleAddFormItem}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              {formItems.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <input
                    value={item}
                    onChange={(e) => handleUpdateFormItem(i, e.target.value)}
                    className="flex-1 border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder={`Item ${i + 1}`}
                  />
                  {formItems.length > 1 && (
                    <button
                      onClick={() => handleRemoveFormItem(i)}
                      className="text-stone-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} loading={isPending}>
                {editingId ? 'Update' : 'Add Highlight'}
              </Button>
              <Button size="sm" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Grouped highlights */}
        {CATEGORY_OPTIONS.map((cat) => {
          const catHighlights = grouped[cat.value] || []
          if (catHighlights.length === 0) return null

          return (
            <div key={cat.value}>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant={CATEGORY_BADGE_VARIANT[cat.value]}>{cat.label}</Badge>
                <span className="text-xs text-stone-400">
                  {catHighlights.length} highlight{catHighlights.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-2">
                {catHighlights.map((highlight) => (
                  <div
                    key={highlight.id}
                    className="flex items-start gap-3 rounded-lg border border-stone-700 p-3 hover:bg-stone-800 transition-colors"
                  >
                    <GripVertical className="h-5 w-5 text-stone-300 mt-0.5 cursor-grab flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-100">{highlight.title}</p>
                      {highlight.items.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {highlight.items.map((item, i) => (
                            <li key={i} className="text-xs text-stone-500 truncate">
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEdit(highlight)}
                        className="p-1.5 rounded text-stone-400 hover:text-brand-600 hover:bg-stone-700"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(highlight.id)}
                        className="p-1.5 rounded text-stone-400 hover:text-red-500 hover:bg-stone-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {highlights.length === 0 && !showAddForm && (
          <p className="text-sm text-stone-400 italic text-center py-8">
            No highlights yet. Add your first story highlight to showcase your work.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
