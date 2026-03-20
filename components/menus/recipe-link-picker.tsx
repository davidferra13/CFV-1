'use client'

// RecipeLinkPicker - compact recipe search + link widget for the Menu Doc Editor.
// Searches recipes by name with 300ms debounce, shows cost data, links on click.

import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { searchRecipesForEditor, linkRecipeToEditorDish } from '@/lib/menus/editor-actions'

type RecipeResult = {
  id: string
  name: string
  category: string
  servings: number | null
  totalCostCents: number | null
  hasAllPrices: boolean
  ingredientCount: number
}

export function RecipeLinkPicker({
  dishId,
  menuId,
  onLinked,
}: {
  dishId: string
  menuId: string
  onLinked: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RecipeResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setIsSearching(true)
    try {
      const data = await searchRecipesForEditor(q)
      setResults(data)
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, doSearch])

  const handleLink = (recipe: RecipeResult) => {
    startTransition(async () => {
      await linkRecipeToEditorDish(dishId, recipe.id, recipe.name)
      setQuery('')
      setResults([])
      setOpen(false)
      onLinked()
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-stone-400 hover:text-brand-400 border border-dashed border-stone-600 hover:border-brand-500 px-2.5 py-1 rounded-full transition-colors"
      >
        + Link recipe
      </button>
    )
  }

  return (
    <div className="space-y-2 mt-1">
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          placeholder="Search recipes to link..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 text-sm bg-stone-800 border-stone-600 text-stone-200 placeholder:text-stone-400 focus:border-brand-500"
        />
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setQuery('')
            setResults([])
          }}
          className="text-xs text-stone-500 hover:text-stone-300 shrink-0"
        >
          Cancel
        </button>
      </div>

      {isSearching && <p className="text-xs text-stone-500">Searching...</p>}

      {!isSearching && query.length >= 2 && results.length === 0 && (
        <p className="text-xs text-stone-500">No recipes found</p>
      )}

      {results.length > 0 && (
        <div className="border border-stone-700 rounded-md max-h-48 overflow-y-auto divide-y divide-stone-700 bg-stone-900 shadow-lg">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleLink(r)}
              disabled={isPending}
              className="w-full text-left px-3 py-2 hover:bg-stone-800 transition-colors flex items-center justify-between gap-2 disabled:opacity-50"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-200 truncate">{r.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="default" className="text-xs py-0 px-1.5">
                    {r.category}
                  </Badge>
                  {r.totalCostCents != null && (
                    <span className="text-xs text-stone-400">
                      ${(r.totalCostCents / 100).toFixed(2)}/serving
                    </span>
                  )}
                  {!r.hasAllPrices && r.ingredientCount > 0 && (
                    <span className="text-xs text-amber-500">partial cost</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-stone-500 shrink-0">+ Link</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
