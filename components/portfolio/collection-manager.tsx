'use client'

// CollectionManager - Group portfolio items into named collections.
// Default collections: "Signature Dishes", "Event Highlights", "Seasonal Specials".
// Users can create custom collections, rename, delete, and move items between them.

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Edit2, X, FolderPlus } from '@/components/ui/icons'
import { updatePortfolioItem } from '@/lib/portfolio/actions'
import type { PortfolioItem } from '@/lib/portfolio/actions'
import { toast } from 'sonner'

const DEFAULT_COLLECTIONS = ['Signature Dishes', 'Event Highlights', 'Seasonal Specials']

interface CollectionManagerProps {
  items: PortfolioItem[]
}

export function CollectionManager({ items: initialItems }: CollectionManagerProps) {
  const [items, setItems] = useState<PortfolioItem[]>(initialItems)
  const [isPending, startTransition] = useTransition()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [editingCollection, setEditingCollection] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  // Derive all collection names (defaults + custom from items)
  const itemCollections = Array.from(
    new Set(items.map((i) => i.collection).filter(Boolean))
  ) as string[]
  const allCollections = Array.from(new Set([...DEFAULT_COLLECTIONS, ...itemCollections]))

  // Group items by collection
  const grouped = allCollections.reduce<Record<string, PortfolioItem[]>>((acc, col) => {
    acc[col] = items.filter((i) => i.collection === col)
    return acc
  }, {})

  // Unassigned items
  const unassigned = items.filter((i) => !i.collection)

  function handleCreateCollection() {
    const name = newCollectionName.trim()
    if (!name) {
      toast.error('Collection name is required')
      return
    }
    if (allCollections.includes(name)) {
      toast.error('Collection already exists')
      return
    }
    // Just add it locally (no items yet); it will appear as empty
    setNewCollectionName('')
    setShowCreateForm(false)
    toast.success(`Collection "${name}" created`)
    // Force a re-render with the new collection
    setItems([...items])
    allCollections.push(name)
  }

  function handleRenameCollection(oldName: string) {
    const name = editName.trim()
    if (!name || name === oldName) {
      setEditingCollection(null)
      return
    }

    const affectedItems = items.filter((i) => i.collection === oldName)
    const previous = [...items]
    setItems((prev) => prev.map((i) => (i.collection === oldName ? { ...i, collection: name } : i)))
    setEditingCollection(null)

    startTransition(async () => {
      try {
        await Promise.all(
          affectedItems.map((item) => updatePortfolioItem(item.id, { collection: name }))
        )
        toast.success(`Renamed to "${name}"`)
      } catch {
        setItems(previous)
        toast.error('Failed to rename collection')
      }
    })
  }

  function handleDeleteCollection(collectionName: string) {
    const affectedItems = items.filter((i) => i.collection === collectionName)
    const previous = [...items]
    setItems((prev) =>
      prev.map((i) => (i.collection === collectionName ? { ...i, collection: null } : i))
    )

    startTransition(async () => {
      try {
        await Promise.all(
          affectedItems.map((item) => updatePortfolioItem(item.id, { collection: null }))
        )
        toast.success(`Collection removed. ${affectedItems.length} item(s) unassigned.`)
      } catch {
        setItems(previous)
        toast.error('Failed to delete collection')
      }
    })
  }

  function handleMoveItem(itemId: string, targetCollection: string | null) {
    const previous = [...items]
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, collection: targetCollection } : i))
    )

    startTransition(async () => {
      try {
        await updatePortfolioItem(itemId, { collection: targetCollection })
        toast.success(
          targetCollection ? `Moved to "${targetCollection}"` : 'Removed from collection'
        )
      } catch {
        setItems(previous)
        toast.error('Failed to move item')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-stone-100">Collections</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowCreateForm(true)}
          disabled={showCreateForm}
        >
          <FolderPlus className="h-4 w-4 mr-1" />
          New Collection
        </Button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  label="Collection Name"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g., Farm Dinners"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
                />
              </div>
              <Button size="sm" onClick={handleCreateCollection}>
                Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreateForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collection cards */}
      {allCollections.map((collectionName) => {
        const collectionItems = grouped[collectionName] || []
        const coverItem = collectionItems[0]
        const isEditing = editingCollection === collectionName

        return (
          <Card key={collectionName}>
            <CardHeader className="flex flex-row items-center justify-between">
              {isEditing ? (
                <div className="flex gap-2 items-center flex-1">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-sm bg-stone-800 border border-stone-600 rounded px-2 py-1 text-stone-100 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameCollection(collectionName)
                      if (e.key === 'Escape') setEditingCollection(null)
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRenameCollection(collectionName)}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingCollection(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{collectionName}</CardTitle>
                  <Badge variant="default">{collectionItems.length}</Badge>
                </div>
              )}
              {!isEditing && (
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingCollection(collectionName)
                      setEditName(collectionName)
                    }}
                    className="p-1.5 rounded text-stone-400 hover:text-brand-400 hover:bg-stone-700"
                    title="Rename collection"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCollection(collectionName)}
                    className="p-1.5 rounded text-stone-400 hover:text-red-500 hover:bg-stone-700"
                    title="Delete collection"
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {collectionItems.length === 0 ? (
                <p className="text-sm text-stone-500 italic py-4 text-center">
                  No items in this collection. Assign items from the Curated tab or drag them here.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {collectionItems.map((item) => (
                    <div
                      key={item.id}
                      className="relative group rounded-lg border border-stone-700 overflow-hidden bg-stone-900"
                    >
                      <div className="relative aspect-square bg-stone-800">
                        <Image
                          src={item.photoUrl}
                          alt={item.dishName || item.caption || 'Portfolio photo'}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        />
                      </div>
                      <div className="p-2">
                        {item.dishName && (
                          <p className="text-xs font-medium text-stone-200 truncate">
                            {item.dishName}
                          </p>
                        )}
                        <select
                          value={item.collection || ''}
                          onChange={(e) => handleMoveItem(item.id, e.target.value || null)}
                          className="mt-1 w-full text-xs text-stone-400 bg-stone-800 border border-stone-700 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400"
                          title="Move to collection"
                          disabled={isPending}
                        >
                          <option value="">Unassigned</option>
                          {allCollections.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Unassigned items */}
      {unassigned.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Unassigned</CardTitle>
              <Badge variant="warning">{unassigned.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {unassigned.map((item) => (
                <div
                  key={item.id}
                  className="relative group rounded-lg border border-stone-700 overflow-hidden bg-stone-900"
                >
                  <div className="relative aspect-square bg-stone-800">
                    <Image
                      src={item.photoUrl}
                      alt={item.dishName || item.caption || 'Portfolio photo'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                  </div>
                  <div className="p-2">
                    {item.dishName && (
                      <p className="text-xs font-medium text-stone-200 truncate">{item.dishName}</p>
                    )}
                    <select
                      value=""
                      onChange={(e) => handleMoveItem(item.id, e.target.value || null)}
                      className="mt-1 w-full text-xs text-stone-400 bg-stone-800 border border-stone-700 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400"
                      title="Assign to collection"
                      disabled={isPending}
                    >
                      <option value="">Unassigned</option>
                      {allCollections.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
