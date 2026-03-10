'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  toggleItemAvailability,
  updateMenuBoardItemPrice,
} from '@/lib/food-truck/menu-board-actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdminRecipe = {
  id: string
  name: string
  category: string
  onBoard: boolean
  priceCents: number | null
  isSpecial: boolean
  available: boolean
  sortOrder: number
}

type MenuBoardAdminProps = {
  initialRecipes: AdminRecipe[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MenuBoardAdmin({ initialRecipes }: MenuBoardAdminProps) {
  const [recipes, setRecipes] = useState(initialRecipes)
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editSpecial, setEditSpecial] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  // Toggle 86'd status
  function handleToggleAvailability(recipe: AdminRecipe) {
    const previous = [...recipes]
    const newAvailable = !recipe.available
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipe.id ? { ...r, available: newAvailable } : r))
    )

    startTransition(async () => {
      try {
        const result = await toggleItemAvailability(recipe.id, newAvailable)
        if (!result.success) {
          setRecipes(previous)
          showToast('error', result.error ?? 'Failed to update')
        } else {
          showToast(
            'success',
            newAvailable ? `${recipe.name} is back on the board` : `${recipe.name} is 86'd`
          )
        }
      } catch {
        setRecipes(previous)
        showToast('error', 'Failed to update availability')
      }
    })
  }

  // Add/update item on board
  function handleSavePrice(recipe: AdminRecipe) {
    const priceDollars = parseFloat(editPrice)
    if (isNaN(priceDollars) || priceDollars < 0) {
      showToast('error', 'Enter a valid price')
      return
    }

    const priceCents = Math.round(priceDollars * 100)
    const previous = [...recipes]

    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipe.id ? { ...r, priceCents, isSpecial: editSpecial, onBoard: true } : r
      )
    )
    setEditingId(null)

    startTransition(async () => {
      try {
        const result = await updateMenuBoardItemPrice(
          recipe.id,
          priceCents,
          editSpecial,
          recipe.sortOrder
        )
        if (!result.success) {
          setRecipes(previous)
          showToast('error', result.error ?? 'Failed to save')
        } else {
          showToast('success', `${recipe.name} updated on board`)
        }
      } catch {
        setRecipes(previous)
        showToast('error', 'Failed to save price')
      }
    })
  }

  // Remove from board
  function handleRemoveFromBoard(recipe: AdminRecipe) {
    const previous = [...recipes]
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipe.id ? { ...r, priceCents: null, onBoard: false, isSpecial: false } : r
      )
    )

    startTransition(async () => {
      try {
        const result = await updateMenuBoardItemPrice(recipe.id, null, false, 0)
        if (!result.success) {
          setRecipes(previous)
          showToast('error', result.error ?? 'Failed to remove')
        } else {
          showToast('success', `${recipe.name} removed from board`)
        }
      } catch {
        setRecipes(previous)
        showToast('error', 'Failed to remove from board')
      }
    })
  }

  // Separate board items from available recipes
  const boardItems = recipes.filter((r) => r.onBoard)
  const availableRecipes = recipes.filter((r) => !r.onBoard)

  // Group board items by category
  const boardByCategory = new Map<string, AdminRecipe[]>()
  for (const item of boardItems) {
    if (!boardByCategory.has(item.category)) boardByCategory.set(item.category, [])
    boardByCategory.get(item.category)!.push(item)
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Display link */}
      <Card className="p-4 bg-zinc-900 border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Menu Board Display</h3>
            <p className="text-sm text-zinc-400">
              Open in a new tab for your truck window TV or tablet
            </p>
          </div>
          <a href="/food-truck/menu-board/display" target="_blank" rel="noopener noreferrer">
            <Button variant="primary">Open Display</Button>
          </a>
        </div>
      </Card>

      {/* Active board items */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-3">
          On the Board ({boardItems.length})
        </h2>

        {boardItems.length === 0 ? (
          <Card className="p-6 bg-zinc-900 border-zinc-800 text-center">
            <p className="text-zinc-400">
              No items on the menu board yet. Add recipes from the list below.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {Array.from(boardByCategory.entries()).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  {category}
                </h3>
                <div className="space-y-2">
                  {items.map((item) => (
                    <Card
                      key={item.id}
                      className={`p-3 bg-zinc-900 border-zinc-800 ${
                        !item.available ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium text-white ${
                                !item.available ? 'line-through' : ''
                              }`}
                            >
                              {item.name}
                            </span>
                            {item.isSpecial && (
                              <span className="bg-amber-600 text-white text-xs px-1.5 py-0.5 rounded">
                                Special
                              </span>
                            )}
                            {!item.available && (
                              <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded">
                                86'd
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-zinc-400">
                            {item.priceCents !== null
                              ? `$${(item.priceCents / 100).toFixed(2)}`
                              : 'No price'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* 86 toggle */}
                          <Button
                            variant={item.available ? 'danger' : 'secondary'}
                            onClick={() => handleToggleAvailability(item)}
                            disabled={isPending}
                          >
                            {item.available ? '86 It' : 'Un-86'}
                          </Button>

                          {/* Edit price */}
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setEditingId(item.id)
                              setEditPrice(
                                item.priceCents !== null ? (item.priceCents / 100).toFixed(2) : ''
                              )
                              setEditSpecial(item.isSpecial)
                            }}
                            disabled={isPending}
                          >
                            Edit
                          </Button>

                          {/* Remove */}
                          <Button
                            variant="ghost"
                            onClick={() => handleRemoveFromBoard(item)}
                            disabled={isPending}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>

                      {/* Inline edit */}
                      {editingId === item.id && (
                        <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-3">
                          <label className="text-sm text-zinc-400">$</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-sm"
                            placeholder="0.00"
                          />
                          <label className="flex items-center gap-1.5 text-sm text-zinc-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editSpecial}
                              onChange={(e) => setEditSpecial(e.target.checked)}
                              className="rounded border-zinc-600"
                            />
                            Daily Special
                          </label>
                          <Button
                            variant="primary"
                            onClick={() => handleSavePrice(item)}
                            disabled={isPending}
                          >
                            Save
                          </Button>
                          <Button variant="ghost" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available recipes to add */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-3">
          Available Recipes ({availableRecipes.length})
        </h2>

        {availableRecipes.length === 0 ? (
          <Card className="p-6 bg-zinc-900 border-zinc-800 text-center">
            <p className="text-zinc-400">All recipes are on the board.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {availableRecipes.map((recipe) => (
              <Card key={recipe.id} className="p-3 bg-zinc-900 border-zinc-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-medium text-white">{recipe.name}</span>
                    <span className="text-sm text-zinc-500 ml-2">{recipe.category}</span>
                  </div>

                  {editingId === recipe.id ? (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-zinc-400">$</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-sm"
                        placeholder="0.00"
                      />
                      <label className="flex items-center gap-1.5 text-sm text-zinc-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editSpecial}
                          onChange={(e) => setEditSpecial(e.target.checked)}
                          className="rounded border-zinc-600"
                        />
                        Special
                      </label>
                      <Button
                        variant="primary"
                        onClick={() => handleSavePrice(recipe)}
                        disabled={isPending}
                      >
                        Add
                      </Button>
                      <Button variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingId(recipe.id)
                        setEditPrice('')
                        setEditSpecial(false)
                      }}
                    >
                      Add to Board
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
