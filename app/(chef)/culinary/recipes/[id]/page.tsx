import { notFound } from 'next/navigation'
import Image from 'next/image'
import { RecipeScalingPanel } from '@/components/ai/recipe-scaling-panel'
import Link from 'next/link'
import { getRecipeById } from '@/lib/recipes/actions'
import { getPlaceholderImage } from '@/lib/images/placeholder-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { NutritionLookupPanel } from '@/components/recipes/nutrition-lookup-panel'
import { FoodPlaceholderImage } from '@/components/ui/food-placeholder-image'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getIngredientKnowledgeBatch } from '@/lib/openclaw/ingredient-knowledge-queries'
import { IngredientSourcingToggle } from '@/components/recipes/ingredient-sourcing-toggle'

const VOLUME_UNITS = new Set([
  'cup',
  'cups',
  'ml',
  'l',
  'liter',
  'litre',
  'tbsp',
  'tsp',
  'fl oz',
  'floz',
  'gallon',
  'qt',
  'quart',
  'pint',
  'pt',
])
const WEIGHT_UNITS = new Set([
  'g',
  'gram',
  'grams',
  'kg',
  'kilogram',
  'oz',
  'ounce',
  'ounces',
  'lb',
  'lbs',
  'pound',
  'pounds',
])
const COUNT_UNITS = new Set([
  'ea',
  'each',
  'piece',
  'pieces',
  'pc',
  'pcs',
  'unit',
  'units',
  'whole',
  'bunch',
  'bunches',
  'head',
  'heads',
  'clove',
  'cloves',
  'slice',
  'slices',
  'stalk',
  'stalks',
  'sprig',
  'sprigs',
])

function unitCategory(unit: string | null | undefined): string | null {
  if (!unit) return null
  const u = unit.toLowerCase().trim()
  if (VOLUME_UNITS.has(u)) return 'volume'
  if (WEIGHT_UNITS.has(u)) return 'weight'
  if (COUNT_UNITS.has(u)) return 'count'
  return null
}

function unitMismatch(
  recipeUnit: string | null | undefined,
  priceUnit: string | null | undefined
): boolean {
  const rc = unitCategory(recipeUnit)
  const pc = unitCategory(priceUnit)
  if (!rc || !pc) return false
  return rc !== pc
}

export default async function ChefRecipeDetailPage({ params }: { params: { id: string } }) {
  const recipe = await getRecipeById(params.id)
  if (!recipe) notFound()

  const r = recipe as any
  const totalMinutes =
    r.total_time_minutes ?? (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0)

  // If recipe has its own photo, use that. Otherwise fetch a stock placeholder.
  const hasOwnPhoto = !!r.photo_url

  // Batch-fetch ingredient knowledge for all recipe ingredients
  const ingredientNames: string[] = (r.recipe_ingredients ?? [])
    .map((ri: any) => ri.ingredient?.name)
    .filter(Boolean)

  const [placeholderImage, ingredientKnowledge] = await Promise.all([
    hasOwnPhoto ? Promise.resolve(null) : getPlaceholderImage(r.name),
    getIngredientKnowledgeBatch(ingredientNames).catch(() => new Map()),
  ])

  return (
    <div className="space-y-6">
      {/* Hero image - own photo or stock placeholder */}
      {hasOwnPhoto ? (
        <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '21/9' }}>
          <Image
            src={r.photo_url}
            alt={r.name}
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            className="object-cover"
            priority
          />
        </div>
      ) : (
        <FoodPlaceholderImage image={placeholderImage} size="hero" />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">{r.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {r.category && <Badge variant="info">{r.category.replace(/_/g, ' ')}</Badge>}
            {r.archived && <Badge variant="error">Archived</Badge>}
            {(r.dietary_tags ?? []).map((tag: string) => (
              <Badge key={tag} variant="default">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/culinary/recipes/${r.id}/edit`}>
            <Button variant="secondary" size="sm">
              Edit Recipe
            </Button>
          </Link>
          <Link href="/culinary/recipes">
            <Button variant="ghost" size="sm">
              ← Recipes
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recipe Details */}
        <Card className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-stone-100">Details</h2>

          {r.description && (
            <p className="text-sm text-stone-300 whitespace-pre-wrap">{r.description}</p>
          )}

          <dl className="space-y-2">
            {totalMinutes > 0 && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Total time</dt>
                <dd className="text-sm font-medium text-stone-100">{totalMinutes} min</dd>
              </div>
            )}
            {r.prep_time_minutes != null && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Prep</dt>
                <dd className="text-sm text-stone-100">{r.prep_time_minutes} min</dd>
              </div>
            )}
            {r.cook_time_minutes != null && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Cook</dt>
                <dd className="text-sm text-stone-100">{r.cook_time_minutes} min</dd>
              </div>
            )}
            {r.yield_description && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Yield</dt>
                <dd className="text-sm text-stone-100">{r.yield_description}</dd>
              </div>
            )}
            {r.times_cooked > 0 && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Times cooked</dt>
                <dd className="text-sm text-stone-100">{r.times_cooked}</dd>
              </div>
            )}
          </dl>

          {r.method && (
            <div>
              <h3 className="text-sm font-medium text-stone-300 mb-1">Method</h3>
              <p className="text-sm text-stone-400 whitespace-pre-wrap">{r.method}</p>
            </div>
          )}

          {r.notes && (
            <div>
              <h3 className="text-sm font-medium text-stone-300 mb-1">Notes</h3>
              <p className="text-sm text-stone-500 whitespace-pre-wrap">{r.notes}</p>
            </div>
          )}
        </Card>

        {/* Ingredients & Cost */}
        <Card className="p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-stone-100">Ingredients</h2>
            {(r as any).costSummary?.total_cost_cents != null && (
              <span className="text-sm text-stone-500">
                Est. cost:{' '}
                <span className="font-medium text-stone-100">
                  {formatCurrency((r as any).costSummary.total_cost_cents)}
                </span>
              </span>
            )}
          </div>

          {r.recipe_ingredients?.length > 0 ? (
            <ul className="divide-y divide-stone-800">
              {r.recipe_ingredients.map((ri: any) => {
                const iName = ri.ingredient?.name
                const know = iName ? ingredientKnowledge.get(iName) : undefined
                const hasPriceUnit = ri.ingredient?.average_price_cents != null
                const hasUnitMismatch =
                  hasPriceUnit && unitMismatch(ri.unit, ri.ingredient?.default_unit)
                return (
                  <li key={ri.id} className="py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-sm text-stone-100">
                          {ri.quantity != null && `${ri.quantity} ${ri.unit ?? ''} `}
                          <span className="font-medium">{iName ?? 'Unknown'}</span>
                          {ri.is_optional && (
                            <span className="ml-1 text-xs text-stone-400">(optional)</span>
                          )}
                        </span>
                        {ri.preparation_notes && (
                          <p className="text-xs text-stone-500 mt-0.5">{ri.preparation_notes}</p>
                        )}
                        {hasUnitMismatch && (
                          <p className="text-xs text-amber-400 mt-0.5">
                            Unit mismatch: recipe uses {ri.unit}, price is per{' '}
                            {ri.ingredient.default_unit}. Cost estimate may be inaccurate.
                          </p>
                        )}
                      </div>
                      {hasPriceUnit ? (
                        <span className="text-xs text-stone-400 whitespace-nowrap">
                          {formatCurrency(ri.ingredient.average_price_cents)}/
                          {ri.ingredient.default_unit ?? 'unit'}
                        </span>
                      ) : (
                        iName && <IngredientSourcingToggle ingredientName={iName} />
                      )}
                    </div>
                    {/* Inline knowledge: dietary flags + pairings hint */}
                    {know && (know.dietaryFlags.length > 0 || know.flavorProfile) && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {know.dietaryFlags.slice(0, 3).map((f: string) => (
                          <span
                            key={f}
                            className="text-xs bg-emerald-950/50 text-emerald-400 border border-emerald-900/50 px-1.5 py-0.5 rounded-full capitalize"
                          >
                            {f}
                          </span>
                        ))}
                        {know.flavorProfile && (
                          <span className="text-xs text-stone-600 capitalize">
                            {know.flavorProfile}
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-stone-400">No ingredients added yet.</p>
          )}
        </Card>
      </div>

      {/* Nutrition Lookup - Open Food Facts */}
      <NutritionLookupPanel defaultQuery={r.name} />

      {/* AI Recipe Scaling */}
      <RecipeScalingPanel
        recipeId={params.id}
        defaultServings={r.default_servings ?? r.servings ?? 4}
      />
    </div>
  )
}
