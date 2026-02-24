// Seasonal Palette Form — Client Component
// Simple edit form: season notes, seasonal ingredients, go-to dishes.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateSeasonalPalette } from '@/lib/seasonal/actions'
import type { SeasonalPalette, MicroWindow, ProvenWin } from '@/lib/seasonal/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type RecipeOption = { id: string; name: string }

export function SeasonalPaletteForm({
  palette,
  recipes = [],
}: {
  palette: SeasonalPalette
  recipes?: RecipeOption[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Season Notes (stored as sensory_anchor in DB)
  const [seasonNotes, setSeasonNotes] = useState(palette.sensory_anchor ?? '')

  // Seasonal Ingredients (stored as micro_windows in DB)
  const [ingredients, setIngredients] = useState<MicroWindow[]>(
    palette.micro_windows.length > 0 ? palette.micro_windows : []
  )

  // Go-To Dishes (stored as proven_wins in DB)
  const [dishes, setDishes] = useState<ProvenWin[]>(
    palette.proven_wins.length > 0 ? palette.proven_wins : []
  )

  // --- Ingredient helpers ---
  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        ingredient: '',
        start_date: '',
        end_date: '',
        notes: '',
      },
    ])
  }
  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }
  const updateIngredient = (index: number, field: keyof MicroWindow, value: string) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setIngredients(updated)
  }

  // --- Dish helpers ---
  const addDish = () => {
    setDishes([...dishes, { dish_name: '', notes: '', recipe_id: null }])
  }
  const removeDish = (index: number) => {
    setDishes(dishes.filter((_, i) => i !== index))
  }
  const updateDish = (index: number, field: keyof ProvenWin, value: string | null) => {
    const updated = [...dishes]
    updated[index] = { ...updated[index], [field]: value } as ProvenWin
    setDishes(updated)
  }

  // --- Submit ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        await updateSeasonalPalette(palette.id, {
          season_name: palette.season_name,
          start_month_day: palette.start_month_day,
          end_month_day: palette.end_month_day,
          sensory_anchor: seasonNotes.trim() || null,
          micro_windows: ingredients.filter((w) => w.ingredient.trim()),
          proven_wins: dishes.filter((d) => d.dish_name.trim()),
        })
        setSuccess(true)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Season Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Season Notes</CardTitle>
          <p className="text-sm text-stone-500 mt-1">
            General notes about {palette.season_name} — what flavors you lean into, what approach
            you take, anything to remember.
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={seasonNotes}
            onChange={(e) => setSeasonNotes(e.target.value)}
            placeholder={`What defines ${palette.season_name} for you? What ingredients and flavors are front and center?`}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Seasonal Ingredients */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Seasonal Ingredients</CardTitle>
              <p className="text-sm text-stone-500 mt-1">
                What&apos;s available this season? Add dates if you want to track availability
                windows.
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addIngredient}>
              + Add Ingredient
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {ingredients.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-4">
              No ingredients added yet. Add what&apos;s in season to build your reference.
            </p>
          )}
          {ingredients.map((item, i) => (
            <div key={i} className="border border-stone-700 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-stone-400 uppercase tracking-wide">
                  Ingredient {i + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeIngredient(i)}
                  className="text-red-500 -mt-1"
                >
                  Remove
                </Button>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Ingredient</label>
                <Input
                  value={item.ingredient}
                  onChange={(e) => updateIngredient(i, 'ingredient', e.target.value)}
                  placeholder="e.g., wild ramps, stone fruit, butternut squash"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">
                    Available from (MM-DD)
                  </label>
                  <Input
                    value={item.start_date}
                    onChange={(e) => updateIngredient(i, 'start_date', e.target.value)}
                    placeholder="04-01"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">
                    Available until (MM-DD)
                  </label>
                  <Input
                    value={item.end_date}
                    onChange={(e) => updateIngredient(i, 'end_date', e.target.value)}
                    placeholder="04-21"
                    maxLength={5}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Notes (optional)
                </label>
                <Input
                  value={item.notes}
                  onChange={(e) => updateIngredient(i, 'notes', e.target.value)}
                  placeholder="e.g., sourced from local forager, peak mid-month"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Go-To Dishes */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Go-To Dishes</CardTitle>
              <p className="text-sm text-stone-500 mt-1">
                Reliable dishes that work great in {palette.season_name}. Your quick reference when
                planning menus.
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addDish}>
              + Add Dish
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {dishes.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-4">
              No dishes added yet. Add your reliable go-to dishes for {palette.season_name}.
            </p>
          )}
          {dishes.map((dish, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">Dish</label>
                  <Input
                    value={dish.dish_name}
                    onChange={(e) => updateDish(i, 'dish_name', e.target.value)}
                    placeholder="Wild mushroom risotto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">Notes</label>
                  <Input
                    value={dish.notes}
                    onChange={(e) => updateDish(i, 'notes', e.target.value)}
                    placeholder="Always a crowd pleaser"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">
                    Link to Recipe
                  </label>
                  <select
                    value={dish.recipe_id || ''}
                    onChange={(e) => updateDish(i, 'recipe_id', e.target.value || null)}
                    className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm bg-stone-900"
                  >
                    <option value="">No recipe linked</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeDish(i)}
                className="text-red-500 mt-6"
              >
                Remove
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Feedback */}
      {error && (
        <div className="bg-red-950 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-950 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">Saved!</p>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/settings/repertoire')}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
