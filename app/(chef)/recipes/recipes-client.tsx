'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { RecipeImportDialog } from '@/components/recipes/recipe-import-dialog'
import { RecipeBatchImport } from '@/components/recipes/recipe-batch-import'
import type { RecipeListItem } from '@/lib/recipes/actions'
import { useTaxonomy } from '@/components/hooks/use-taxonomy'
import { RecipeCoverFlow } from '@/components/recipes/recipe-cover-flow'

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'sauce', label: 'Sauce' },
  { value: 'protein', label: 'Protein' },
  { value: 'starch', label: 'Starch' },
  { value: 'vegetable', label: 'Vegetable' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'bread', label: 'Bread' },
  { value: 'pasta', label: 'Pasta' },
  { value: 'soup', label: 'Soup' },
  { value: 'salad', label: 'Salad' },
  { value: 'appetizer', label: 'Appetizer' },
  { value: 'condiment', label: 'Condiment' },
  { value: 'beverage', label: 'Beverage' },
  { value: 'other', label: 'Other' },
]

// CUISINE_OPTIONS and MEAL_TYPE_OPTIONS are now derived from taxonomy inside the component

const SORT_OPTIONS = [
  { value: 'name', label: 'A-Z' },
  { value: 'recent', label: 'Newest' },
  { value: 'most_used', label: 'Most Used' },
]

const CATEGORY_COLORS: Record<string, 'default' | 'success' | 'warning' | 'info' | 'error'> = {
  sauce: 'warning',
  protein: 'error',
  starch: 'default',
  vegetable: 'success',
  dessert: 'info',
  pasta: 'warning',
  soup: 'info',
  salad: 'success',
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  sauce: 'from-amber-900/60 to-orange-950/40',
  protein: 'from-red-900/60 to-rose-950/40',
  starch: 'from-stone-800/60 to-stone-900/40',
  vegetable: 'from-emerald-900/60 to-green-950/40',
  dessert: 'from-pink-900/60 to-fuchsia-950/40',
  pasta: 'from-amber-900/60 to-yellow-950/40',
  soup: 'from-brand-900/60 to-brand-950/40',
  salad: 'from-lime-900/60 to-green-950/40',
  fruit: 'from-orange-900/60 to-amber-950/40',
  bread: 'from-amber-800/60 to-yellow-950/40',
  appetizer: 'from-violet-900/60 to-purple-950/40',
  beverage: 'from-brand-900/60 to-teal-950/40',
  condiment: 'from-yellow-900/60 to-amber-950/40',
  other: 'from-stone-800/60 to-stone-900/40',
}

type Props = {
  recipes: RecipeListItem[]
}

export function RecipeLibraryClient({ recipes }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams() ?? new URLSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [viewMode, setViewMode] = useState<'grid' | 'coverflow'>('grid')
  const [importOpen, setImportOpen] = useState(false)
  const [batchImportOpen, setBatchImportOpen] = useState(false)
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false)

  // Taxonomy-driven filter options
  const { entries: cuisineEntries } = useTaxonomy('cuisine')
  const { entries: mealTypeEntries } = useTaxonomy('meal_type')
  const CUISINE_OPTIONS = [
    { value: '', label: 'All Cuisines' },
    ...cuisineEntries.map((e) => ({ value: e.value, label: e.displayLabel })),
  ]
  const MEAL_TYPE_OPTIONS = [
    { value: '', label: 'All Meal Types' },
    ...mealTypeEntries.map((e) => ({ value: e.value, label: e.displayLabel })),
  ]
  // Build lookup maps for display labels
  const cuisineLabelMap = Object.fromEntries(cuisineEntries.map((e) => [e.value, e.displayLabel]))
  const mealTypeLabelMap = Object.fromEntries(mealTypeEntries.map((e) => [e.value, e.displayLabel]))

  const currentCategory = searchParams.get('category') || ''
  const currentCuisine = searchParams.get('cuisine') || ''
  const currentMealType = searchParams.get('meal_type') || ''
  const currentSort = searchParams.get('sort') || 'name'

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/recipes?${params.toString()}`)
  }

  const handleSearch = () => {
    updateFilters('search', search)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Recipe Book</h1>
          <p className="text-stone-400 mt-1">
            {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} in your collection
          </p>
        </div>
        <div className="space-y-2 md:hidden">
          <div className="flex gap-2">
            <Button href="/recipes/new" data-tour="add-recipe" className="w-full flex-1">
              New Recipe
            </Button>
            <Button
              variant="secondary"
              onClick={() => setMobileActionsOpen((isOpen) => !isOpen)}
              aria-expanded={mobileActionsOpen}
              aria-controls="recipe-mobile-actions"
            >
              {mobileActionsOpen ? 'Less' : 'More'}
            </Button>
          </div>
          {mobileActionsOpen && (
            <div id="recipe-mobile-actions" className="grid gap-2">
              <Button
                href="/recipes/production-log"
                variant="ghost"
                className="w-full justify-start"
              >
                Production Log
              </Button>
              <Button
                href="/recipes/ingredients"
                variant="secondary"
                className="w-full justify-start"
              >
                Ingredients
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => {
                  setMobileActionsOpen(false)
                  setImportOpen(true)
                }}
              >
                Import Link
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => {
                  setMobileActionsOpen(false)
                  setBatchImportOpen(true)
                }}
              >
                Batch Import
              </Button>
              <Button href="/recipes/dump" variant="secondary" className="w-full justify-start">
                Recipe Dump
              </Button>
            </div>
          )}
        </div>
        <div className="hidden flex-wrap gap-2 md:flex">
          <Link href="/recipes/production-log">
            <Button variant="ghost">Production Log</Button>
          </Link>
          <Link href="/recipes/ingredients">
            <Button variant="secondary">Ingredients</Button>
          </Link>
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            Import Link
          </Button>
          <Button variant="secondary" onClick={() => setBatchImportOpen(true)}>
            Batch Import
          </Button>
          <Link href="/recipes/dump">
            <Button variant="secondary">Recipe Dump</Button>
          </Link>
          <Link href="/recipes/new" data-tour="add-recipe">
            <Button>New Recipe</Button>
          </Link>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <Input
            type="text"
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button variant="secondary" onClick={handleSearch}>
            Search
          </Button>
        </div>

        <select
          value={currentCategory}
          onChange={(e) => updateFilters('category', e.target.value)}
          aria-label="Category"
          className="border border-stone-600 rounded-md px-3 py-2 text-sm bg-stone-900"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={currentCuisine}
          onChange={(e) => updateFilters('cuisine', e.target.value)}
          aria-label="Cuisine"
          className="border border-stone-600 rounded-md px-3 py-2 text-sm bg-stone-900"
        >
          {CUISINE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={currentMealType}
          onChange={(e) => updateFilters('meal_type', e.target.value)}
          aria-label="Meal Type"
          className="border border-stone-600 rounded-md px-3 py-2 text-sm bg-stone-900"
        >
          {MEAL_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="flex gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilters('sort', opt.value)}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                currentSort === opt.value
                  ? 'border-brand-500 bg-brand-950 text-brand-400 font-medium'
                  : 'border-stone-600 text-stone-400 hover:bg-stone-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* View mode toggle */}
        <div className="flex gap-1 border border-stone-600 rounded-md p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-stone-700 text-stone-100' : 'text-stone-500 hover:text-stone-300'}`}
            aria-label="Grid view"
            title="Grid view"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect
                x="1"
                y="1"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <rect
                x="11"
                y="1"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <rect
                x="1"
                y="11"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <rect
                x="11"
                y="11"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('coverflow')}
            className={`p-1.5 rounded ${viewMode === 'coverflow' ? 'bg-stone-700 text-stone-100' : 'text-stone-500 hover:text-stone-300'}`}
            aria-label="Cover Flow view"
            title="Cover Flow view"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect
                x="5"
                y="2"
                width="8"
                height="14"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M3 5L1 6.5V11.5L3 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 5L17 6.5V11.5L15 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Recipe Grid */}
      {/* Cover Flow View */}
      {viewMode === 'coverflow' && recipes.length > 0 && <RecipeCoverFlow recipes={recipes} />}

      {/* Empty state (either view mode) */}
      {recipes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-500 mb-2">Your Recipe Book is empty.</p>
            <p className="text-sm text-stone-400 mb-6">
              Start by importing recipes from text or recording them after your next dinner.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/recipes/dump">
                <Button>Recipe Dump</Button>
              </Link>
              <Link href="/recipes/new">
                <Button variant="secondary">Create Recipe</Button>
              </Link>
              <Link href="/import">
                <Button variant="secondary">Smart Import</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => {
            const gradient = CATEGORY_GRADIENTS[recipe.category] || CATEGORY_GRADIENTS.other
            return (
              <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
                <Card className="hover:border-brand-600 hover:shadow-sm transition-all cursor-pointer h-full overflow-hidden">
                  {/* Photo or gradient header */}
                  <div className={`relative h-32 bg-gradient-to-br ${gradient}`}>
                    {recipe.photo_url ? (
                      <Image
                        src={recipe.photo_url}
                        alt={recipe.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-serif italic text-white/20 select-none">
                          {recipe.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant={CATEGORY_COLORS[recipe.category] || 'default'}>
                        {recipe.category}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-semibold text-stone-100 leading-tight mb-1">
                      {recipe.name}
                      {recipe.variation_label && (
                        <span className="ml-1.5 text-xs font-normal text-brand-400">
                          ({recipe.variation_label})
                        </span>
                      )}
                    </h3>
                    {recipe.family_name && (
                      <p className="text-xs text-brand-500/70 mb-0.5">
                        {recipe.family_name} family
                      </p>
                    )}

                    {recipe.method && (
                      <p className="text-sm text-stone-400 line-clamp-2 mb-3">{recipe.method}</p>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                      {recipe.ingredient_count != null && (
                        <span>
                          {recipe.ingredient_count} ingredient
                          {recipe.ingredient_count !== 1 ? 's' : ''}
                        </span>
                      )}
                      {recipe.calories_per_serving != null && (
                        <span>
                          {recipe.calories_per_serving} kcal
                          {recipe.servings ? ` / ${recipe.servings} servings` : '/ serving'}
                        </span>
                      )}
                      {recipe.times_cooked > 0 && <span>Used {recipe.times_cooked}x</span>}
                      {recipe.total_cost_cents != null && recipe.has_all_prices && (
                        <span>${(recipe.total_cost_cents / 100).toFixed(2)}</span>
                      )}
                      {recipe.total_cost_cents != null && !recipe.has_all_prices && (
                        <span>~${(recipe.total_cost_cents / 100).toFixed(2)} est.</span>
                      )}
                    </div>

                    {(recipe.dietary_tags?.length > 0 ||
                      recipe.cuisine ||
                      (recipe.meal_type && recipe.meal_type !== 'any')) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {recipe.cuisine && (
                          <span className="text-xs px-1.5 py-0.5 bg-brand-950 text-brand-400 rounded">
                            {cuisineLabelMap[recipe.cuisine] || recipe.cuisine}
                          </span>
                        )}
                        {recipe.meal_type && recipe.meal_type !== 'any' && (
                          <span className="text-xs px-1.5 py-0.5 bg-purple-950 text-purple-400 rounded">
                            {mealTypeLabelMap[recipe.meal_type] || recipe.meal_type}
                          </span>
                        )}
                        {recipe.dietary_tags?.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-1.5 py-0.5 bg-green-950 text-green-700 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : null}

      {/* Recipe Import Dialog */}
      <RecipeImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <RecipeBatchImport open={batchImportOpen} onClose={() => setBatchImportOpen(false)} />
    </div>
  )
}
