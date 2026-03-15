'use client'

import { useState, useTransition } from 'react'
import { searchFoodDatabase, getFoodNutrients } from '@/lib/nutrition/nutrition-actions'
import type { USDAFoodSearchResult, NutrientInfo } from '@/lib/nutrition/usda-client'

type IngredientNutritionSearchProps = {
  ingredientName?: string
  onSelect: (fdcId: number, nutrients: NutrientInfo, description: string) => void
  onCancel?: () => void
}

/**
 * Search the USDA FoodData Central database for an ingredient.
 * Shows results with nutrient preview. User selects to link
 * the ingredient to a USDA food item.
 */
export function IngredientNutritionSearch({
  ingredientName = '',
  onSelect,
  onCancel,
}: IngredientNutritionSearchProps) {
  const [query, setQuery] = useState(ingredientName)
  const [results, setResults] = useState<USDAFoodSearchResult[]>([])
  const [selectedFdcId, setSelectedFdcId] = useState<number | null>(null)
  const [selectedNutrients, setSelectedNutrients] = useState<NutrientInfo | null>(null)
  const [selectedDescription, setSelectedDescription] = useState<string>('')
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSearch() {
    if (!query.trim()) return

    setSearchError(null)
    startTransition(async () => {
      try {
        const res = await searchFoodDatabase(query.trim())
        if (res.success) {
          setResults(res.results)
          if (res.results.length === 0) {
            setSearchError('No results found. Try a different search term.')
          }
        } else {
          setResults([])
          setSearchError(res.error || 'Search failed')
        }
      } catch {
        setResults([])
        setSearchError('Failed to search USDA database')
      }
    })
  }

  function handleSelectFood(food: USDAFoodSearchResult) {
    setSelectedFdcId(food.fdcId)
    setSelectedNutrients(food.nutrients)
    setSelectedDescription(food.description)
  }

  function handleConfirm() {
    if (selectedFdcId && selectedNutrients) {
      onSelect(selectedFdcId, selectedNutrients, selectedDescription)
    }
  }

  function handleLoadDetailed(fdcId: number) {
    startTransition(async () => {
      try {
        const res = await getFoodNutrients(fdcId)
        if (res.success && res.nutrients) {
          setSelectedNutrients(res.nutrients)
          setSelectedDescription(res.description || selectedDescription)
        }
      } catch {
        // Keep the search-level nutrients if detailed fetch fails
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search USDA food database..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          disabled={isPending || !query.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Searching...' : 'Search'}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Error */}
      {searchError && (
        <p className="text-sm text-red-600">{searchError}</p>
      )}

      {/* Results list */}
      {results.length > 0 && (
        <div className="max-h-[400px] overflow-y-auto rounded-md border border-gray-200">
          {results.map((food) => (
            <button
              key={food.fdcId}
              onClick={() => handleSelectFood(food)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors ${
                selectedFdcId === food.fdcId ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {food.description}
                  </p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span>{food.dataType}</span>
                    {food.brandOwner && <span>{food.brandOwner}</span>}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-600 shrink-0">
                  <div className="font-medium">{Math.round(food.nutrients.calories)} cal</div>
                  <div>P: {food.nutrients.protein_g}g</div>
                  <div>C: {food.nutrients.carbs_g}g</div>
                  <div>F: {food.nutrients.fat_g}g</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected food detail */}
      {selectedFdcId && selectedNutrients && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Selected Food</h4>
              <p className="text-xs text-gray-600">{selectedDescription}</p>
              <p className="text-xs text-gray-400 mt-0.5">FDC ID: {selectedFdcId}</p>
            </div>
            <button
              onClick={() => handleLoadDetailed(selectedFdcId)}
              disabled={isPending}
              className="text-xs text-blue-600 underline hover:text-blue-800"
            >
              Load detailed data
            </button>
          </div>

          {/* Nutrient preview */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            <NutrientBadge label="Calories" value={`${Math.round(selectedNutrients.calories)}`} />
            <NutrientBadge label="Protein" value={`${selectedNutrients.protein_g}g`} />
            <NutrientBadge label="Carbs" value={`${selectedNutrients.carbs_g}g`} />
            <NutrientBadge label="Fat" value={`${selectedNutrients.fat_g}g`} />
            <NutrientBadge label="Fiber" value={`${selectedNutrients.fiber_g}g`} />
            <NutrientBadge label="Sodium" value={`${selectedNutrients.sodium_mg}mg`} />
            <NutrientBadge label="Sugar" value={`${selectedNutrients.sugar_g}g`} />
          </div>

          <p className="text-[10px] text-gray-400 mt-2">
            Values per 100g as reported by USDA FoodData Central
          </p>

          {/* Confirm button */}
          <div className="flex justify-end mt-3">
            <button
              onClick={handleConfirm}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Link this food
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function NutrientBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white px-2 py-1 text-center border border-gray-200">
      <div className="font-medium text-gray-900">{value}</div>
      <div className="text-gray-500 text-[10px]">{label}</div>
    </div>
  )
}
