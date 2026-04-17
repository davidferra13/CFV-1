'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import {
  updateRecipe,
  addIngredientToRecipe,
  removeIngredientFromRecipe,
  updateRecipeIngredient,
} from '@/lib/recipes/actions'
import { useTaxonomy } from '@/components/hooks/use-taxonomy'
import { ProductLookupPanel } from '@/components/recipes/product-lookup-panel'
import { NutritionalCalculator } from '@/components/recipes/NutritionalCalculator'
import { recalculateAndSaveRecipeNutrition } from '@/lib/recipes/nutritional-calculator-actions'
import { useProtectedForm } from '@/lib/qol/use-protected-form'
import { FormShield } from '@/components/forms/form-shield'
import { updateRecipePeakWindow } from '@/lib/prep-timeline/actions'
import { getCategoryDefault } from '@/lib/prep-timeline/peak-defaults'
import { formatHoursAsReadable } from '@/lib/prep-timeline/compute-timeline'
import { ChevronDown, ChevronUp, Snowflake } from '@/components/ui/icons'

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
  quantity: number
  unit: string
  preparation_notes: string | null
  is_optional: boolean
  sort_order: number
  ingredient: {
    id: string
    name: string
    category: string
    default_unit: string
    average_price_cents: number | null
  }
}

type NewIngredient = {
  name: string
  quantity: number
  unit: string
  category: string
  preparation_notes: string
  is_optional: boolean
}

type RecipeDetail = NonNullable<
  Awaited<ReturnType<typeof import('@/lib/recipes/actions').getRecipeById>>
>

type Props = {
  recipe: RecipeDetail
  chefId: string
}

export function EditRecipeClient({ recipe, chefId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Taxonomy-driven options (system defaults shown instantly, chef customizations merged async)
  const { entries: cuisineEntries } = useTaxonomy('cuisine')
  const { entries: occasionEntries } = useTaxonomy('occasion')
  const { entries: seasonEntries } = useTaxonomy('season')
  const { entries: mealTypeEntries } = useTaxonomy('meal_type')

  // Form state
  const [name, setName] = useState(recipe.name)
  const [category, setCategory] = useState<string>(recipe.category)
  const [method, setMethod] = useState(recipe.method)
  const [methodDetailed, setMethodDetailed] = useState(recipe.method_detailed || '')
  const [description, setDescription] = useState(recipe.description || '')
  const [notes, setNotes] = useState(recipe.notes || '')
  const [prepTime, setPrepTime] = useState(recipe.prep_time_minutes?.toString() || '')
  const [cookTime, setCookTime] = useState(recipe.cook_time_minutes?.toString() || '')
  const [yieldQty, setYieldQty] = useState(recipe.yield_quantity?.toString() || '')
  const [yieldUnit, setYieldUnit] = useState(recipe.yield_unit || '')
  const [dietaryTags, setDietaryTags] = useState((recipe.dietary_tags || []).join(', '))
  const [servings, setServings] = useState((recipe as any).servings?.toString() || '')
  const [caloriesPerServing, setCaloriesPerServing] = useState(
    (recipe as any).calories_per_serving?.toString() || ''
  )
  const [difficulty, setDifficulty] = useState<number>((recipe as any).difficulty || 0)
  const [equipment, setEquipment] = useState(((recipe as any).equipment || []).join(', '))
  const [cuisine, setCuisine] = useState<string>(recipe.cuisine || '')
  const [mealType, setMealType] = useState<string>(recipe.meal_type || '')
  const [season, setSeason] = useState<string[]>(recipe.season || [])
  const [occasionTags, setOccasionTags] = useState<string[]>(recipe.occasion_tags || [])
  const [customOccasion, setCustomOccasion] = useState('')

  // Peak freshness state
  const [peakHoursMin, setPeakHoursMin] = useState((recipe as any).peak_hours_min?.toString() || '')
  const [peakHoursMax, setPeakHoursMax] = useState((recipe as any).peak_hours_max?.toString() || '')
  const [safetyHoursMax, setSafetyHoursMax] = useState(
    (recipe as any).safety_hours_max?.toString() || ''
  )
  const [storageMethod, setStorageMethod] = useState<string>(
    (recipe as any).storage_method || 'fridge'
  )
  const [freezable, setFreezable] = useState<boolean>((recipe as any).freezable || false)
  const [frozenExtendsHours, setFrozenExtendsHours] = useState(
    (recipe as any).frozen_extends_hours?.toString() || ''
  )
  const [peakSectionOpen, setPeakSectionOpen] = useState(
    (recipe as any).peak_hours_min != null || (recipe as any).peak_hours_max != null
  )
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const categoryDefaults = getCategoryDefault(category)

  // Ingredients state
  const [existingIngredients, setExistingIngredients] = useState<ExistingIngredient[]>(
    recipe.ingredients.map((ri: any) => ({
      id: ri.id,
      quantity: ri.quantity,
      unit: ri.unit,
      preparation_notes: ri.preparation_notes,
      is_optional: ri.is_optional,
      sort_order: ri.sort_order,
      ingredient: ri.ingredient,
    }))
  )
  const [removedIngredientIds, setRemovedIngredientIds] = useState<string[]>([])
  const [newIngredients, setNewIngredients] = useState<NewIngredient[]>([])

  // Existing ingredient modifications
  const [modifiedIngredients, setModifiedIngredients] = useState<Set<string>>(new Set())

  // ---- Form protection (draft persistence + unsaved changes guard) ----
  const defaultData = useMemo(
    () => ({
      name: recipe.name,
      category: recipe.category,
      method: recipe.method,
      methodDetailed: recipe.method_detailed || '',
      description: recipe.description || '',
      notes: recipe.notes || '',
      prepTime: recipe.prep_time_minutes?.toString() || '',
      cookTime: recipe.cook_time_minutes?.toString() || '',
      yieldQty: recipe.yield_quantity?.toString() || '',
      yieldUnit: recipe.yield_unit || '',
      dietaryTags: (recipe.dietary_tags || []).join(', '),
      existingIngredients: JSON.stringify(
        recipe.ingredients.map((ri: any) => ({
          id: ri.id,
          quantity: ri.quantity,
          unit: ri.unit,
          preparation_notes: ri.preparation_notes,
          is_optional: ri.is_optional,
          sort_order: ri.sort_order,
          ingredient: ri.ingredient,
        }))
      ),
      newIngredients: JSON.stringify([]),
      removedIngredientIds: JSON.stringify([]),
    }),
    [recipe]
  )

  const currentData = useMemo(
    () => ({
      name,
      category,
      method,
      methodDetailed,
      description,
      notes,
      prepTime,
      cookTime,
      yieldQty,
      yieldUnit,
      dietaryTags,
      existingIngredients: JSON.stringify(existingIngredients),
      newIngredients: JSON.stringify(newIngredients),
      removedIngredientIds: JSON.stringify(removedIngredientIds),
    }),
    [
      name,
      category,
      method,
      methodDetailed,
      description,
      notes,
      prepTime,
      cookTime,
      yieldQty,
      yieldUnit,
      dietaryTags,
      existingIngredients,
      newIngredients,
      removedIngredientIds,
    ]
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
    if (typeof d.methodDetailed === 'string') setMethodDetailed(d.methodDetailed)
    if (typeof d.description === 'string') setDescription(d.description)
    if (typeof d.notes === 'string') setNotes(d.notes)
    if (typeof d.prepTime === 'string') setPrepTime(d.prepTime)
    if (typeof d.cookTime === 'string') setCookTime(d.cookTime)
    if (typeof d.yieldQty === 'string') setYieldQty(d.yieldQty)
    if (typeof d.yieldUnit === 'string') setYieldUnit(d.yieldUnit)
    if (typeof d.dietaryTags === 'string') setDietaryTags(d.dietaryTags)
    if (typeof d.existingIngredients === 'string') {
      try {
        setExistingIngredients(JSON.parse(d.existingIngredients))
      } catch {
        /* skip */
      }
    }
    if (typeof d.newIngredients === 'string') {
      try {
        setNewIngredients(JSON.parse(d.newIngredients))
      } catch {
        /* skip */
      }
    }
    if (typeof d.removedIngredientIds === 'string') {
      try {
        setRemovedIngredientIds(JSON.parse(d.removedIngredientIds))
      } catch {
        /* skip */
      }
    }
  }, [])

  // Product lookup state
  const [showProductLookup, setShowProductLookup] = useState(false)
  const [detectedAllergens, setDetectedAllergens] = useState<string[]>([])

  const updateExisting = (id: string, field: string, value: unknown) => {
    setExistingIngredients((prev) =>
      prev.map((ei) => (ei.id === id ? { ...ei, [field]: value } : ei))
    )
    setModifiedIngredients((prev) => new Set(prev).add(id))
  }

  const removeExisting = (id: string) => {
    setExistingIngredients((prev) => prev.filter((ei) => ei.id !== id))
    setRemovedIngredientIds((prev) => [...prev, id])
  }

  const addNewRow = () => {
    setNewIngredients([
      ...newIngredients,
      {
        name: '',
        quantity: 1,
        unit: '',
        category: 'other',
        preparation_notes: '',
        is_optional: false,
      },
    ])
  }

  const updateNew = (
    index: number,
    field: keyof NewIngredient,
    value: string | number | boolean
  ) => {
    const updated = [...newIngredients]
    updated[index] = { ...updated[index], [field]: value }
    setNewIngredients(updated)
  }

  const removeNew = (index: number) => {
    setNewIngredients(newIngredients.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Recipe name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Update recipe fields
      await updateRecipe(recipe.id, {
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
              .map((t: any) => t.trim())
              .filter(Boolean)
          : [],
        servings: servings ? parseInt(servings) : null,
        calories_per_serving: caloriesPerServing ? parseInt(caloriesPerServing) : null,
        difficulty: difficulty >= 1 ? difficulty : null,
        equipment: equipment
          ? equipment
              .split(',')
              .map((e: any) => e.trim())
              .filter(Boolean)
          : [],
        cuisine: cuisine || null,
        meal_type: mealType || null,
        season: season,
        occasion_tags: occasionTags,
      })

      // Remove deleted ingredients
      for (const riId of removedIngredientIds) {
        await removeIngredientFromRecipe(riId)
      }

      // Update modified existing ingredients
      for (const ei of existingIngredients) {
        if (modifiedIngredients.has(ei.id)) {
          await updateRecipeIngredient(ei.id, {
            quantity: ei.quantity,
            unit: ei.unit,
            preparation_notes: ei.preparation_notes,
            is_optional: ei.is_optional,
            sort_order: ei.sort_order,
          })
        }
      }

      // Add new ingredients
      const validNew = newIngredients.filter((ing) => ing.name.trim())
      const startOrder = existingIngredients.length
      for (let i = 0; i < validNew.length; i++) {
        const ing = validNew[i]
        await addIngredientToRecipe(recipe.id, {
          ingredient_name: ing.name.trim(),
          ingredient_category: ing.category as any,
          ingredient_default_unit: ing.unit || 'unit',
          quantity: ing.quantity || 1,
          unit: ing.unit || 'unit',
          preparation_notes: ing.preparation_notes || undefined,
          is_optional: ing.is_optional,
          sort_order: startOrder + i,
        })
      }

      await recalculateAndSaveRecipeNutrition(recipe.id).catch(() => null)

      // Save peak window (non-blocking, parallel with nutrition)
      await updateRecipePeakWindow({
        recipeId: recipe.id,
        peakHoursMin: peakHoursMin ? parseInt(peakHoursMin) : null,
        peakHoursMax: peakHoursMax ? parseInt(peakHoursMax) : null,
        safetyHoursMax: safetyHoursMax ? parseInt(safetyHoursMax) : null,
        storageMethod,
        freezable,
        frozenExtendsHours: frozenExtendsHours ? parseInt(frozenExtendsHours) : null,
      }).catch(() => null)

      protection.markCommitted()
      router.push(`/recipes/${recipe.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save changes')
      setLoading(false)
    }
  }

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
            <p className="text-stone-400 mt-1">Editing: {recipe.name}</p>
          </div>
          <Link href={`/recipes/${recipe.id}`}>
            <Button variant="ghost">Cancel</Button>
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
                <Input type="text" value={name} onChange={(e) => setName(e.target.value)} />
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Method</label>
              <Textarea value={method} onChange={(e) => setMethod(e.target.value)} rows={4} />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Detailed Method
              </label>
              <Textarea
                value={methodDetailed}
                onChange={(e) => setMethodDetailed(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Prep (min)</label>
                <Input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Cook (min)</label>
                <Input
                  type="number"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Yield</label>
                <Input
                  type="number"
                  value={yieldQty}
                  onChange={(e) => setYieldQty(e.target.value)}
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
                  Difficulty (1–5)
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
              {occasionTags.filter((t) => !occasionEntries.some((e) => e.displayLabel === t))
                .length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {occasionTags
                    .filter((t) => !occasionEntries.some((e) => e.displayLabel === t))
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
              <label className="block text-sm font-medium text-stone-300 mb-1">Notes</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Peak Freshness */}
        <Card>
          <CardHeader>
            <button
              type="button"
              onClick={() => setPeakSectionOpen(!peakSectionOpen)}
              className="flex items-center justify-between w-full text-left"
            >
              <CardTitle className="flex items-center gap-2">
                Peak Freshness
                {!peakHoursMin && !peakHoursMax && (
                  <span className="text-xs font-normal text-stone-500">
                    (using default: {formatHoursAsReadable(categoryDefaults.peakHoursMax)})
                  </span>
                )}
              </CardTitle>
              {peakSectionOpen ? (
                <ChevronUp className="h-4 w-4 text-stone-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-stone-500" />
              )}
            </button>
          </CardHeader>
          {peakSectionOpen && (
            <CardContent className="space-y-4">
              <p className="text-xs text-stone-500">
                How far ahead can you make this? Set the window for optimal quality.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">
                    Earliest (hours before service)
                  </label>
                  <Input
                    type="number"
                    value={peakHoursMax}
                    onChange={(e) => setPeakHoursMax(e.target.value)}
                    placeholder={categoryDefaults.peakHoursMax.toString()}
                    min={0}
                  />
                  <span className="text-xs text-stone-600 mt-0.5 block">
                    e.g. 72 = can make 3 days ahead
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">
                    Latest (hours before service)
                  </label>
                  <Input
                    type="number"
                    value={peakHoursMin}
                    onChange={(e) => setPeakHoursMin(e.target.value)}
                    placeholder={categoryDefaults.peakHoursMin.toString()}
                    min={0}
                  />
                  <span className="text-xs text-stone-600 mt-0.5 block">
                    e.g. 0 = can make day-of
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Storage</label>
                <div className="flex gap-2">
                  {(['room_temp', 'fridge', 'freezer'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setStorageMethod(method)}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                        storageMethod === method
                          ? 'border-brand-500 bg-brand-950 text-brand-400 font-medium'
                          : 'border-stone-600 text-stone-400 hover:bg-stone-800'
                      }`}
                    >
                      {method === 'room_temp'
                        ? 'Room temp'
                        : method === 'fridge'
                          ? 'Fridge'
                          : 'Freezer'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFreezable(!freezable)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    freezable
                      ? 'border-sky-500 bg-sky-950 text-sky-400'
                      : 'border-stone-600 text-stone-400 hover:bg-stone-800'
                  }`}
                >
                  <Snowflake className="h-3.5 w-3.5" />
                  Can be frozen
                </button>
                {freezable && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-stone-400">adds</label>
                    <Input
                      type="number"
                      value={frozenExtendsHours}
                      onChange={(e) => setFrozenExtendsHours(e.target.value)}
                      placeholder="hours"
                      className="w-24"
                      min={0}
                    />
                    <span className="text-sm text-stone-400">hours</span>
                  </div>
                )}
              </div>

              {/* Advanced (safety) */}
              <div>
                <button
                  type="button"
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="text-xs text-stone-600 hover:text-stone-400 flex items-center gap-1"
                >
                  {advancedOpen ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  Advanced
                </button>
                {advancedOpen && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Safety ceiling (hours)
                    </label>
                    <Input
                      type="number"
                      value={safetyHoursMax}
                      onChange={(e) => setSafetyHoursMax(e.target.value)}
                      placeholder={categoryDefaults.safetyHoursMax.toString()}
                      min={0}
                      className="w-32"
                    />
                    <span className="text-xs text-stone-600 mt-0.5 block">
                      Hard limit. System won't schedule prep earlier than this.
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Existing Ingredients */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Ingredients</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowProductLookup((prev) => !prev)}
                >
                  {showProductLookup ? 'Hide Product Lookup' : 'Search Product'}
                </Button>
                <Button size="sm" variant="secondary" onClick={addNewRow}>
                  Add Ingredient
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Product Lookup Panel (Open Food Facts) */}
            {showProductLookup && (
              <div className="mb-4">
                <ProductLookupPanel
                  defaultQuery={
                    newIngredients.length > 0 ? newIngredients[newIngredients.length - 1].name : ''
                  }
                  onAllergensFound={(allergens) => setDetectedAllergens(allergens)}
                />
              </div>
            )}

            {/* Allergen warning */}
            {detectedAllergens.length > 0 && (
              <div className="mb-4 bg-orange-950/50 border border-orange-900 rounded-lg px-4 py-3">
                <div className="flex items-start gap-2">
                  <span className="text-orange-500 text-lg leading-none mt-0.5">!</span>
                  <div>
                    <p className="text-sm font-medium text-orange-400">
                      Allergens detected in product
                    </p>
                    <p className="text-xs text-orange-600 mt-0.5">{detectedAllergens.join(', ')}</p>
                    <button
                      type="button"
                      onClick={() => setDetectedAllergens([])}
                      className="text-xs text-stone-500 hover:text-stone-300 mt-1"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {/* Column headers */}
              {(existingIngredients.length > 0 || newIngredients.length > 0) && (
                <div className="flex gap-2 items-center">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs text-stone-500">Name</label>
                  </div>
                  <div className="w-20">
                    <label className="block text-xs text-stone-500">Qty</label>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs text-stone-500">Unit</label>
                  </div>
                  <div className="w-28">
                    <label className="block text-xs text-stone-500">Prep</label>
                  </div>
                  <div className="w-8">&nbsp;</div>
                </div>
              )}

              {/* Existing ingredients */}
              {existingIngredients.map((ei) => (
                <div key={ei.id} className="flex gap-2 items-center">
                  <div className="flex-1 min-w-[140px]">
                    <Input
                      type="text"
                      value={ei.ingredient.name}
                      disabled
                      className="bg-stone-800"
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      value={ei.quantity}
                      onChange={(e) =>
                        updateExisting(ei.id, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      step="0.25"
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="text"
                      value={ei.unit}
                      onChange={(e) => updateExisting(ei.id, 'unit', e.target.value)}
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      type="text"
                      value={ei.preparation_notes || ''}
                      onChange={(e) =>
                        updateExisting(ei.id, 'preparation_notes', e.target.value || null)
                      }
                      placeholder="diced"
                    />
                  </div>
                  <button
                    onClick={() => removeExisting(ei.id)}
                    className="p-2 text-stone-400 hover:text-red-500"
                    title="Remove"
                  >
                    &times;
                  </button>
                </div>
              ))}

              {/* New ingredients */}
              {newIngredients.map((ing, index) => (
                <div
                  key={`new-${index}`}
                  className="flex gap-2 items-center border-l-2 border-brand-700 pl-2"
                >
                  <div className="flex-1 min-w-[140px]">
                    <Input
                      type="text"
                      value={ing.name}
                      onChange={(e) => updateNew(index, 'name', e.target.value)}
                      placeholder="New ingredient"
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      value={ing.quantity}
                      onChange={(e) =>
                        updateNew(index, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      step="0.25"
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="text"
                      value={ing.unit}
                      onChange={(e) => updateNew(index, 'unit', e.target.value)}
                      placeholder="cup, tbsp"
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      type="text"
                      value={ing.preparation_notes}
                      onChange={(e) => updateNew(index, 'preparation_notes', e.target.value)}
                      placeholder="diced"
                    />
                  </div>
                  <button
                    onClick={() => removeNew(index)}
                    className="p-2 text-stone-400 hover:text-red-500"
                    title="Remove"
                  >
                    &times;
                  </button>
                </div>
              ))}

              {existingIngredients.length === 0 && newIngredients.length === 0 && (
                <p className="text-stone-500 text-center py-4">
                  No ingredients. Click &ldquo;Add Ingredient&rdquo; to start.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <NutritionalCalculator
          ingredients={[
            ...existingIngredients.map((ingredient) => ({
              name: ingredient.ingredient.name,
              quantity: Number(ingredient.quantity) || 0,
              unit: ingredient.unit,
            })),
            ...newIngredients.map((ingredient) => ({
              name: ingredient.name,
              quantity: Number(ingredient.quantity) || 0,
              unit: ingredient.unit,
            })),
          ]}
          servings={parseInt(servings || '1', 10) || 1}
          onApplyCalories={(calories) => setCaloriesPerServing(String(Math.max(0, calories)))}
        />

        {/* Save/Cancel */}
        <div className="flex justify-end gap-3">
          <Link href={`/recipes/${recipe.id}`}>
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
