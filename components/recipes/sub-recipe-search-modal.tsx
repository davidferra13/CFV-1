'use client'

// Sub-Recipe Search Modal
// Allows searching for existing recipes to add as sub-recipes (components) of a parent recipe.
// Filters out self-references and already-linked recipes. Inline quantity/unit form on selection.

import { useState, useEffect, useRef, useCallback } from 'react'
import { searchRecipes } from '@/lib/recipes/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

type Props = {
  parentRecipeId: string
  existingSubRecipeIds: string[]
  isOpen: boolean
  onClose: () => void
  onAdd: (childRecipeId: string, quantity: number, unit: string) => Promise<void>
}

type RecipeResult = {
  id: string
  name: string
  category: string | null
}

export function SubRecipeSearchModal({
  parentRecipeId,
  existingSubRecipeIds,
  isOpen,
  onClose,
  onAdd,
}: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RecipeResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeResult | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState('batch')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setSelectedRecipe(null)
      setQuantity(1)
      setUnit('batch')
      setError(null)
      // Autofocus the search input after mount
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Debounced search
  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value)
      setError(null)

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      if (value.trim().length < 2) {
        setResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)

      debounceRef.current = setTimeout(async () => {
        try {
          const data = await searchRecipes(value.trim())
          // Filter out self and already-linked recipes
          const excludeIds = new Set([parentRecipeId, ...existingSubRecipeIds])
          const filtered = data.filter((r: RecipeResult) => !excludeIds.has(r.id))
          setResults(filtered)
        } catch {
          setResults([])
        } finally {
          setIsSearching(false)
        }
      }, 300)
    },
    [parentRecipeId, existingSubRecipeIds]
  )

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  function handleSelectRecipe(recipe: RecipeResult) {
    setSelectedRecipe(recipe)
    setQuantity(1)
    setUnit('batch')
    setError(null)
  }

  function handleClearSelection() {
    setSelectedRecipe(null)
    setError(null)
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }

  async function handleAdd() {
    if (!selectedRecipe) return
    if (quantity <= 0) {
      setError('Quantity must be greater than 0')
      return
    }
    if (!unit.trim()) {
      setError('Unit is required')
      return
    }

    setIsAdding(true)
    setError(null)

    try {
      await onAdd(selectedRecipe.id, quantity, unit.trim())
      setSelectedRecipe(null)
      setQuery('')
      setResults([])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add sub-recipe'
      setError(message)
    } finally {
      setIsAdding(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <Card className="p-6 max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-stone-100">Add Sub-Recipe</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Search Input */}
        {!selectedRecipe && (
          <>
            <div className="relative mb-3">
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search recipes by name..."
                className="w-full px-3 py-2 border border-stone-600 rounded-md text-stone-100 bg-stone-800 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg
                    className="animate-spin h-4 w-4 text-stone-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Results List */}
            {results.length > 0 && (
              <ul className="max-h-64 overflow-y-auto border border-stone-700 rounded-md divide-y divide-stone-700">
                {results.map((recipe) => (
                  <li key={recipe.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectRecipe(recipe)}
                      className="w-full text-left px-3 py-2.5 hover:bg-stone-800 transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="text-sm text-stone-100 truncate">{recipe.name}</span>
                      {recipe.category && (
                        <Badge variant="default" className="shrink-0">
                          {recipe.category}
                        </Badge>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Empty states */}
            {query.trim().length >= 2 && !isSearching && results.length === 0 && (
              <p className="text-sm text-stone-500 text-center py-4">No matching recipes found</p>
            )}

            {query.trim().length < 2 && query.trim().length > 0 && (
              <p className="text-sm text-stone-500 text-center py-4">
                Type at least 2 characters to search
              </p>
            )}
          </>
        )}

        {/* Selected Recipe - Quantity/Unit Form */}
        {selectedRecipe && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-stone-800 rounded-md">
              <span className="text-sm text-stone-100 font-medium truncate flex-1">
                {selectedRecipe.name}
              </span>
              {selectedRecipe.category && (
                <Badge variant="default" className="shrink-0">
                  {selectedRecipe.category}
                </Badge>
              )}
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-stone-400 hover:text-stone-200 text-sm ml-1"
                aria-label="Change selection"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Quantity</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-stone-600 rounded-md text-stone-100 bg-stone-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="batch"
                  className="w-full px-3 py-2 border border-stone-600 rounded-md text-stone-100 bg-stone-800 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950 px-3 py-2 rounded-md">{error}</p>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearSelection}
                className="flex-1"
                disabled={isAdding}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleAdd}
                className="flex-1"
                loading={isAdding}
                disabled={isAdding}
              >
                {isAdding ? 'Adding...' : 'Add Sub-Recipe'}
              </Button>
            </div>
          </div>
        )}

        {/* Error shown outside selection (e.g. search errors) */}
        {error && !selectedRecipe && (
          <p className="text-sm text-red-400 bg-red-950 px-3 py-2 rounded-md mt-3">{error}</p>
        )}
      </Card>
    </div>
  )
}
