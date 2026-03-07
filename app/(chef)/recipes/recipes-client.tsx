'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { RecipeListItem } from '@/lib/recipes/actions'
import { CUISINE_DISPLAY, MEAL_TYPE_DISPLAY } from '@/lib/recipes/recipe-constants'

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

const CUISINE_OPTIONS = [
  { value: '', label: 'All Cuisines' },
  ...Object.entries(CUISINE_DISPLAY).map(([value, label]) => ({ value, label })),
]

const MEAL_TYPE_OPTIONS = [
  { value: '', label: 'All Meal Types' },
  ...Object.entries(MEAL_TYPE_DISPLAY).map(([value, label]) => ({ value, label })),
]

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

type Props = {
  recipes: RecipeListItem[]
}

export function RecipeLibraryClient({ recipes }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams() ?? new URLSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')

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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Recipe Book</h1>
          <p className="text-stone-400 mt-1">
            {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} in your collection
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/recipes/production-log">
            <Button variant="ghost">Production Log</Button>
          </Link>
          <Link href="/recipes/ingredients">
            <Button variant="secondary">Ingredients</Button>
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
      </div>

      {/* Recipe Grid */}
      {recipes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-500 mb-2">Your Recipe Book is empty.</p>
            <p className="text-sm text-stone-400 mb-6">
              Start by importing recipes from text or recording them after your next dinner.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/recipes/new">
                <Button>Create First Recipe</Button>
              </Link>
              <Link href="/import">
                <Button variant="secondary">Smart Import</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
              <Card className="hover:border-brand-600 hover:shadow-sm transition-all cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-stone-100 leading-tight">{recipe.name}</h3>
                    <Badge variant={CATEGORY_COLORS[recipe.category] || 'default'}>
                      {recipe.category}
                    </Badge>
                  </div>

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
                        <span className="text-xs px-1.5 py-0.5 bg-blue-950 text-blue-400 rounded">
                          {CUISINE_DISPLAY[recipe.cuisine] || recipe.cuisine}
                        </span>
                      )}
                      {recipe.meal_type && recipe.meal_type !== 'any' && (
                        <span className="text-xs px-1.5 py-0.5 bg-purple-950 text-purple-400 rounded">
                          {MEAL_TYPE_DISPLAY[recipe.meal_type] || recipe.meal_type}
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
          ))}
        </div>
      )}
    </div>
  )
}
