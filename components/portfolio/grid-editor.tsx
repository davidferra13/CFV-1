/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Star, Plus, Trash2, GripVertical } from 'lucide-react'
import { addPortfolioItem, removePortfolioItem, reorderPortfolio } from '@/lib/portfolio/actions'
import { toast } from 'sonner'

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface PortfolioItem {
  id: string
  photoUrl: string
  caption?: string
  dishName?: string
  isFeatured: boolean
}

interface GridEditorProps {
  items: PortfolioItem[]
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function GridEditor({ items: initialItems }: GridEditorProps) {
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
          setItems((prev) => [
            ...prev,
            {
              id: result.item.id,
              photoUrl: result.item.photoUrl,
              caption: result.item.caption ?? undefined,
              dishName: result.item.dishName ?? undefined,
              isFeatured: result.item.isFeatured,
            },
          ])
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
              <div className="aspect-square bg-stone-800">
                <img
                  src={item.photoUrl}
                  alt={item.dishName || item.caption || 'Portfolio photo'}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Caption overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
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
