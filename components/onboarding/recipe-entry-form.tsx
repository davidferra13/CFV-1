'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, ArrowRight, X, Search } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  createRecipe,
  createRecipeWithIngredients,
  type RecipeListItem,
} from '@/lib/recipes/actions'

const CATEGORIES = [
  'sauce',
  'protein',
  'starch',
  'vegetable',
  'fruit',
  'dessert',
  'bread',
  'pasta',
  'soup',
  'salad',
  'appetizer',
  'condiment',
  'beverage',
  'other',
] as const

const CATEGORY_COLORS: Record<string, string> = {
  protein: 'bg-red-900 text-red-800',
  sauce: 'bg-orange-900 text-orange-800',
  starch: 'bg-yellow-900 text-yellow-800',
  vegetable: 'bg-green-900 text-green-800',
  fruit: 'bg-lime-900 text-lime-800',
  dessert: 'bg-pink-900 text-pink-800',
  bread: 'bg-amber-900 text-amber-800',
  pasta: 'bg-amber-900 text-amber-800',
  soup: 'bg-brand-900 text-brand-800',
  salad: 'bg-emerald-900 text-emerald-800',
  appetizer: 'bg-violet-900 text-violet-800',
  condiment: 'bg-stone-800 text-stone-200',
  beverage: 'bg-brand-900 text-brand-800',
  other: 'bg-stone-800 text-stone-300',
}

const EMPTY_FORM = {
  name: '',
  category: 'sauce' as (typeof CATEGORIES)[number],
  description: '',
  method: '',
  method_detailed: '',
  prep_time_minutes: '',
  cook_time_minutes: '',
  yield_quantity: '',
  yield_unit: '',
  dietary_tags: [] as string[],
  notes: '',
}

type IngredientSearchHit = {
  id: string
  name: string
  category: string
  standardUnit: string
  hasPrice: boolean
  bestPriceCents: number | null
  bestPriceUnit: string | null
}

type SelectedIngredient = {
  name: string
  category: string
  defaultUnit: string
  quantity: number
  priceCents: number | null
  priceUnit: string | null
}

function formatCents(cents: number | null): string {
  if (cents === null) return ''
  return `$${(cents / 100).toFixed(2)}`
}

export function RecipeEntryForm({ initialRecipes }: { initialRecipes: RecipeListItem[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState(EMPTY_FORM)
  const [recipes, setRecipes] = useState<RecipeListItem[]>(initialRecipes)
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')

  const [ingredientQuery, setIngredientQuery] = useState('')
  const [searchResults, setSearchResults] = useState<IngredientSearchHit[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  function set<K extends keyof typeof EMPTY_FORM>(field: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function addTag() {
    const value = tagInput.trim()
    if (!value) return
    setForm((prev) => ({
      ...prev,
      dietary_tags: prev.dietary_tags.includes(value)
        ? prev.dietary_tags
        : [...prev.dietary_tags, value],
    }))
    setTagInput('')
  }

  function removeTag(tag: string) {
    setForm((prev) => ({ ...prev, dietary_tags: prev.dietary_tags.filter((t) => t !== tag) }))
  }

  useEffect(() => {
    if (ingredientQuery.length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(
          `/api/ingredients/search?q=${encodeURIComponent(ingredientQuery)}&limit=6`
        )
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.results ?? [])
          setShowDropdown(true)
        }
      } catch {
        setSearchResults([])
      }
      setIsSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [ingredientQuery])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectIngredient = useCallback((hit: IngredientSearchHit) => {
    setSelectedIngredients((prev) => {
      if (prev.some((i) => i.name.toLowerCase() === hit.name.toLowerCase())) return prev
      return [
        ...prev,
        {
          name: hit.name,
          category: hit.category || 'other',
          defaultUnit: hit.standardUnit || 'unit',
          quantity: 1,
          priceCents: hit.bestPriceCents,
          priceUnit: hit.bestPriceUnit,
        },
      ]
    })
    setIngredientQuery('')
    setSearchResults([])
    setShowDropdown(false)
    searchInputRef.current?.focus()
  }, [])

  function removeIngredient(name: string) {
    setSelectedIngredients((prev) => prev.filter((i) => i.name !== name))
  }

  function updateIngredientQty(name: string, qty: number) {
    if (qty < 0.1) return
    setSelectedIngredients((prev) =>
      prev.map((i) => (i.name === name ? { ...i, quantity: qty } : i))
    )
  }

  const estimatedCostCents = selectedIngredients.reduce(
    (sum, i) => sum + (i.priceCents ?? 0) * i.quantity,
    0
  )
  const pricedCount = selectedIngredients.filter((i) => i.priceCents !== null).length

  function handleSave() {
    if (!form.name.trim()) {
      setError('Recipe name is required')
      return
    }
    setError(null)

    startTransition(async () => {
      try {
        const recipeInput = {
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim() || undefined,
          method: form.method.trim(),
          method_detailed: form.method_detailed.trim() || undefined,
          prep_time_minutes: parseInt(form.prep_time_minutes, 10) || undefined,
          cook_time_minutes: parseInt(form.cook_time_minutes, 10) || undefined,
          yield_quantity: parseFloat(form.yield_quantity) || undefined,
          yield_unit: form.yield_unit.trim() || undefined,
          dietary_tags: form.dietary_tags,
          notes: form.notes.trim() || undefined,
        }

        let recipeId: string
        let recipeName: string = form.name.trim()
        const ingredientCount = selectedIngredients.length
        const clientEstimateCents = estimatedCostCents

        if (ingredientCount > 0) {
          const ingredientInputs = selectedIngredients.map((ing, idx) => ({
            ingredient_name: ing.name,
            ingredient_category: ing.category,
            ingredient_default_unit: ing.defaultUnit,
            quantity: ing.quantity,
            unit: ing.defaultUnit,
            sort_order: idx,
          }))
          const result = await createRecipeWithIngredients(recipeInput, ingredientInputs)
          if (!result.success) {
            setError(result.message)
            return
          }
          recipeId = result.recipeId
        } else {
          const result = await createRecipe(recipeInput)
          recipeId = result.recipe.id
          recipeName = result.recipe.name
        }

        const newEntry: RecipeListItem = {
          id: recipeId,
          name: recipeName,
          category: form.category,
          status: 'draft',
          method: form.method.trim(),
          photo_url: null,
          dietary_tags: form.dietary_tags,
          prep_time_minutes: parseInt(form.prep_time_minutes, 10) || null,
          cook_time_minutes: parseInt(form.cook_time_minutes, 10) || null,
          yield_quantity: parseFloat(form.yield_quantity) || null,
          yield_unit: form.yield_unit.trim() || null,
          times_cooked: 0,
          last_cooked_at: null,
          created_at: new Date().toISOString(),
          ingredient_count: ingredientCount || null,
          total_cost_cents: ingredientCount > 0 ? clientEstimateCents : null,
          has_all_prices: ingredientCount > 0 ? pricedCount === ingredientCount : null,
          last_price_updated_at: ingredientCount > 0 ? new Date().toISOString() : null,
          servings: null,
          calories_per_serving: null,
          cuisine: null,
          meal_type: null,
          season: [],
          occasion_tags: [],
          family_id: null,
          variation_label: null,
          family_name: null,
          avg_price_confidence: null,
          min_price_confidence: null,
          low_confidence_count: null,
        }
        setRecipes((prev) => [newEntry, ...prev])
        setForm(EMPTY_FORM)
        setSelectedIngredients([])
        setTagInput('')
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save recipe')
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Form - left (3/5) */}
      <div className="lg:col-span-3 space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a Recipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-950 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Brown butter hollandaise"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  id="category"
                  aria-label="Recipe category"
                  value={form.category}
                  onChange={(e) => set('category', e.target.value as typeof form.category)}
                  className="flex h-10 w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 capitalize"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Brief client-facing description"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Method (summary)</Label>
              <Input
                value={form.method}
                onChange={(e) => set('method', e.target.value)}
                placeholder="Emulsified sauce with brown butter base"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Full Method</Label>
              <textarea
                value={form.method_detailed}
                onChange={(e) => set('method_detailed', e.target.value)}
                placeholder="Step-by-step instructions..."
                rows={4}
                className="flex w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 resize-y"
              />
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Prep (min)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.prep_time_minutes}
                  onChange={(e) => set('prep_time_minutes', e.target.value)}
                  placeholder="15"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cook (min)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.cook_time_minutes}
                  onChange={(e) => set('cook_time_minutes', e.target.value)}
                  placeholder="20"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Yield qty</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.yield_quantity}
                  onChange={(e) => set('yield_quantity', e.target.value)}
                  placeholder="4"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Yield unit</Label>
                <Input
                  value={form.yield_unit}
                  onChange={(e) => set('yield_unit', e.target.value)}
                  placeholder="portions"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Dietary Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  placeholder="Gluten-free, vegan... press Enter"
                />
                <Button type="button" variant="secondary" onClick={addTag}>
                  Add
                </Button>
              </div>
              {form.dietary_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {form.dietary_tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-green-900 px-2.5 py-0.5 text-xs text-green-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        aria-label={`Remove ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Chef Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Make ahead tips, sourcing notes, variations..."
              />
            </div>

            {/* Ingredient search with live pricing */}
            <div className="space-y-3 pt-2 border-t border-stone-800">
              <div>
                <Label className="text-sm font-medium">Ingredients</Label>
                <p className="text-xs text-stone-500 mt-0.5">
                  Type any ingredient to see live market pricing
                </p>
              </div>

              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
                  <Input
                    ref={searchInputRef}
                    value={ingredientQuery}
                    onChange={(e) => setIngredientQuery(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                    placeholder="Search: butter, salmon, olive oil..."
                    className="pl-8"
                  />
                  {isSearching && (
                    <span className="absolute right-2.5 top-2.5 text-xs text-stone-500">
                      searching...
                    </span>
                  )}
                </div>

                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border border-stone-700 bg-stone-900 shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((hit) => (
                      <button
                        key={hit.id}
                        type="button"
                        onClick={() => selectIngredient(hit)}
                        className="w-full text-left px-3 py-2 hover:bg-stone-800 flex items-center justify-between gap-2 text-sm border-b border-stone-800 last:border-b-0"
                      >
                        <span className="text-stone-200 capitalize truncate">{hit.name}</span>
                        {hit.hasPrice && hit.bestPriceCents !== null ? (
                          <span className="text-emerald-400 font-mono text-xs whitespace-nowrap">
                            {formatCents(hit.bestPriceCents)}/{hit.bestPriceUnit}
                          </span>
                        ) : (
                          <span className="text-stone-600 text-xs">no price yet</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedIngredients.length > 0 && (
                <div className="space-y-1.5">
                  {selectedIngredients.map((ing) => (
                    <div
                      key={ing.name}
                      className="flex items-center gap-2 rounded-md bg-stone-800/50 px-3 py-1.5"
                    >
                      <span className="text-sm text-stone-200 capitalize flex-1 truncate">
                        {ing.name}
                      </span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={ing.quantity}
                        onChange={(e) =>
                          updateIngredientQty(ing.name, parseFloat(e.target.value) || 1)
                        }
                        className="w-14 h-7 rounded border border-stone-700 bg-stone-900 px-1.5 text-xs text-center"
                      />
                      <span className="text-xs text-stone-500 w-8">{ing.defaultUnit}</span>
                      {ing.priceCents !== null ? (
                        <span className="text-xs font-mono text-emerald-400 w-16 text-right">
                          {formatCents(ing.priceCents * ing.quantity)}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-600 w-16 text-right">pending</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeIngredient(ing.name)}
                        className="text-stone-600 hover:text-stone-400"
                        aria-label={`Remove ${ing.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  {estimatedCostCents > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-stone-700">
                      <span className="text-xs text-stone-400">
                        Estimated recipe cost ({pricedCount}/{selectedIngredients.length} priced)
                      </span>
                      <span className="text-sm font-semibold text-emerald-400 font-mono">
                        {formatCents(estimatedCostCents)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isPending || !form.name.trim()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isPending ? 'Saving...' : 'Save & Add Another'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recipe list - right (2/5) */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Library</span>
              <Badge variant="default">{recipes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recipes.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-6">
                No recipes yet - add your first one.
              </p>
            ) : (
              <ul className="divide-y divide-stone-800 max-h-96 overflow-y-auto">
                {recipes.map((r) => (
                  <li key={r.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-stone-200 truncate block">
                        {r.name}
                      </span>
                      {r.ingredient_count != null && r.ingredient_count > 0 && (
                        <span className="text-xs text-stone-500">
                          {r.ingredient_count} ingredients
                          {r.total_cost_cents != null && r.total_cost_cents > 0 && (
                            <span className="text-emerald-500 ml-1.5 font-mono">
                              {formatCents(r.total_cost_cents)}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 capitalize ${CATEGORY_COLORS[r.category] ?? 'bg-stone-800 text-stone-300'}`}
                    >
                      {r.category}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {recipes.length > 0 && (
          <Link href="/onboarding/staff">
            <Button variant="primary" className="w-full">
              Continue to Staff Setup
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        )}

        <Link href="/onboarding" className="block">
          <Button variant="ghost" className="w-full text-stone-500">
            Back to Setup Overview
          </Button>
        </Link>
      </div>
    </div>
  )
}
