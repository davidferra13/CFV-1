'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { createRecipe, addIngredientToRecipe, linkRecipeToComponent } from '@/lib/recipes/actions'
import { parseRecipeFromText } from '@/lib/ai/parse-recipe'
import type { ParsedRecipe, ParsedIngredient } from '@/lib/ai/parse-recipe'

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
  prefillComponent?: {
    componentId: string
    name: string
    category: string
  }
}

export function CreateRecipeClient({ aiConfigured, prefillComponent }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'import' | 'manual'>(aiConfigured ? 'import' : 'manual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      // Create the recipe
      const result = await createRecipe({
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
      })

      const recipeId = result.recipe.id

      // Add ingredients
      const validIngredients = ingredients.filter((ing) => ing.name.trim())
      for (let i = 0; i < validIngredients.length; i++) {
        const ing = validIngredients[i]
        await addIngredientToRecipe(recipeId, {
          ingredient_name: ing.name.trim(),
          ingredient_category: ing.category as any,
          ingredient_default_unit: ing.unit || 'unit',
          quantity: ing.quantity || 1,
          unit: ing.unit || 'unit',
          preparation_notes: ing.preparation_notes || undefined,
          is_optional: ing.is_optional,
          sort_order: i,
        })
      }

      // If created from a component prompt, link it
      if (prefillComponent?.componentId) {
        await linkRecipeToComponent(recipeId, prefillComponent.componentId)
      }

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

      {/* Smart Import — Input Phase */}
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
              <Button onClick={handleParse} disabled={!aiConfigured || !rawText.trim() || loading}>
                {loading ? 'Parsing...' : 'Parse Recipe'}
              </Button>
              <Button variant="ghost" onClick={() => setRawText('')} disabled={loading}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Smart Import — Review Phase */}
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
                    className="w-full border border-stone-600 rounded-md px-3 py-2 text-sm bg-surface"
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
                <label className="block text-sm font-medium text-stone-300 mb-1">Method</label>
                <Textarea
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  placeholder="Concise, outcome-oriented. The chef knows how to cook - just capture what to do."
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Detailed Method
                </label>
                <Textarea
                  value={methodDetailed}
                  onChange={(e) => setMethodDetailed(e.target.value)}
                  placeholder="Optional: more detailed version with specific techniques or timings"
                  rows={3}
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

              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes about this recipe"
                  rows={2}
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
                      <Input
                        type="text"
                        value={ing.name}
                        onChange={(e) => updateIngredientRow(index, 'name', e.target.value)}
                        placeholder="Ingredient name"
                      />
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
  )
}
