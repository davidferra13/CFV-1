'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TiptapEditor } from '@/components/ui/tiptap-editor'
import { Alert } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  updateRecipe,
  addIngredientToRecipe,
  updateRecipeIngredient,
  removeIngredientFromRecipe,
  checkIngredientPrices,
} from '@/lib/recipes/actions'
import type { IngredientPriceHint } from '@/lib/recipes/actions'
import { useTaxonomy } from '@/components/hooks/use-taxonomy'
import { IngredientHazardBadge } from '@/components/culinary/ingredient-hazard-badge'
import { useProtectedForm } from '@/lib/qol/use-protected-form'
import { FormShield } from '@/components/forms/form-shield'

const RECIPE_CATEGORIES = [
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
]

type ExistingIngredient = {
  id: string
  ingredientId: string
  name: string
  quantity: number
  unit: string
  category: string
  preparation_notes: string
  is_optional: boolean
  _dirty: boolean
  _deleted: boolean
}

type NewIngredient = {
  _tempId: string
  name: string
  quantity: number
  unit: string
  category: string
  preparation_notes: string
  is_optional: boolean
}

type Props = {
  recipe: any
  chefId: string
}

export function EditRecipeClient({ recipe, chefId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Taxonomy-driven options
  const { entries: cuisineEntries } = useTaxonomy('cuisine')
  const { entries: occasionEntries } = useTaxonomy('occasion')
  const { entries: seasonEntries } = useTaxonomy('season')
  const { entries: mealTypeEntries } = useTaxonomy('meal_type')

  // Form state, pre-filled from recipe
  const [name, setName] = useState(recipe.name || '')
  const [category, setCategory] = useState(recipe.category || 'other')
  const [method, setMethod] = useState(recipe.method || '')
  const [methodDetailed, setMethodDetailed] = useState(recipe.method_detailed || '')
  const [description, setDescription] = useState(recipe.description || '')
  const [notes, setNotes] = useState(recipe.notes || '')
  const [prepTime, setPrepTime] = useState(recipe.prep_time_minutes?.toString() || '')
  const [cookTime, setCookTime] = useState(recipe.cook_time_minutes?.toString() || '')
  const [yieldQty, setYieldQty] = useState(recipe.yield_quantity?.toString() || '')
  const [yieldUnit, setYieldUnit] = useState(recipe.yield_unit || '')
  const [dietaryTags, setDietaryTags] = useState((recipe.dietary_tags || []).join(', '))
  const [servings, setServings] = useState(recipe.servings?.toString() || '')
  const [caloriesPerServing, setCaloriesPerServing] = useState(
    recipe.calories_per_serving?.toString() || ''
  )
  const [difficulty, setDifficulty] = useState<number>(recipe.difficulty || 0)
  const [equipment, setEquipment] = useState((recipe.equipment || []).join(', '))
  const [cuisine, setCuisine] = useState(recipe.cuisine || '')
  const [mealType, setMealType] = useState(recipe.meal_type || '')
  const [season, setSeason] = useState<string[]>(recipe.season || [])
  const [occasionTags, setOccasionTags] = useState<string[]>(recipe.occasion_tags || [])
  const [customOccasion, setCustomOccasion] = useState('')

  // Existing ingredients (from DB, can be edited or marked deleted)
  const [existingIngredients, setExistingIngredients] = useState<ExistingIngredient[]>(
    (recipe.ingredients || []).map((ri: any) => ({
      id: ri.id,
      ingredientId: ri.ingredient?.id || '',
      name: ri.ingredient?.name || '',
      quantity: ri.quantity ?? 1,
      unit: ri.unit || '',
      category: ri.ingredient?.category || 'other',
      preparation_notes: ri.preparation_notes || '',
      is_optional: ri.is_optional || false,
      _dirty: false,
      _deleted: false,
    }))
  )

  // New ingredients to add
  const [newIngredients, setNewIngredients] = useState<NewIngredient[]>([])
  const nextTempId = useRef(0)

  // Ingredient price hints
  const [priceHints, setPriceHints] = useState<Map<string, boolean>>(new Map())
  const priceCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allIngredientNames = useMemo(() => {
    const existing = existingIngredients
      .filter((i) => !i._deleted)
      .map((i) => i.name.trim())
      .filter(Boolean)
    const added = newIngredients.map((i) => i.name.trim()).filter(Boolean)
    return [...existing, ...added]
  }, [existingIngredients, newIngredients])

  useEffect(() => {
    if (priceCheckTimer.current) clearTimeout(priceCheckTimer.current)
    if (allIngredientNames.length === 0) return

    priceCheckTimer.current = setTimeout(async () => {
      try {
        const hints = await checkIngredientPrices(allIngredientNames)
        const map = new Map<string, boolean>()
        for (const h of hints) map.set(h.name, h.hasPrice)
        setPriceHints(map)
      } catch {
        // Non-blocking
      }
    }, 800)

    return () => {
      if (priceCheckTimer.current) clearTimeout(priceCheckTimer.current)
    }
  }, [allIngredientNames])

  // Form protection
  const defaultData = useMemo(
    () => ({
      name: recipe.name || '',
      category: recipe.category || 'other',
      method: recipe.method || '',
      description: recipe.description || '',
      notes: recipe.notes || '',
    }),
    [recipe]
  )

  const currentData = useMemo(
    () => ({
      name,
      category,
      method,
      description,
      notes,
    }),
    [name, category, method, description, notes]
  )

  const protection = useProtectedForm({
    surfaceId: 'recipe-edit',
    recordId: recipe.id,
    tenantId: chefId,
    defaultData,
    currentData,
    throttleMs: 10000,
  })

  const applyFormData = useCallback((d: Record<string, unknown>) => {
    if (typeof d.name === 'string') setName(d.name)
    if (typeof d.category === 'string') setCategory(d.category)
    if (typeof d.method === 'string') setMethod(d.method)
    if (typeof d.description === 'string') setDescription(d.description)
    if (typeof d.notes === 'string') setNotes(d.notes)
  }, [])

  // Existing ingredient handlers
  const updateExistingIngredient = (
    index: number,
    field: keyof ExistingIngredient,
    value: string | number | boolean
  ) => {
    setExistingIngredients((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value, _dirty: true }
      return updated
    })
  }

  const markIngredientDeleted = (index: number) => {
    setExistingIngredients((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], _deleted: true }
      return updated
    })
  }

  const undeleteIngredient = (index: number) => {
    setExistingIngredients((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], _deleted: false }
      return updated
    })
  }

  // New ingredient handlers
  const addNewIngredientRow = () => {
    setNewIngredients((prev) => [
      ...prev,
      {
        _tempId: `new-${nextTempId.current++}`,
        name: '',
        quantity: 1,
        unit: '',
        category: 'other',
        preparation_notes: '',
        is_optional: false,
      },
    ])
  }

  const updateNewIngredient = (
    index: number,
    field: keyof NewIngredient,
    value: string | number | boolean
  ) => {
    setNewIngredients((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const removeNewIngredient = (index: number) => {
    setNewIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  // Save handler
  const handleSave = async () => {
    if (!name.trim()) {
      setError('Recipe name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 1. Update recipe metadata
      const updateResult = await updateRecipe(recipe.id, {
        name: name.trim(),
        category,
        method: method.trim(),
        method_detailed: methodDetailed.trim() || null,
        description: description.trim() || null,
        notes: notes.trim() || null,
        prep_time_minutes: prepTime ? parseInt(prepTime) : null,
        cook_time_minutes: cookTime ? parseInt(cookTime) : null,
        total_time_minutes: prepTime && cookTime ? parseInt(prepTime) + parseInt(cookTime) : null,
        yield_quantity: yieldQty ? parseFloat(yieldQty) : null,
        yield_unit: yieldUnit.trim() || null,
        dietary_tags: dietaryTags
          ? dietaryTags
              .split(',')
              .map((t: string) => t.trim())
              .filter(Boolean)
          : [],
        servings: servings ? parseInt(servings) : null,
        calories_per_serving: caloriesPerServing ? parseInt(caloriesPerServing) : null,
        difficulty: difficulty >= 1 ? difficulty : null,
        equipment: equipment
          ? equipment
              .split(',')
              .map((e: string) => e.trim())
              .filter(Boolean)
          : [],
        cuisine: cuisine || null,
        meal_type: mealType || null,
        season: season.length > 0 ? season : [],
        occasion_tags: occasionTags.length > 0 ? occasionTags : [],
      })

      if (!updateResult.success) {
        setError('Failed to update recipe')
        setLoading(false)
        return
      }

      // 2. Process ingredient deletions
      const deletions = existingIngredients.filter((i) => i._deleted)
      for (const ing of deletions) {
        try {
          await removeIngredientFromRecipe(ing.id)
        } catch (err) {
          console.error('[EditRecipe] Failed to remove ingredient:', err)
        }
      }

      // 3. Process ingredient updates (dirty, not deleted)
      const updates = existingIngredients.filter((i) => i._dirty && !i._deleted)
      for (const ing of updates) {
        try {
          await updateRecipeIngredient(ing.id, {
            quantity: ing.quantity,
            unit: ing.unit || 'unit',
            preparation_notes: ing.preparation_notes || null,
            is_optional: ing.is_optional,
          })
        } catch (err) {
          console.error('[EditRecipe] Failed to update ingredient:', err)
        }
      }

      // 4. Process new ingredients
      const validNew = newIngredients.filter((i) => i.name.trim())
      const existingCount = existingIngredients.filter((i) => !i._deleted).length
      for (let i = 0; i < validNew.length; i++) {
        const ing = validNew[i]
        try {
          await addIngredientToRecipe(recipe.id, {
            ingredient_name: ing.name.trim(),
            ingredient_category: ing.category as any,
            ingredient_default_unit: ing.unit || 'unit',
            quantity: ing.quantity || 1,
            unit: ing.unit || 'unit',
            preparation_notes: ing.preparation_notes || undefined,
            is_optional: ing.is_optional,
            sort_order: existingCount + i,
          })
        } catch (err) {
          console.error('[EditRecipe] Failed to add ingredient:', err)
        }
      }

      protection.markCommitted()
      toast.success('Recipe updated')
      router.push(`/culinary/recipes/${recipe.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to save recipe')
      setLoading(false)
    }
  }

  const activeExisting = existingIngredients.filter((i) => !i._deleted)
  const deletedExisting = existingIngredients.filter((i) => i._deleted)

  return (
    <FormShield
      guard={protection.guard}
      showRestorePrompt={protection.showRestorePrompt}
      lastSavedAt={protection.lastSavedAt}
      onRestore={() => {
        const d = protection.restoreDraft()
        if (d) applyFormData(d)
      }}
      onDiscard={protection.discardDraft}
      saveState={protection.saveState}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Edit Recipe</h1>
            <p className="text-stone-400 mt-1">{recipe.name}</p>
          </div>
          <Link href={`/culinary/recipes/${recipe.id}`}>
            <Button variant="ghost">Back to Recipe</Button>
          </Link>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {/* Recipe Details */}
        <Card>
          <CardHeader>
            <CardTitle>Recipe Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Recipe Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Diane Sauce"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  aria-label="Category"
                  className="w-full border border-stone-600 rounded-md px-3 py-2 text-sm bg-stone-900"
                >
                  {RECIPE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Description</label>
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description"
              />
            </div>

            <div>
              <TiptapEditor
                label="Method"
                value={method}
                onChange={setMethod}
                placeholder="Concise, outcome-oriented. The chef knows how to cook."
                minHeight={120}
                toolbar={['text', 'list', 'insert']}
              />
            </div>

            <div>
              <TiptapEditor
                label="Detailed Method"
                value={methodDetailed}
                onChange={setMethodDetailed}
                placeholder="Optional: more detailed version with specific techniques or timings"
                minHeight={100}
                toolbar={['text', 'heading', 'list', 'insert']}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Prep (min)</label>
                <Input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  placeholder="15"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Cook (min)</label>
                <Input
                  type="number"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  placeholder="30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Yield</label>
                <Input
                  type="number"
                  value={yieldQty}
                  onChange={(e) => setYieldQty(e.target.value)}
                  placeholder="4"
                  step="0.25"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Yield Unit</label>
                <Input
                  type="text"
                  value={yieldUnit}
                  onChange={(e) => setYieldUnit(e.target.value)}
                  placeholder="servings"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Dietary Tags</label>
              <Input
                type="text"
                value={dietaryTags}
                onChange={(e) => setDietaryTags(e.target.value)}
                placeholder="gluten-free, dairy-free (comma separated)"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Servings</label>
                <Input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  placeholder="e.g. 4"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Calories / Serving
                </label>
                <Input
                  type="number"
                  value={caloriesPerServing}
                  onChange={(e) => setCaloriesPerServing(e.target.value)}
                  placeholder="e.g. 320"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Difficulty (1-5)
                </label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setDifficulty(difficulty === level ? 0 : level)}
                      className={`w-9 h-9 rounded-md text-sm font-medium transition-colors ${
                        level <= difficulty
                          ? 'bg-brand-500 text-white'
                          : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Equipment</label>
              <Input
                type="text"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                placeholder="stand mixer, food processor, blowtorch (comma separated)"
              />
            </div>

            {/* Organization Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Cuisine</label>
                <select
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  aria-label="Cuisine"
                  className="w-full border border-stone-600 rounded-md px-3 py-2 text-sm bg-stone-900"
                >
                  <option value="">Select cuisine...</option>
                  {cuisineEntries.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.displayLabel}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Meal Type</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  aria-label="Meal Type"
                  className="w-full border border-stone-600 rounded-md px-3 py-2 text-sm bg-stone-900"
                >
                  <option value="">Select meal type...</option>
                  {mealTypeEntries.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.displayLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Season</label>
              <div className="flex flex-wrap gap-2">
                {seasonEntries.map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    onClick={() => {
                      const label = entry.displayLabel
                      if (label === 'Year-Round') {
                        setSeason(season.includes(label) ? [] : [label])
                      } else {
                        setSeason((prev) => {
                          const without = prev.filter((x) => x !== 'Year-Round')
                          return without.includes(label)
                            ? without.filter((x) => x !== label)
                            : [...without, label]
                        })
                      }
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      season.includes(entry.displayLabel)
                        ? 'border-brand-500 bg-brand-950 text-brand-400 font-medium'
                        : 'border-stone-600 text-stone-400 hover:bg-stone-800'
                    }`}
                  >
                    {entry.displayLabel}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Occasion Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {occasionEntries.map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    onClick={() =>
                      setOccasionTags((prev) =>
                        prev.includes(entry.displayLabel)
                          ? prev.filter((t) => t !== entry.displayLabel)
                          : [...prev, entry.displayLabel]
                      )
                    }
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      occasionTags.includes(entry.displayLabel)
                        ? 'border-brand-500 bg-brand-950 text-brand-400'
                        : 'border-stone-600 text-stone-400 hover:bg-stone-800'
                    }`}
                  >
                    {entry.displayLabel}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={customOccasion}
                  onChange={(e) => setCustomOccasion(e.target.value)}
                  placeholder="Add custom occasion..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customOccasion.trim()) {
                      e.preventDefault()
                      if (!occasionTags.includes(customOccasion.trim())) {
                        setOccasionTags([...occasionTags, customOccasion.trim()])
                      }
                      setCustomOccasion('')
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (customOccasion.trim() && !occasionTags.includes(customOccasion.trim())) {
                      setOccasionTags([...occasionTags, customOccasion.trim()])
                    }
                    setCustomOccasion('')
                  }}
                  disabled={!customOccasion.trim()}
                >
                  Add
                </Button>
              </div>
              {occasionTags.filter(
                (t: string) => !occasionEntries.some((e) => e.displayLabel === t)
              ).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {occasionTags
                    .filter((t: string) => !occasionEntries.some((e: any) => e.displayLabel === t))
                    .map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-stone-800 text-stone-300 rounded-full"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setOccasionTags((prev) => prev.filter((t) => t !== tag))}
                          className="hover:text-red-400"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                </div>
              )}
            </div>

            <div>
              <TiptapEditor
                label="Notes"
                value={notes}
                onChange={setNotes}
                placeholder="Any additional notes about this recipe"
                minHeight={80}
                compact
              />
            </div>
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Ingredients</CardTitle>
              <Button size="sm" variant="secondary" onClick={addNewIngredientRow}>
                Add Ingredient
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Existing ingredients */}
              {existingIngredients.map((ing, index) =>
                ing._deleted ? null : (
                  <div key={ing.id} className="flex gap-2 items-start">
                    <div className="flex-1 min-w-[140px]">
                      {index === 0 && (
                        <label className="block text-xs text-stone-500 mb-1">Name</label>
                      )}
                      <div className="relative">
                        <Input
                          type="text"
                          value={ing.name}
                          disabled
                          className="opacity-70"
                          title="Ingredient name cannot be changed. Remove and re-add instead."
                        />
                        {ing.name.trim() && priceHints.has(ing.name.trim().toLowerCase()) && (
                          <span
                            className={`absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
                              priceHints.get(ing.name.trim().toLowerCase())
                                ? 'bg-emerald-500'
                                : 'bg-stone-600'
                            }`}
                            title={
                              priceHints.get(ing.name.trim().toLowerCase())
                                ? 'Price data available'
                                : 'No price data yet'
                            }
                          />
                        )}
                      </div>
                    </div>
                    <div className="w-20">
                      {index === 0 && (
                        <label className="block text-xs text-stone-500 mb-1">Qty</label>
                      )}
                      <Input
                        type="number"
                        value={ing.quantity}
                        onChange={(e) =>
                          updateExistingIngredient(
                            index,
                            'quantity',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        step="0.25"
                      />
                    </div>
                    <div className="w-24">
                      {index === 0 && (
                        <label className="block text-xs text-stone-500 mb-1">Unit</label>
                      )}
                      <Input
                        type="text"
                        value={ing.unit}
                        onChange={(e) => updateExistingIngredient(index, 'unit', e.target.value)}
                        placeholder="cup, tbsp"
                      />
                    </div>
                    <div className="w-28">
                      {index === 0 && (
                        <label className="block text-xs text-stone-500 mb-1">Prep</label>
                      )}
                      <Input
                        type="text"
                        value={ing.preparation_notes}
                        onChange={(e) =>
                          updateExistingIngredient(index, 'preparation_notes', e.target.value)
                        }
                        placeholder="diced, etc."
                      />
                    </div>
                    <div className="flex items-end pb-1">
                      {index === 0 && (
                        <label className="block text-xs text-stone-500 mb-1">&nbsp;</label>
                      )}
                      <button
                        onClick={() => markIngredientDeleted(index)}
                        className="p-2 text-stone-400 hover:text-red-500"
                        title="Remove ingredient"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* New ingredients */}
              {newIngredients.map((ing, index) => (
                <div key={ing._tempId} className="flex gap-2 items-start">
                  <div className="flex-1 min-w-[140px]">
                    {activeExisting.length === 0 && index === 0 && (
                      <label className="block text-xs text-stone-500 mb-1">Name</label>
                    )}
                    <div className="relative">
                      <Input
                        type="text"
                        value={ing.name}
                        onChange={(e) => updateNewIngredient(index, 'name', e.target.value)}
                        placeholder="Ingredient name"
                      />
                      {ing.name.trim() && priceHints.has(ing.name.trim().toLowerCase()) && (
                        <span
                          className={`absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
                            priceHints.get(ing.name.trim().toLowerCase())
                              ? 'bg-emerald-500'
                              : 'bg-stone-600'
                          }`}
                          title={
                            priceHints.get(ing.name.trim().toLowerCase())
                              ? 'Price data available'
                              : 'No price data yet'
                          }
                        />
                      )}
                    </div>
                    <IngredientHazardBadge ingredientName={ing.name} />
                  </div>
                  <div className="w-20">
                    {activeExisting.length === 0 && index === 0 && (
                      <label className="block text-xs text-stone-500 mb-1">Qty</label>
                    )}
                    <Input
                      type="number"
                      value={ing.quantity}
                      onChange={(e) =>
                        updateNewIngredient(index, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      step="0.25"
                    />
                  </div>
                  <div className="w-24">
                    {activeExisting.length === 0 && index === 0 && (
                      <label className="block text-xs text-stone-500 mb-1">Unit</label>
                    )}
                    <Input
                      type="text"
                      value={ing.unit}
                      onChange={(e) => updateNewIngredient(index, 'unit', e.target.value)}
                      placeholder="cup, tbsp"
                    />
                  </div>
                  <div className="w-28">
                    {activeExisting.length === 0 && index === 0 && (
                      <label className="block text-xs text-stone-500 mb-1">Prep</label>
                    )}
                    <Input
                      type="text"
                      value={ing.preparation_notes}
                      onChange={(e) =>
                        updateNewIngredient(index, 'preparation_notes', e.target.value)
                      }
                      placeholder="diced, etc."
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    {activeExisting.length === 0 && index === 0 && (
                      <label className="block text-xs text-stone-500 mb-1">&nbsp;</label>
                    )}
                    <button
                      onClick={() => removeNewIngredient(index)}
                      className="p-2 text-stone-400 hover:text-red-500"
                      title="Remove ingredient"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}

              {activeExisting.length === 0 && newIngredients.length === 0 && (
                <p className="text-sm text-stone-500">
                  No ingredients. Click "Add Ingredient" to start.
                </p>
              )}
            </div>

            {/* Deleted ingredients (undo zone) */}
            {deletedExisting.length > 0 && (
              <div className="mt-4 pt-4 border-t border-stone-800">
                <p className="text-xs text-stone-500 mb-2">
                  Removed ({deletedExisting.length}) - will be deleted on save
                </p>
                <div className="flex flex-wrap gap-2">
                  {existingIngredients.map((ing, index) =>
                    !ing._deleted ? null : (
                      <button
                        key={ing.id}
                        onClick={() => undeleteIngredient(index)}
                        className="text-xs px-2.5 py-1 rounded-full border border-stone-700 text-stone-500 hover:text-stone-300 hover:border-stone-500 line-through decoration-red-500/50 transition-colors"
                      >
                        {ing.name} (undo)
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between">
          <Link href={`/culinary/recipes/${recipe.id}`}>
            <Button variant="ghost" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={loading || !name.trim()}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </FormShield>
  )
}
