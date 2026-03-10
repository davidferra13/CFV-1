'use client'

import { useState, useEffect, useCallback, useTransition, useRef } from 'react'
import {
  searchSystemIngredients,
  getSystemIngredientCategories,
  importSystemIngredient,
  bulkImportSystemIngredients,
} from '@/lib/ingredients/system-ingredients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Search, Plus, Check, Loader2, X, ChevronDown } from 'lucide-react'

// Category display labels
const CATEGORY_LABELS: Record<string, string> = {
  protein: 'Protein',
  produce: 'Produce',
  dairy: 'Dairy & Eggs',
  pantry: 'Pantry',
  spice: 'Spices',
  oil: 'Oils & Fats',
  alcohol: 'Alcohol',
  baking: 'Baking',
  frozen: 'Frozen',
  canned: 'Canned',
  fresh_herb: 'Fresh Herbs',
  dry_herb: 'Dried Herbs',
  condiment: 'Condiments',
  beverage: 'Beverages',
  specialty: 'Specialty',
  other: 'Other',
}

// Allergen badge colors
const ALLERGEN_COLORS: Record<string, string> = {
  milk: 'bg-blue-100 text-blue-800',
  egg: 'bg-yellow-100 text-yellow-800',
  fish: 'bg-cyan-100 text-cyan-800',
  shellfish: 'bg-teal-100 text-teal-800',
  tree_nuts: 'bg-amber-100 text-amber-800',
  peanuts: 'bg-orange-100 text-orange-800',
  wheat: 'bg-red-100 text-red-800',
  soy: 'bg-green-100 text-green-800',
  sesame: 'bg-purple-100 text-purple-800',
}

type SystemIngredient = {
  id: string
  name: string
  category: string
  subcategory: string
  unit_type: string
  standard_unit: string
  cup_weight_grams: number | null
  tbsp_weight_grams: number | null
  allergen_tags: string[]
  common_prep_actions: Array<{ action: string; yield_pct: number }>
}

interface IngredientPickerProps {
  onImported?: (ingredientId: string) => void
  onClose?: () => void
}

export function IngredientPicker({ onImported, onClose }: IngredientPickerProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('')
  const [categories, setCategories] = useState<string[]>([])
  const [results, setResults] = useState<SystemIngredient[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [imported, setImported] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [isImporting, setIsImporting] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load categories on mount
  useEffect(() => {
    let cancelled = false
    getSystemIngredientCategories().then((cats) => {
      if (!cancelled) setCategories(cats)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Debounced search
  const doSearch = useCallback((q: string, cat: string) => {
    startTransition(async () => {
      try {
        const data = await searchSystemIngredients(q, cat || undefined)
        setResults(data as SystemIngredient[])
      } catch {
        setResults([])
      }
    })
  }, [])

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => doSearch(query, category), 250)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [query, category, doSearch])

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Import single
  const handleImportOne = async (id: string) => {
    setIsImporting(true)
    try {
      const result = await importSystemIngredient(id)
      if (result.success) {
        setImported((prev) => new Set(prev).add(id))
        toast.success('Ingredient imported')
        onImported?.(result.ingredientId!)
      } else if (result.reason === 'duplicate') {
        toast.info('You already have this ingredient')
        setImported((prev) => new Set(prev).add(id))
      }
    } catch (err) {
      toast.error('Failed to import ingredient')
    } finally {
      setIsImporting(false)
    }
  }

  // Bulk import
  const handleBulkImport = async () => {
    if (selected.size === 0) return
    setIsImporting(true)
    try {
      const result = await bulkImportSystemIngredients(Array.from(selected))
      setImported((prev) => {
        const next = new Set(prev)
        selected.forEach((id) => next.add(id))
        return next
      })
      setSelected(new Set())
      if (result.imported > 0) {
        toast.success(
          `Imported ${result.imported} ingredient${result.imported > 1 ? 's' : ''}${result.skipped > 0 ? ` (${result.skipped} already existed)` : ''}`
        )
      } else {
        toast.info('All selected ingredients already exist in your list')
      }
    } catch (err) {
      toast.error('Failed to import ingredients')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-lg font-semibold">Add from Database</h3>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Search + Category */}
      <div className="px-4 py-3 space-y-2 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search ingredients..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <button
            onClick={() => setShowCategoryDropdown((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-50"
          >
            <span>{category ? (CATEGORY_LABELS[category] ?? category) : 'All categories'}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {showCategoryDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto w-48">
              <button
                onClick={() => {
                  setCategory('')
                  setShowCategoryDropdown(false)
                }}
                className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${!category ? 'font-semibold bg-gray-50' : ''}`}
              >
                All categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategory(cat)
                    setShowCategoryDropdown(false)
                  }}
                  className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${category === cat ? 'font-semibold bg-gray-50' : ''}`}
                >
                  {CATEGORY_LABELS[cat] ?? cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {isPending && (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Searching...
          </div>
        )}

        {!isPending && results.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            {query ? 'No ingredients found' : 'Start typing to search'}
          </div>
        )}

        {!isPending &&
          results.map((item) => {
            const isSelected = selected.has(item.id)
            const isImported_ = imported.has(item.id)

            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-2.5 border-b hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                onClick={() => !isImported_ && toggleSelect(item.id)}
              >
                {/* Checkbox area */}
                <div className="flex-shrink-0">
                  {isImported_ ? (
                    <div className="h-5 w-5 rounded bg-green-100 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    </div>
                  ) : (
                    <div
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-gray-500">
                      {CATEGORY_LABELS[item.category] ?? item.category}
                      {item.subcategory ? ` / ${item.subcategory}` : ''}
                    </span>
                    {item.allergen_tags.length > 0 && (
                      <div className="flex gap-1">
                        {item.allergen_tags.map((tag: string) => (
                          <span
                            key={tag}
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ALLERGEN_COLORS[tag] ?? 'bg-gray-100 text-gray-700'}`}
                          >
                            {tag.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick import button */}
                {!isImported_ && !isSelected && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleImportOne(item.id)
                    }}
                    disabled={isImporting}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )
          })}
      </div>

      {/* Footer with bulk import */}
      {selected.size > 0 && (
        <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
          <span className="text-sm text-gray-600">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button size="sm" onClick={handleBulkImport} disabled={isImporting}>
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Import {selected.size}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
