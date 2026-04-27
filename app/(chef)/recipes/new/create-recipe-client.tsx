'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TiptapEditor } from '@/components/ui/tiptap-editor'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import {
  createRecipeWithIngredients,
  linkRecipeToComponent,
  checkIngredientPrices,
} from '@/lib/recipes/actions'
import type { IngredientPriceHint } from '@/lib/recipes/actions'
import { useTaxonomy } from '@/components/hooks/use-taxonomy'
import { parseRecipeFromText } from '@/lib/ai/parse-recipe'
import { IngredientHazardBadge } from '@/components/culinary/ingredient-hazard-badge'
import type { ParsedRecipe, ParsedIngredient } from '@/lib/ai/parse-recipe'
import { NutritionalCalculator } from '@/components/recipes/NutritionalCalculator'
import { recalculateAndSaveRecipeNutrition } from '@/lib/recipes/nutritional-calculator-actions'
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

type IngredientRow = {
  name: string
  quantity: number
  unit: string
  category: string
  preparation_notes: string
  is_optional: boolean
}

type Props = {
  aiConfigured: boolean
  chefId: string
  prefillComponent?: {
    componentId: string
    name: string
    category: string
  }
}

export function CreateRecipeClient({ aiConfigured, chefId, prefillComponent }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'import' | 'manual'>(aiConfigured ? 'import' : 'manual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Taxonomy-driven options (system defaults shown instantly, chef customizations merged async)
  const { entries: cuisineEntries } = useTaxonomy('cuisine')
  const { entries: occasionEntries } = useTaxonomy('occasion')
  const { entries: seasonEntries } = useTaxonomy('season')
  const { entries: mealTypeEntries } = useTaxonomy('meal_type')

  // Smart Import state
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<ParsedRecipe | null>(null)
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low' | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [phase, setPhase] = useState<'input' | 'review'>('input')

  // Manual form state
  const [name, setName] = useState(prefillComponent?.name || '')
  const [category, setCategory] = useState(prefillComponent?.category || 'other')
  const [method, setMethod] = useState('')
  const [methodDetailed, setMethodDetailed] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [yieldQty, setYieldQty] = useState('')
  const [yieldUnit, setYieldUnit] = useState('')
  const [dietaryTags, setDietaryTags] = useState('')
  const [servings, setServings] = useState('')
  const [caloriesPerServing, setCaloriesPerServing] = useState('')
  const [difficulty, setDifficulty] = useState<number>(0)
  const [equipment, setEquipment] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [mealType, setMealType] = useState('')
  const [season, setSeason] = useState<string[]>([])
  const [occasionTags, setOccasionTags] = useState<string[]>([])
  const [customOccasion, setCustomOccasion] = useState('')
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    {
      name: '',
      quantity: 1,
      unit: '',
      category: 'other',
      preparation_notes: '',
      is_optional: false,
    },
  ])

  // ---- Ingredient price hints (debounced batch check) ----
  const [priceHints, setPriceHints] = useState<Map<string, boolean>>(new Map())
  const priceCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (priceCheckTimer.current) clearTimeout(priceCheckTimer.current)
    const names = ingredients.map((i) => i.name.trim()).filter(Boolean)
    if (names.length === 0) return

    priceCheckTimer.current = setTimeout(async () => {
      try {
        const hints = await checkIngredientPrices(names)
        const map = new Map<string, boolean>()
        for (const h of hints) map.set(h.name, h.hasPrice)
        setPriceHints(map)
      } catch {
        // Non-blocking: price hints are a convenience, not critical
      }
    }, 800)

    return () => {
      if (priceCheckTimer.current) clearTimeout(priceCheckTimer.current)
    }
  }, [ingredients])

  // ---- Form protection (draft persistence + unsaved changes guard) ----
  const defaultData = useMemo(
    () => ({
      name: prefillComponent?.name || '',
      category: prefillComponent?.category || 'other',
      method: '',
      methodDetailed: '',
      description: '',
      notes: '',
      prepTime: '',
      cookTime: '',
      yieldQty: '',
      yieldUnit: '',
      dietaryTags: '',
      ingredients: JSON.stringify([
        {
          name: '',
          quantity: 1,
          unit: '',
          category: 'other',
          preparation_notes: '',
          is_optional: false,
        },
      ]),
    }),
    [prefillComponent]
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
      ingredients: JSON.stringify(ingredients),
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
      ingredients,
    ]
  )

  const protection = useProtectedForm({
    surfaceId: 'recipe-create',
    recordId: null,
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
    if (typeof d.ingredients === 'string') {
      try {
        setIngredients(JSON.parse(d.ingredients))
      } catch {
        /* skip */
      }
    }
  }, [])

  // Smart Import: parse
  const handleParse = async () => {
    if (!rawText.trim()) return
    setLoading(true)
    setError('')

    try {
      const result = await parseRecipeFromText(rawText)
      setParsed(result.parsed)
      setConfidence(result.confidence)
      setWarnings(result.warnings)
      setPhase('review')

      // Pre-populate manual fields from parsed data for easy editing
      setName(result.parsed.name)
      setCategory(result.parsed.category)
      setMethod(result.parsed.method)
      setMethodDetailed(result.parsed.method_detailed || '')
      setDescription(result.parsed.description || '')
      setNotes(result.parsed.notes || '')
      setPrepTime(result.parsed.prep_time_minutes?.toString() || '')
      setCookTime(result.parsed.cook_time_minutes?.toString() || '')
      setYieldQty(result.parsed.yield_quantity?.toString() || '')
      setYieldUnit(result.parsed.yield_unit || '')
      setDietaryTags((result.parsed.dietary_tags || []).join(', '))
      setIngredients(
        result.parsed.ingredients.length > 0
          ? result.parsed.ingredients.map((ing: ParsedIngredient) => ({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              category: ing.category,
              preparation_notes: ing.preparation_notes || '',
              is_optional: ing.is_optional,
            }))
          : [
              {
                name: '',
                quantity: 1,
                unit: '',
                category: 'other',
                preparation_notes: '',
                is_optional: false,
              },
            ]
      )
    } catch (err: any) {
      setError(err.message || 'Failed to parse recipe')
    } finally {
      setLoading(false)
    }
  }

  // Add ingredient row
  const addIngredientRow = () => {
    setIngredients([
      ...ingredients,
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

  // Remove ingredient row
  const removeIngredientRow = (index: number) => {
    if (ingredients.length <= 1) return
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  // Update ingredient row
  const updateIngredientRow = (
    index: number,
    field: keyof IngredientRow,
    value: string | number | boolean
  ) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setIngredients(updated)
  }

  // Save recipe
  const handleSave = async () => {
    if (!name.trim()) {
      setError('Recipe name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const validIngredients = ingredients.filter((ing) => ing.name.trim())

      // Atomic create: recipe + all ingredients in one call with rollback on failure
      const result = await createRecipeWithIngredients(
        {
          name: name.trim(),
          category,
          method: method.trim(),
          method_detailed: methodDetailed.trim() || undefined,
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
          prep_time_minutes: prepTime ? parseInt(prepTime) : undefined,
          cook_time_minutes: cookTime ? parseInt(cookTime) : undefined,
          total_time_minutes:
            prepTime && cookTime ? parseInt(prepTime) + parseInt(cookTime) : undefined,
          yield_quantity: yieldQty ? parseFloat(yieldQty) : undefined,
          yield_unit: yieldUnit.trim() || undefined,
          dietary_tags: dietaryTags
            ? dietaryTags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : undefined,
          servings: servings ? parseInt(servings) : undefined,
          calories_per_serving: caloriesPerServing ? parseInt(caloriesPerServing) : undefined,
          difficulty: difficulty >= 1 ? difficulty : undefined,
          equipment: equipment
            ? equipment
                .split(',')
                .map((e) => e.trim())
                .filter(Boolean)
            : undefined,
          cuisine: cuisine || undefined,
          meal_type: mealType || undefined,
          season: season.length > 0 ? season : undefined,
          occasion_tags: occasionTags.length > 0 ? occasionTags : undefined,
        },
        validIngredients.map((ing, i) => ({
          ingredient_name: ing.name.trim(),
          ingredient_category: ing.category as any,
          ingredient_default_unit: ing.unit || 'unit',
          quantity: ing.quantity || 1,
          unit: ing.unit || 'unit',
          preparation_notes: ing.preparation_notes || undefined,
          is_optional: ing.is_optional,
          sort_order: i,
        }))
      )

      if (!result.success) {
        setError(result.message)
        setLoading(false)
        return
      }

      const recipeId = result.recipeId

      // If created from a component prompt, link it (non-blocking)
      if (prefillComponent?.componentId) {
        await linkRecipeToComponent(recipeId, prefillComponent.componentId).catch(() => null)
      }

      // Nutrition enrichment is non-blocking for the primary save path.
      await recalculateAndSaveRecipeNutrition(recipeId).catch(() => null)

      protection.markCommitted()
      router.push(`/recipes/${recipeId}`)
    } catch (err: any) {
      setError(err.message || 'Failed to save recipe')
      setLoading(false)
    }
  }

  const handleStartOver = () => {
    setPhase('input')
    setParsed(null)
    setConfidence(null)
    setWarnings([])
    setRawText('')
    setName(prefillComponent?.name || '')
    setCategory(prefillComponent?.category || 'other')
    setMethod('')
    setMethodDetailed('')
    setDescription('')
    setNotes('')
    setPrepTime('')
    setCookTime('')
    setYieldQty('')
    setYieldUnit('')
    setDietaryTags('')
    setServings('')
    setCaloriesPerServing('')
    setDifficulty(0)
    setEquipment('')
    setCuisine('')
    setMealType('')
    setSeason([])
    setOccasionTags([])
    setCustomOccasion('')
    setIngredients([
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
            <h1 className="text-3xl font-bold text-stone-100">New Recipe</h1>
            {prefillComponent && (
              <p className="text-stone-400 mt-1">Recording recipe for: {prefillComponent.name}</p>
            )}
          </div>
          <Link href="/recipes">
            <Button variant="ghost">Back to Recipes</Button>
          </Link>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {/* Mode Tabs */}
        <div className="flex gap-1 border-b border-stone-700">
          <button
            onClick={() => {
              setMode('import')
              setPhase('input')
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              mode === 'import'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-stone-500 hover:text-stone-300'
            }`}
          >
            Smart Import
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              mode === 'manual'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-stone-500 hover:text-stone-300'
            }`}
          >
            Manual Entry
          </button>
        </div>

        {/* Smart Import - Input Phase */}
        {mode === 'import' && phase === 'input' && (
          <Card>
            <CardHeader>
              <CardTitle>Describe Your Recipe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!aiConfigured && (
                <Alert variant="warning">
                  Smart import is not configured. Contact your administrator to enable this feature.
                </Alert>
              )}
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Diane sauce - sear the steak, set aside. Saut&eacute; shallots and mushrooms. Deglaze with cognac. Add beef stock, cream, worcestershire, dijon. Reduce. Finish with steak drippings, lemon, parsley. Makes about 2 cups."
                rows={8}
                disabled={!aiConfigured || loading}
              />
              <div className="flex gap-3">
                <Button
                  onClick={handleParse}
                  disabled={!aiConfigured || !rawText.trim() || loading}
                >
                  {loading ? 'Parsing...' : 'Parse Recipe'}
                </Button>
                <Button variant="ghost" onClick={() => setRawText('')} disabled={loading}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Smart Import - Review Phase */}
        {mode === 'import' && phase === 'review' && parsed && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge
                variant={
                  confidence === 'high' ? 'success' : confidence === 'medium' ? 'warning' : 'error'
                }
              >
                {confidence} confidence
              </Badge>
              {warnings.length > 0 && (
                <span className="text-sm text-amber-600">{warnings.length} warning(s)</span>
              )}
            </div>

            {warnings.length > 0 && (
              <Alert variant="warning">
                {warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </Alert>
            )}

            <p className="text-sm text-stone-400">
              Review and edit the parsed recipe below, then save.
            </p>
          </div>
        )}

        {/* Manual Form / Review Form (same form for both modes) */}
        {(mode === 'manual' || (mode === 'import' && phase === 'review')) && (
          <div className="space-y-6">
            {/* Basic Info */}
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

                {description !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Description
                    </label>
                    <Input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description"
                    />
                  </div>
                )}

                <div>
                  <TiptapEditor
                    label="Method"
                    value={method}
                    onChange={setMethod}
                    placeholder="Concise, outcome-oriented. The chef knows how to cook - just capture what to do."
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
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Prep (min)
                    </label>
                    <Input
                      type="number"
                      value={prepTime}
                      onChange={(e) => setPrepTime(e.target.value)}
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Cook (min)
                    </label>
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
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Yield Unit
                    </label>
                    <Input
                      type="text"
                      value={yieldUnit}
                      onChange={(e) => setYieldUnit(e.target.value)}
                      placeholder="servings"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">
                    Dietary Tags
                  </label>
                  <Input
                    type="text"
                    value={dietaryTags}
                    onChange={(e) => setDietaryTags(e.target.value)}
                    placeholder="gluten-free, dairy-free (comma separated)"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Servings
                    </label>
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
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Meal Type
                    </label>
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
                  <label className="block text-sm font-medium text-stone-300 mb-1">
                    Occasion Tags
                  </label>
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
                        if (
                          customOccasion.trim() &&
                          !occasionTags.includes(customOccasion.trim())
                        ) {
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
                              onClick={() =>
                                setOccasionTags((prev) => prev.filter((t) => t !== tag))
                              }
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
                  <Button size="sm" variant="secondary" onClick={addIngredientRow}>
                    Add Ingredient
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ingredients.map((ing, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 min-w-[140px]">
                        {index === 0 && (
                          <label className="block text-xs text-stone-500 mb-1">Name</label>
                        )}
                        <div className="relative">
                          <Input
                            type="text"
                            value={ing.name}
                            onChange={(e) => updateIngredientRow(index, 'name', e.target.value)}
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
                        {index === 0 && (
                          <label className="block text-xs text-stone-500 mb-1">Qty</label>
                        )}
                        <Input
                          type="number"
                          value={ing.quantity}
                          onChange={(e) =>
                            updateIngredientRow(index, 'quantity', parseFloat(e.target.value) || 0)
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
                          onChange={(e) => updateIngredientRow(index, 'unit', e.target.value)}
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
                            updateIngredientRow(index, 'preparation_notes', e.target.value)
                          }
                          placeholder="diced, etc."
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        {index === 0 && (
                          <label className="block text-xs text-stone-500 mb-1">&nbsp;</label>
                        )}
                        <button
                          onClick={() => removeIngredientRow(index)}
                          className="p-2 text-stone-400 hover:text-red-500"
                          title="Remove ingredient"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <NutritionalCalculator
              ingredients={ingredients.map((ingredient) => ({
                name: ingredient.name,
                quantity: Number(ingredient.quantity) || 0,
                unit: ingredient.unit,
              }))}
              servings={parseInt(servings || '1', 10) || 1}
              onApplyCalories={(calories) => setCaloriesPerServing(String(Math.max(0, calories)))}
            />

            {/* Actions */}
            <div className="flex justify-between">
              {mode === 'import' && phase === 'review' && (
                <Button variant="ghost" onClick={handleStartOver} disabled={loading}>
                  Start Over
                </Button>
              )}
              <div className="flex gap-3 ml-auto">
                <Link href="/recipes">
                  <Button variant="ghost" disabled={loading}>
                    Cancel
                  </Button>
                </Link>
                <Button onClick={handleSave} disabled={loading || !name.trim()}>
                  {loading ? 'Saving...' : 'Save Recipe'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </FormShield>
  )
}
