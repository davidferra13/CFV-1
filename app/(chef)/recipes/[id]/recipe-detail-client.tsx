'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  deleteRecipe,
  createRecipe,
  addIngredientToRecipe,
  addSubRecipe,
  removeSubRecipe,
} from '@/lib/recipes/actions'
import { CUISINE_DISPLAY, MEAL_TYPE_DISPLAY } from '@/lib/recipes/recipe-constants'
import { snapshotProductFromRecipe } from '@/lib/commerce/product-actions'
import { shareRecipe, getConnectedChefsForCollaboration } from '@/lib/collaboration/actions'
import { RecipeScalingCalculator } from '@/components/recipes/recipe-scaling-calculator'
import { NutritionPanel } from '@/components/recipes/nutrition-panel'
import { AllergenBadgePanel } from '@/components/recipes/allergen-badge-panel'
import { SubRecipeSearchModal } from '@/components/recipes/sub-recipe-search-modal'
import { DishPhotoUpload } from '@/components/dishes/dish-photo-upload'
import { trackAction } from '@/lib/ai/remy-activity-tracker'
import {
  logProduction,
  getProductionLog,
  deleteProductionEntry,
} from '@/lib/recipes/production-log-actions'
import type { ProductionLogEntry } from '@/lib/recipes/production-log-actions'
import { format, isPast, isBefore, addDays } from 'date-fns'

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

type RecipeDetail = NonNullable<
  Awaited<ReturnType<typeof import('@/lib/recipes/actions').getRecipeById>>
>

type Props = {
  recipe: RecipeDetail
}

export function RecipeDetailClient({ recipe }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareSuccess, setShareSuccess] = useState<string | null>(null)
  const [showSubRecipeModal, setShowSubRecipeModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLogEntryId, setDeleteLogEntryId] = useState<string | null>(null)

  // Production log state
  const [productionLog, setProductionLog] = useState<ProductionLogEntry[]>([])
  const [logLoaded, setLogLoaded] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)
  const [logQuantity, setLogQuantity] = useState('')
  const [logUnit, setLogUnit] = useState('servings')
  const [logProducedBy, setLogProducedBy] = useState('')
  const [logProducedAt, setLogProducedAt] = useState('')
  const [logBestBefore, setLogBestBefore] = useState('')
  const [logDiscardAt, setLogDiscardAt] = useState('')
  const [logBatchNotes, setLogBatchNotes] = useState('')

  const loadProductionLog = async () => {
    const entries = await getProductionLog(recipe.id)
    setProductionLog(entries)
    setLogLoaded(true)
  }

  const handleLogProduction = async () => {
    if (!logQuantity || parseFloat(logQuantity) <= 0) {
      setError('Quantity is required')
      return
    }
    setLoading(true)
    setError('')
    try {
      await logProduction({
        recipe_id: recipe.id,
        quantity: parseFloat(logQuantity),
        unit: logUnit || 'servings',
        produced_by: logProducedBy.trim() || undefined,
        produced_at: logProducedAt || undefined,
        best_before: logBestBefore || undefined,
        discard_at: logDiscardAt || undefined,
        batch_notes: logBatchNotes.trim() || undefined,
      })
      // Reset form
      setLogQuantity('')
      setLogUnit('servings')
      setLogProducedBy('')
      setLogProducedAt('')
      setLogBestBefore('')
      setLogDiscardAt('')
      setLogBatchNotes('')
      setShowLogForm(false)
      // Reload log
      await loadProductionLog()
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to log production')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLogEntry = async () => {
    if (!deleteLogEntryId) return
    setLoading(true)
    setError('')
    try {
      await deleteProductionEntry(deleteLogEntryId)
      setDeleteLogEntryId(null)
      await loadProductionLog()
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to delete log entry')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSubRecipe = async (input: {
    child_recipe_id: string
    quantity: number
    unit: string
  }) => {
    setLoading(true)
    setError('')
    try {
      await addSubRecipe(recipe.id, input)
      setShowSubRecipeModal(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to add sub-recipe')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveSubRecipe = async (subRecipeId: string) => {
    setLoading(true)
    setError('')
    try {
      await removeSubRecipe(subRecipeId)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to remove sub-recipe')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmedDelete = async () => {
    setShowDeleteConfirm(false)
    setLoading(true)
    try {
      await deleteRecipe(recipe.id)
      trackAction('Deleted recipe', recipe.name)
      router.push('/recipes')
    } catch (err: any) {
      setError(err.message || 'Failed to delete recipe')
      setLoading(false)
    }
  }

  const handleDuplicate = async () => {
    setLoading(true)
    setError('')

    try {
      const result = await createRecipe({
        name: `${recipe.name} (copy)`,
        category: recipe.category,
        method: recipe.method,
        method_detailed: recipe.method_detailed || undefined,
        description: recipe.description || undefined,
        notes: recipe.notes || undefined,
        prep_time_minutes: recipe.prep_time_minutes || undefined,
        cook_time_minutes: recipe.cook_time_minutes || undefined,
        total_time_minutes: recipe.total_time_minutes || undefined,
        yield_quantity: recipe.yield_quantity || undefined,
        yield_unit: recipe.yield_unit || undefined,
        yield_description: recipe.yield_description || undefined,
        dietary_tags: recipe.dietary_tags || undefined,
        servings: (recipe as any).servings || undefined,
        calories_per_serving: (recipe as any).calories_per_serving || undefined,
        difficulty: (recipe as any).difficulty || undefined,
        equipment: (recipe as any).equipment?.length ? (recipe as any).equipment : undefined,
        cuisine: recipe.cuisine || undefined,
        meal_type: recipe.meal_type || undefined,
        season: recipe.season?.length ? recipe.season : undefined,
        occasion_tags: recipe.occasion_tags?.length ? recipe.occasion_tags : undefined,
      })

      // Copy ingredients
      for (let i = 0; i < recipe.ingredients.length; i++) {
        const ing = recipe.ingredients[i]
        await addIngredientToRecipe(result.recipe.id, {
          ingredient_name: ing.ingredient.name,
          ingredient_category: ing.ingredient.category,
          ingredient_default_unit: ing.ingredient.default_unit,
          quantity: ing.quantity,
          unit: ing.unit,
          preparation_notes: ing.preparation_notes || undefined,
          is_optional: ing.is_optional,
          sort_order: i,
        })
      }

      trackAction('Duplicated recipe', `${recipe.name} → ${recipe.name} (copy)`)
      router.push(`/recipes/${result.recipe.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate recipe')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-100">{recipe.name}</h1>
            <Badge variant={CATEGORY_COLORS[recipe.category] || 'default'}>{recipe.category}</Badge>
          </div>
          {recipe.description && <p className="text-stone-400 mt-1">{recipe.description}</p>}
        </div>
        <div className="flex gap-2">
          <Link href={`/recipes/${recipe.id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
          <Button variant="secondary" onClick={handleDuplicate} disabled={loading}>
            Duplicate
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setShowShareModal(true)
              setShareSuccess(null)
            }}
            disabled={loading}
          >
            Share
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              const priceStr = window.prompt('Set a sale price for this product ($):')
              if (!priceStr) return
              const price = parseFloat(priceStr)
              if (isNaN(price) || price <= 0) {
                setError('Invalid price')
                return
              }
              setLoading(true)
              try {
                await snapshotProductFromRecipe({
                  recipeId: recipe.id,
                  priceCents: Math.round(price * 100),
                  category: recipe.category ?? undefined,
                })
                router.push('/commerce/products')
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to create product')
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
          >
            Create Product
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={loading}>
            Delete
          </Button>
          <Link href="/recipes">
            <Button variant="ghost">Back</Button>
          </Link>
        </div>
      </div>

      {/* Dish Photo */}
      <DishPhotoUpload
        entityType="recipe"
        entityId={recipe.id}
        currentPhotoUrl={(recipe as any).photo_url ?? null}
      />

      {error && <Alert variant="error">{error}</Alert>}
      {shareSuccess && <Alert variant="success">{shareSuccess}</Alert>}

      {/* Share with Chef modal */}
      {showShareModal && (
        <RecipeShareModal
          recipeId={recipe.id}
          recipeName={recipe.name}
          onSuccess={(chefName) => {
            setShowShareModal(false)
            setShareSuccess(
              `Recipe shared with ${chefName}. They'll receive an invitation to accept.`
            )
          }}
          onCancel={() => setShowShareModal(false)}
        />
      )}

      {/* Ingredients */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Ingredients ({recipe.ingredients.length})</CardTitle>
            <Link href={`/recipes/${recipe.id}/edit`}>
              <Button size="sm" variant="secondary">
                Edit Ingredients
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recipe.ingredients.length === 0 ? (
            <p className="text-stone-500 text-center py-4">No ingredients added yet.</p>
          ) : (
            <div className="space-y-2">
              {recipe.ingredients.map((ri: any) => (
                <div
                  key={ri.id}
                  className="flex justify-between items-center py-1 border-b border-stone-50 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-100">
                      {ri.quantity} {ri.unit} {ri.ingredient.name}
                    </span>
                    {ri.preparation_notes && (
                      <span className="text-sm text-stone-500">({ri.preparation_notes})</span>
                    )}
                    {ri.is_optional && (
                      <span className="text-xs px-1.5 py-0.5 bg-stone-800 text-stone-500 rounded">
                        optional
                      </span>
                    )}
                  </div>
                  {ri.ingredient.average_price_cents != null && (
                    <span className="text-sm text-stone-500">
                      ${(ri.ingredient.average_price_cents / 100).toFixed(2)}/
                      {ri.ingredient.default_unit}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sub-Recipes */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Sub-Recipes</CardTitle>
            <Button size="sm" variant="secondary" onClick={() => setShowSubRecipeModal(true)}>
              Add Sub-Recipe
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(recipe as any).subRecipes && (recipe as any).subRecipes.length > 0 ? (
            <div className="space-y-2">
              {(recipe as any).subRecipes.map((sub: any) => (
                <div
                  key={sub.id}
                  className="flex justify-between items-center py-1 border-b border-stone-50 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/recipes/${sub.child_recipe_id}`}
                      className="text-stone-100 hover:text-brand-500 hover:underline"
                    >
                      {sub.child_recipe?.name || sub.child_recipe_id}
                    </Link>
                    {sub.quantity != null && sub.unit && (
                      <span className="text-sm text-stone-500">
                        {sub.quantity} {sub.unit}
                      </span>
                    )}
                    {sub.child_recipe?.category && (
                      <Badge variant={CATEGORY_COLORS[sub.child_recipe.category] || 'default'}>
                        {sub.child_recipe.category}
                      </Badge>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubRecipe(sub.id)}
                    className="text-xs text-stone-400 hover:text-red-500"
                    disabled={loading}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-stone-500 text-center py-4">No sub-recipes added yet.</p>
          )}
        </CardContent>
      </Card>

      {showSubRecipeModal && (
        <SubRecipeSearchModal
          {...({
            onAdd: handleAddSubRecipe,
            onClose: () => setShowSubRecipeModal(false),
            parentRecipeId: recipe.id,
            existingSubRecipeIds: [],
            isOpen: showSubRecipeModal,
          } as any)}
        />
      )}

      {/* Used In */}
      {(recipe as any).usedInRecipes && (recipe as any).usedInRecipes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Used In</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(recipe as any).usedInRecipes.map((parent: any) => (
                <div key={parent.id} className="py-1 border-b border-stone-50 last:border-0">
                  <Link
                    href={`/recipes/${parent.parent_recipe_id}`}
                    className="text-stone-100 hover:text-brand-500 hover:underline text-sm"
                  >
                    {parent.parent_recipe?.name || parent.parent_recipe_id}
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scaling Calculator */}
      <RecipeScalingCalculator recipe={recipe} />

      {/* Nutrition (on-demand — fetches USDA data when chef clicks) */}
      <NutritionPanel recipeId={recipe.id} ingredientCount={recipe.ingredients.length} />

      {/* Allergen Detection (on-demand — uses Edamam API when chef clicks) */}
      <AllergenBadgePanel recipeId={recipe.id} ingredientCount={recipe.ingredients.length} />

      {/* Method */}
      {recipe.method && (
        <Card>
          <CardHeader>
            <CardTitle>Method</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone-100 whitespace-pre-wrap">{recipe.method}</p>
            {recipe.method_detailed && (
              <div className="mt-4 pt-4 border-t border-stone-800">
                <p className="text-sm font-medium text-stone-500 mb-1">Detailed Method</p>
                <p className="text-sm text-stone-300 whitespace-pre-wrap">
                  {recipe.method_detailed}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recipe.yield_quantity && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Yield</dt>
                <dd className="text-stone-100 mt-1">
                  {recipe.yield_quantity} {recipe.yield_unit || 'servings'}
                </dd>
              </div>
            )}
            {(recipe as any).servings && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Servings</dt>
                <dd className="text-stone-100 mt-1">{(recipe as any).servings}</dd>
              </div>
            )}
            {recipe.prep_time_minutes && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Prep Time</dt>
                <dd className="text-stone-100 mt-1">{recipe.prep_time_minutes} min</dd>
              </div>
            )}
            {recipe.cook_time_minutes && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Cook Time</dt>
                <dd className="text-stone-100 mt-1">{recipe.cook_time_minutes} min</dd>
              </div>
            )}
            {(recipe as any).calories_per_serving && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Calories / Serving</dt>
                <dd className="text-stone-100 mt-1">{(recipe as any).calories_per_serving} kcal</dd>
              </div>
            )}
            {(recipe as any).protein_per_serving_g != null && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Protein / Serving</dt>
                <dd className="text-stone-100 mt-1">{(recipe as any).protein_per_serving_g} g</dd>
              </div>
            )}
            {(recipe as any).fat_per_serving_g != null && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Fat / Serving</dt>
                <dd className="text-stone-100 mt-1">{(recipe as any).fat_per_serving_g} g</dd>
              </div>
            )}
            {(recipe as any).carbs_per_serving_g != null && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Carbs / Serving</dt>
                <dd className="text-stone-100 mt-1">{(recipe as any).carbs_per_serving_g} g</dd>
              </div>
            )}
            {(recipe as any).difficulty && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Difficulty</dt>
                <dd className="text-stone-100 mt-1">
                  <div className="flex gap-0.5 items-center">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <span
                        key={level}
                        className={`inline-block w-5 h-5 rounded text-center text-xs leading-5 font-medium ${
                          level <= (recipe as any).difficulty
                            ? 'bg-brand-500 text-white'
                            : 'bg-stone-800 text-stone-600'
                        }`}
                      >
                        {level}
                      </span>
                    ))}
                    <span className="ml-2 text-sm text-stone-400">
                      {(recipe as any).difficulty === 1 && 'Easy'}
                      {(recipe as any).difficulty === 2 && 'Simple'}
                      {(recipe as any).difficulty === 3 && 'Moderate'}
                      {(recipe as any).difficulty === 4 && 'Advanced'}
                      {(recipe as any).difficulty === 5 && 'Expert'}
                    </span>
                  </div>
                </dd>
              </div>
            )}
            {recipe.times_cooked > 0 && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Times Cooked</dt>
                <dd className="text-stone-100 mt-1">{recipe.times_cooked}</dd>
              </div>
            )}
            {(recipe as any).last_cooked_at && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Last Cooked</dt>
                <dd className="text-stone-100 mt-1">
                  {format(new Date((recipe as any).last_cooked_at), 'PPp')}
                </dd>
              </div>
            )}
          </div>

          {(recipe as any).equipment && (recipe as any).equipment.length > 0 && (
            <div className="mt-4 pt-4 border-t border-stone-800">
              <p className="text-sm font-medium text-stone-500 mb-2">Equipment Needed</p>
              <div className="flex flex-wrap gap-1">
                {(recipe as any).equipment.map((item: string) => (
                  <Badge key={item} variant="info">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-stone-800">
              <p className="text-sm font-medium text-stone-500 mb-2">Dietary Tags</p>
              <div className="flex flex-wrap gap-1">
                {recipe.dietary_tags.map((tag: any) => (
                  <Badge key={tag} variant="success">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {(recipe.cuisine || recipe.meal_type) && (
            <div className="mt-4 pt-4 border-t border-stone-800">
              <p className="text-sm font-medium text-stone-500 mb-2">Organization</p>
              <div className="flex flex-wrap gap-2">
                {recipe.cuisine && (
                  <Badge variant="info">{CUISINE_DISPLAY[recipe.cuisine] || recipe.cuisine}</Badge>
                )}
                {recipe.meal_type && (
                  <Badge variant="default">
                    {MEAL_TYPE_DISPLAY[recipe.meal_type] || recipe.meal_type}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {recipe.season && recipe.season.length > 0 && (
            <div className="mt-4 pt-4 border-t border-stone-800">
              <p className="text-sm font-medium text-stone-500 mb-2">Season</p>
              <div className="flex flex-wrap gap-1">
                {recipe.season.map((s: string) => (
                  <Badge key={s} variant="warning">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {recipe.occasion_tags && recipe.occasion_tags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-stone-800">
              <p className="text-sm font-medium text-stone-500 mb-2">Occasion</p>
              <div className="flex flex-wrap gap-1">
                {recipe.occasion_tags.map((tag: string) => (
                  <Badge key={tag} variant="info">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {recipe.notes && (
            <div className="mt-4 pt-4 border-t border-stone-800">
              <p className="text-sm font-medium text-stone-500 mb-1">Notes</p>
              <p className="text-sm text-stone-300 whitespace-pre-wrap">{recipe.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Summary */}
      {recipe.costSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Cost Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {recipe.costSummary.totalCostCents != null && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">Total Cost</dt>
                  <dd className="text-2xl font-bold text-stone-100 mt-1">
                    ${(recipe.costSummary.totalCostCents / 100).toFixed(2)}
                  </dd>
                </div>
              )}
              {recipe.costSummary.costPerPortionCents != null && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">Cost per Portion</dt>
                  <dd className="text-2xl font-bold text-stone-100 mt-1">
                    ${(recipe.costSummary.costPerPortionCents / 100).toFixed(2)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-stone-500">Price Data</dt>
                <dd className="mt-1">
                  {recipe.costSummary.hasAllPrices ? (
                    <Badge variant="success">Complete</Badge>
                  ) : (
                    <Badge variant="warning">Estimated</Badge>
                  )}
                </dd>
              </div>
            </div>
            {!recipe.costSummary.hasAllPrices && (
              <p className="text-sm text-stone-500 mt-3">
                Cost data improves as you log more receipts and update ingredient prices.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Event History */}
      {recipe.eventHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Event History ({recipe.eventHistory.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recipe.eventHistory.map((event: any) => (
                <Link
                  key={event.eventId}
                  href={`/events/${event.eventId}`}
                  className="block border border-stone-700 rounded-lg p-3 hover:border-brand-600 hover:shadow-sm transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-stone-100">
                        {event.occasion || 'Untitled Event'}
                      </h4>
                      <p className="text-sm text-stone-500">
                        {format(new Date(event.eventDate), 'PPP')}
                        {event.clientName && ` for ${event.clientName}`}
                      </p>
                    </div>
                    <Badge>{event.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Production History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Production History</CardTitle>
            <div className="flex gap-2">
              {!logLoaded && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={loadProductionLog}
                  disabled={loading}
                >
                  Load History
                </Button>
              )}
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setShowLogForm(!showLogForm)
                  if (!logLoaded) loadProductionLog()
                }}
              >
                {showLogForm ? 'Cancel' : 'Log Production'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Log Production Form */}
          {showLogForm && (
            <div className="mb-6 p-4 border border-stone-700 rounded-lg bg-stone-900/50 space-y-3">
              <p className="text-sm font-medium text-stone-300 mb-2">New Production Entry</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={logQuantity}
                    onChange={(e) => setLogQuantity(e.target.value)}
                    placeholder="e.g. 4"
                    step="0.5"
                    min="0.1"
                    className="w-full border border-stone-600 rounded-md px-3 py-2 text-sm bg-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Unit</label>
                  <input
                    type="text"
                    value={logUnit}
                    onChange={(e) => setLogUnit(e.target.value)}
                    placeholder="servings"
                    className="w-full border border-stone-600 rounded-md px-3 py-2 text-sm bg-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Made By</label>
                  <input
                    type="text"
                    value={logProducedBy}
                    onChange={(e) => setLogProducedBy(e.target.value)}
                    placeholder="Chef name"
                    className="w-full border border-stone-600 rounded-md px-3 py-2 text-sm bg-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Date Produced</label>
                  <input
                    type="datetime-local"
                    value={logProducedAt}
                    onChange={(e) => setLogProducedAt(e.target.value)}
                    aria-label="Date produced"
                    className="w-full border border-stone-600 rounded-md px-3 py-2 text-sm bg-stone-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Best Before</label>
                  <input
                    type="datetime-local"
                    value={logBestBefore}
                    onChange={(e) => setLogBestBefore(e.target.value)}
                    aria-label="Best before date"
                    className="w-full border border-stone-600 rounded-md px-3 py-2 text-sm bg-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Discard By</label>
                  <input
                    type="datetime-local"
                    value={logDiscardAt}
                    onChange={(e) => setLogDiscardAt(e.target.value)}
                    aria-label="Discard by date"
                    className="w-full border border-stone-600 rounded-md px-3 py-2 text-sm bg-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Batch Notes</label>
                  <textarea
                    value={logBatchNotes}
                    onChange={(e) => setLogBatchNotes(e.target.value)}
                    placeholder="Any notes about this batch"
                    rows={2}
                    className="w-full border border-stone-600 rounded-md px-3 py-2 text-sm bg-stone-900 resize-y"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleLogProduction}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Entry'}
                </Button>
              </div>
            </div>
          )}

          {/* Production Log Entries */}
          {logLoaded && productionLog.length === 0 && (
            <p className="text-stone-500 text-center py-4">
              No production records yet. Click &quot;Log Production&quot; to add one.
            </p>
          )}
          {!logLoaded && !showLogForm && (
            <p className="text-sm text-stone-500 text-center py-4">
              Click &quot;Load History&quot; to see past production entries.
            </p>
          )}
          {logLoaded && productionLog.length > 0 && (
            <div className="space-y-3">
              {productionLog.map((entry) => {
                const now = new Date()
                const discardDate = entry.discard_at ? new Date(entry.discard_at) : null
                const bestBeforeDate = entry.best_before ? new Date(entry.best_before) : null

                // Shelf life status
                let shelfStatus: 'fresh' | 'use-soon' | 'expired' | null = null
                if (discardDate) {
                  if (isPast(discardDate)) {
                    shelfStatus = 'expired'
                  } else if (isBefore(discardDate, addDays(now, 2))) {
                    shelfStatus = 'use-soon'
                  } else {
                    shelfStatus = 'fresh'
                  }
                } else if (bestBeforeDate) {
                  if (isPast(bestBeforeDate)) {
                    shelfStatus = 'use-soon'
                  } else {
                    shelfStatus = 'fresh'
                  }
                }

                const statusColors = {
                  fresh: 'border-l-green-500',
                  'use-soon': 'border-l-amber-500',
                  expired: 'border-l-red-500',
                }

                return (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-lg border border-stone-700 bg-stone-900/30 border-l-4 ${
                      shelfStatus ? statusColors[shelfStatus] : 'border-l-stone-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-stone-100">
                            {entry.quantity} {entry.unit}
                          </span>
                          {entry.produced_by && (
                            <span className="text-sm text-stone-400">by {entry.produced_by}</span>
                          )}
                          <span className="text-sm text-stone-500">
                            {format(new Date(entry.produced_at), 'PPp')}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                          {entry.best_before && (
                            <span
                              className={
                                bestBeforeDate && isPast(bestBeforeDate) ? 'text-amber-400' : ''
                              }
                            >
                              Best before: {format(new Date(entry.best_before), 'PPp')}
                            </span>
                          )}
                          {entry.discard_at && (
                            <span
                              className={
                                discardDate && isPast(discardDate) ? 'text-red-400 font-medium' : ''
                              }
                            >
                              Discard by: {format(new Date(entry.discard_at), 'PPp')}
                            </span>
                          )}
                        </div>
                        {entry.batch_notes && (
                          <p className="text-sm text-stone-400">{entry.batch_notes}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeleteLogEntryId(entry.id)}
                        className="text-xs text-stone-500 hover:text-red-500 transition-colors"
                        disabled={loading}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete this recipe?"
        description="It will be unlinked from any menu components. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={loading}
        onConfirm={handleConfirmedDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmModal
        open={!!deleteLogEntryId}
        title="Remove production entry?"
        description="This will also decrement the times cooked counter. This cannot be undone."
        confirmLabel="Remove"
        variant="danger"
        loading={loading}
        onConfirm={handleDeleteLogEntry}
        onCancel={() => setDeleteLogEntryId(null)}
      />
    </div>
  )
}

// ─── Recipe Share Modal ───────────────────────

function RecipeShareModal({
  recipeId,
  recipeName,
  onSuccess,
  onCancel,
}: {
  recipeId: string
  recipeName: string
  onSuccess: (chefName: string) => void
  onCancel: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<
    Array<{ id: string; business_name: string; display_name: string | null }>
  >([])
  const [selectedChef, setSelectedChef] = useState<{
    id: string
    business_name: string
    display_name: string | null
  } | null>(null)
  const [note, setNote] = useState('')
  const [modalError, setModalError] = useState<string | null>(null)

  async function handleSearch() {
    if (!search.trim()) return
    setSearching(true)
    try {
      const r = await getConnectedChefsForCollaboration(search)
      setResults(r as any)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function handleSend() {
    if (!selectedChef) return
    setModalError(null)
    startTransition(async () => {
      try {
        await shareRecipe({ recipeId, targetChefId: selectedChef.id, note: note || undefined })
        onSuccess(selectedChef.display_name || selectedChef.business_name)
      } catch (err: any) {
        setModalError(err.message)
      }
    })
  }

  return (
    <div className="rounded-lg border border-brand-700 bg-brand-950/40 p-4 space-y-3">
      <p className="text-sm font-semibold text-stone-200">
        Share &ldquo;{recipeName}&rdquo; with a Chef
      </p>
      <p className="text-xs text-stone-400">
        They&apos;ll receive an invitation to accept. If accepted, they get their own editable copy.
        Only chefs you&apos;re connected with in the Chef Network can receive shares.
      </p>

      {modalError && <Alert variant="error">{modalError}</Alert>}

      {!selectedChef ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search your connected chefs..."
              className="flex-1 rounded-md border border-stone-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <Button variant="secondary" size="sm" onClick={handleSearch} disabled={searching}>
              {searching ? '...' : 'Search'}
            </Button>
          </div>
          {results.map((chef) => (
            <button
              key={chef.id}
              type="button"
              onClick={() => setSelectedChef(chef)}
              className="w-full text-left flex items-center gap-3 rounded-md border border-stone-700 bg-stone-900 px-3 py-2 hover:bg-stone-800 transition-colors text-sm"
            >
              <div className="h-7 w-7 rounded-full bg-stone-700 flex items-center justify-center text-xs font-medium text-stone-400 flex-shrink-0">
                {(chef.display_name || chef.business_name).charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-stone-100">
                {chef.display_name || chef.business_name}
              </span>
            </button>
          ))}
          {results.length === 0 && search && !searching && (
            <p className="text-xs text-stone-500">
              No connected chefs found matching &ldquo;{search}&rdquo;.
            </p>
          )}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-md bg-stone-900 border border-stone-700 px-3 py-2">
            <div className="h-7 w-7 rounded-full bg-stone-700 flex items-center justify-center text-xs font-medium text-stone-400">
              {(selectedChef.display_name || selectedChef.business_name).charAt(0).toUpperCase()}
            </div>
            <p className="text-sm font-medium text-stone-100 flex-1">
              {selectedChef.display_name || selectedChef.business_name}
            </p>
            <button
              type="button"
              onClick={() => setSelectedChef(null)}
              className="text-xs text-stone-400 hover:text-stone-400"
            >
              Change
            </button>
          </div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (e.g. try this with brown butter)"
            className="w-full rounded-md border border-stone-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleSend} disabled={isPending}>
              {isPending ? 'Sending...' : 'Send Share'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
