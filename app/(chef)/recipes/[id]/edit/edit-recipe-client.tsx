'use client'

import { useState } from 'react'
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
}

export function EditRecipeClient({ recipe }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  // Ingredients state
  const [existingIngredients, setExistingIngredients] = useState<ExistingIngredient[]>(
    recipe.ingredients.map((ri) => ({
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
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
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

      router.push(`/recipes/${recipe.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save changes')
      setLoading(false)
    }
  }

  return (
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
            <label className="block text-sm font-medium text-stone-300 mb-1">Detailed Method</label>
            <Textarea
              value={methodDetailed}
              onChange={(e) => setMethodDetailed(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Prep (min)</label>
              <Input type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Cook (min)</label>
              <Input type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} />
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

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Existing Ingredients */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Ingredients</CardTitle>
            <Button size="sm" variant="secondary" onClick={addNewRow}>
              Add Ingredient
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                  <Input type="text" value={ei.ingredient.name} disabled className="bg-stone-800" />
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
                    onChange={(e) => updateNew(index, 'quantity', parseFloat(e.target.value) || 0)}
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
  )
}
