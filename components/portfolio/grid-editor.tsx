'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Star, Plus, Trash2, GripVertical } from '@/components/ui/icons'
import {
  addPortfolioItem,
  removePortfolioItem,
  reorderPortfolio,
  updatePortfolioItem,
} from '@/lib/portfolio/actions'
import type { PortfolioItem } from '@/lib/portfolio/actions'
import { toast } from 'sonner'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'uncategorized',
  'plating',
  'setup',
  'ambiance',
  'ingredients',
  'team',
  'table-setting',
  'dessert',
] as const

const SEASONS = ['spring', 'summer', 'fall', 'winter'] as const

const CATEGORY_LABELS: Record<string, string> = {
  uncategorized: 'Uncategorized',
  plating: 'Plating',
  setup: 'Setup',
  ambiance: 'Ambiance',
  ingredients: 'Ingredients',
  team: 'Team',
  'table-setting': 'Table Setting',
  dessert: 'Dessert',
}

const SEASON_LABELS: Record<string, string> = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventOption {
  id: string
  name: string
  date: string | null
}

interface GridEditorProps {
  items: PortfolioItem[]
  events?: EventOption[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GridEditor({ items: initialItems, events = [] }: GridEditorProps) {
  const [items, setItems] = useState<PortfolioItem[]>(initialItems)
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPhotoUrl, setNewPhotoUrl] = useState('')
  const [newCaption, setNewCaption] = useState('')
  const [newDishName, setNewDishName] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  function handleToggleFeatured(itemId: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, isFeatured: !item.isFeatured } : item))
    )
  }

  function handleRemove(itemId: string) {
    startTransition(async () => {
      try {
        await removePortfolioItem(itemId)
        setItems((prev) => prev.filter((item) => item.id !== itemId))
        toast.success('Portfolio item removed')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to remove item'
        toast.error(message)
      }
    })
  }

  function handleAdd() {
    if (!newPhotoUrl.trim()) {
      toast.error('Photo URL is required')
      return
    }

    startTransition(async () => {
      try {
        const result = await addPortfolioItem({
          photoUrl: newPhotoUrl.trim(),
          caption: newCaption.trim() || undefined,
          dishName: newDishName.trim() || undefined,
        })
        if (result.item) {
          setItems((prev) => [...prev, result.item])
        }
        setNewPhotoUrl('')
        setNewCaption('')
        setNewDishName('')
        setShowAddForm(false)
        toast.success('Portfolio item added')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to add item'
        toast.error(message)
      }
    })
  }

  function handleFieldUpdate(itemId: string, field: string, value: string | null) {
    const previous = [...items]
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item))
    )

    startTransition(async () => {
      try {
        await updatePortfolioItem(itemId, { [field]: value })
      } catch {
        setItems(previous)
        toast.error('Failed to update item')
      }
    })
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setDragOverIndex(index)
  }

  function handleDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const reordered = [...items]
    const [moved] = reordered.splice(draggedIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    setItems(reordered)
    setDraggedIndex(null)
    setDragOverIndex(null)

    const orderedIds = reordered.map((item) => item.id)
    startTransition(async () => {
      try {
        await reorderPortfolio(orderedIds)
        toast.success('Portfolio reordered')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to reorder'
        toast.error(message)
        setItems(initialItems)
      }
    })
  }

  function handleDragEnd() {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const selectClass =
    'w-full text-xs text-stone-300 bg-stone-800 border border-stone-700 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Portfolio Photos</CardTitle>
        <span className="text-sm text-stone-500">{items.length} items</span>
      </CardHeader>
      <CardContent>
        {isPending && (
          <div className="absolute inset-0 bg-stone-900/50 z-10 rounded-xl pointer-events-none" />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={`group relative rounded-lg border overflow-hidden transition-all ${
                dragOverIndex === index
                  ? 'border-brand-500 ring-2 ring-brand-500/20'
                  : 'border-stone-700'
              } ${draggedIndex === index ? 'opacity-50' : ''}`}
            >
              {/* Drag handle */}
              <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                <GripVertical className="h-5 w-5 text-white drop-shadow-md" />
              </div>

              {/* Photo */}
              <div className="relative aspect-square bg-stone-800">
                <Image
                  src={item.photoUrl}
                  alt={item.dishName || item.caption || 'Portfolio photo'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>

              {/* Caption overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pointer-events-none">
                {item.dishName && <p className="text-sm font-medium text-white">{item.dishName}</p>}
                {item.caption && <p className="text-xs text-white/80">{item.caption}</p>}
              </div>

              {/* Actions */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleToggleFeatured(item.id)}
                  className={`p-1.5 rounded-full backdrop-blur-sm transition-colors ${
                    item.isFeatured
                      ? 'bg-amber-500 text-white'
                      : 'bg-black/30 text-white hover:bg-amber-500'
                  }`}
                  title={item.isFeatured ? 'Remove from featured' : 'Mark as featured'}
                >
                  <Star className="h-4 w-4" fill={item.isFeatured ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="p-1.5 rounded-full bg-black/30 text-white hover:bg-red-500 backdrop-blur-sm transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Featured badge */}
              {item.isFeatured && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                  Featured
                </div>
              )}

              {/* Metadata dropdowns */}
              <div className="p-2 space-y-1.5 bg-stone-900">
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={item.category || 'uncategorized'}
                    onChange={(e) => handleFieldUpdate(item.id, 'category', e.target.value)}
                    className={selectClass}
                    title="Category"
                    disabled={isPending}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={item.season || ''}
                    onChange={(e) => handleFieldUpdate(item.id, 'season', e.target.value || null)}
                    className={selectClass}
                    title="Season"
                    disabled={isPending}
                  >
                    <option value="">No season</option>
                    {SEASONS.map((s) => (
                      <option key={s} value={s}>
                        {SEASON_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                {events.length > 0 && (
                  <select
                    value={item.eventLinkId || ''}
                    onChange={(e) =>
                      handleFieldUpdate(item.id, 'eventLinkId', e.target.value || null)
                    }
                    className={selectClass}
                    title="Link to event"
                    disabled={isPending}
                  >
                    <option value="">No linked event</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name}
                        {ev.date ? ` (${new Date(ev.date).toLocaleDateString()})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}

          {/* Add Item Card */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="aspect-square rounded-lg border-2 border-dashed border-stone-600 hover:border-brand-500 hover:bg-brand-950/50 flex flex-col items-center justify-center gap-2 text-stone-400 hover:text-brand-600 transition-colors"
            >
              <Plus className="h-8 w-8" />
              <span className="text-sm font-medium">Add Item</span>
            </button>
          ) : (
            <div className="rounded-lg border border-stone-700 p-4 space-y-3">
              <Input
                label="Photo URL"
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                placeholder="https://..."
                required
              />
              <Input
                label="Dish Name"
                value={newDishName}
                onChange={(e) => setNewDishName(e.target.value)}
                placeholder="e.g., Seared Scallops"
              />
              <Input
                label="Caption"
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
                placeholder="Brief description"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} loading={isPending}>
                  Add
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
