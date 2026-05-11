'use client'

import { useState, useTransition } from 'react'
import { Leaf, UtensilsCrossed, Users, Star } from '@/components/ui/icons'
import { SeasonalIngredientGrid } from './seasonal-ingredient-grid'
import { SeasonalRecipeCard } from './seasonal-recipe-card'
import {
  fetchSeasonalIngredients,
  fetchSeasonalRecipes,
  fetchSeasonalMenuSuggestion,
} from '@/lib/intelligence/seasonal-menu-actions'
import type { SeasonalIngredient } from '@/lib/intelligence/seasonal-menu'
import type { SeasonalRecipeMatch } from '@/lib/intelligence/seasonal-menu'
import type { SeasonalMenuSuggestion } from '@/lib/intelligence/seasonal-menu'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function SeasonalMenuBuilderForm() {
  const currentMonth = new Date().getMonth() + 1
  const [month, setMonth] = useState(currentMonth)
  const [guestCount, setGuestCount] = useState(8)
  const [ingredients, setIngredients] = useState<SeasonalIngredient[]>([])
  const [recipes, setRecipes] = useState<SeasonalRecipeMatch[]>([])
  const [menu, setMenu] = useState<SeasonalMenuSuggestion | null>(null)
  const [activeTab, setActiveTab] = useState<'ingredients' | 'recipes' | 'menu'>('ingredients')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  function handleMonthChange(newMonth: number) {
    setMonth(newMonth)
    setLoaded(false)
    setIngredients([])
    setRecipes([])
    setMenu(null)
  }

  function loadData() {
    setError(null)
    startTransition(async () => {
      try {
        const [ingredientData, recipeData] = await Promise.all([
          fetchSeasonalIngredients(month, 'northeast'),
          fetchSeasonalRecipes(month, 'northeast'),
        ])
        setIngredients(ingredientData)
        setRecipes(recipeData)
        setLoaded(true)
      } catch (err) {
        setError('Failed to load seasonal data. Please try again.')
        console.error('[SeasonalMenuBuilder]', err)
      }
    })
  }

  function buildMenu() {
    setError(null)
    startTransition(async () => {
      try {
        const suggestion = await fetchSeasonalMenuSuggestion(month, 'northeast', guestCount)
        setMenu(suggestion)
        setActiveTab('menu')
      } catch (err) {
        setError('Failed to build menu suggestion. Please try again.')
        console.error('[SeasonalMenuBuilder]', err)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs text-stone-500 uppercase tracking-wide block mb-1.5">
            Month
          </label>
          <select
            value={month}
            onChange={(e) => handleMonthChange(Number(e.target.value))}
            className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
                {i + 1 === currentMonth ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-stone-500 uppercase tracking-wide block mb-1.5">
            Guest Count
          </label>
          <input
            type="number"
            min={1}
            max={200}
            value={guestCount}
            onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value)))}
            className="w-20 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
          />
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-800 px-4 py-2 text-sm font-medium text-stone-200 hover:bg-stone-700 hover:border-stone-600 transition-colors disabled:opacity-50"
        >
          <Leaf className="h-4 w-4" />
          {isPending ? 'Loading...' : loaded ? 'Refresh' : 'See What\u2019s in Season'}
        </button>

        {loaded && (
          <button
            type="button"
            onClick={buildMenu}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-xl gradient-accent px-5 py-2 text-sm font-medium text-white glow-hover disabled:opacity-50"
          >
            <UtensilsCrossed className="h-4 w-4" />
            {isPending ? 'Building...' : 'Build Seasonal Menu'}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-800/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {isPending && !loaded && (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      )}

      {/* Tabs */}
      {loaded && (
        <>
          <div className="flex gap-1 border-b border-stone-800">
            {(['ingredients', 'recipes', 'menu'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-brand-500 text-stone-200'
                    : 'border-transparent text-stone-500 hover:text-stone-300'
                }`}
              >
                {tab === 'ingredients' && `In Season (${ingredients.length})`}
                {tab === 'recipes' && `Recipes (${recipes.length})`}
                {tab === 'menu' && 'Menu Suggestion'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'ingredients' && (
            <div>
              <p className="text-sm text-stone-500 mb-4">
                Ingredients that are at peak season or in your seasonal palette for {MONTH_NAMES[month - 1]}.
              </p>
              <SeasonalIngredientGrid ingredients={ingredients} />
            </div>
          )}

          {activeTab === 'recipes' && (
            <div>
              <p className="text-sm text-stone-500 mb-4">
                Your recipes ranked by seasonal ingredient coverage. Higher match means more of the recipe uses what is in season.
              </p>
              {recipes.length === 0 ? (
                <div className="text-center py-8 text-stone-500">
                  No recipes found with seasonal ingredients. Add recipes with seasonal ingredients to see suggestions.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recipes.slice(0, 12).map((recipe) => (
                    <SeasonalRecipeCard key={recipe.id} recipe={recipe} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'menu' && (
            <div>
              {!menu ? (
                <div className="text-center py-12">
                  <UtensilsCrossed className="h-8 w-8 text-stone-600 mx-auto mb-3" />
                  <p className="text-stone-500 text-sm">
                    Click &ldquo;Build Seasonal Menu&rdquo; to generate a menu suggestion for {MONTH_NAMES[month - 1]}.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Menu Header */}
                  <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <h3 className="text-lg font-semibold text-stone-200">
                          {menu.seasonName} Menu for {menu.monthName}
                        </h3>
                        <p className="text-sm text-stone-500 mt-1">
                          {menu.courses.length} courses, {menu.guestCount} guests, {menu.seasonalCoverage}% seasonal coverage
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-400">
                        <Leaf className="h-5 w-5" />
                        <span className="text-lg font-bold">{menu.seasonalCoverage}%</span>
                        <span className="text-xs text-stone-500 ml-1">seasonal</span>
                      </div>
                    </div>
                  </div>

                  {/* Course List */}
                  <div className="space-y-3">
                    {menu.courses.map((course, i) => (
                      <div
                        key={`${course.course}-${i}`}
                        className="rounded-xl border border-stone-800 bg-stone-900/30 p-4 flex items-center gap-4"
                      >
                        <div className="w-24 shrink-0">
                          <span className="text-xs uppercase tracking-wide text-stone-500 font-medium">
                            {course.course}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {course.recipe ? (
                            <>
                              <p className="text-sm font-medium text-stone-200 truncate">
                                {course.recipe.name}
                              </p>
                              <p className="text-xs text-stone-500 mt-0.5">
                                {course.reason}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-stone-600 italic">No match found</p>
                          )}
                        </div>
                        {course.recipe?.rating && (
                          <div className="flex items-center gap-0.5 text-amber-400 shrink-0">
                            <Star className="h-3.5 w-3.5" weight="fill" />
                            <span className="text-xs">{course.recipe.rating}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Cost Summary */}
                  {menu.totalEstimatedCostCents > 0 && (
                    <div className="flex items-center gap-6 text-sm text-stone-400 border-t border-stone-800 pt-4">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>{menu.guestCount} guests</span>
                      </div>
                      <div>
                        Estimated: ${(menu.totalEstimatedCostCents / 100).toFixed(2)} total
                      </div>
                      <div>
                        ${(menu.perGuestCostCents / 100).toFixed(2)}/guest
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
