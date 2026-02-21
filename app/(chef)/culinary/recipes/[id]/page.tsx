import { notFound } from 'next/navigation'
import { RecipeScalingPanel } from '@/components/ai/recipe-scaling-panel'
import Link from 'next/link'
import { getRecipeById } from '@/lib/recipes/actions'
import { formatCurrency } from '@/lib/utils/currency'
import { NutritionLookupPanel } from '@/components/recipes/nutrition-lookup-panel'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function ChefRecipeDetailPage({ params }: { params: { id: string } }) {
  const recipe = await getRecipeById(params.id)
  if (!recipe) notFound()

  const r = recipe as any
  const totalMinutes = r.total_time_minutes ?? (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{r.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {r.category && (
              <Badge variant="info">{r.category.replace(/_/g, ' ')}</Badge>
            )}
            {r.archived && <Badge variant="error">Archived</Badge>}
            {(r.dietary_tags ?? []).map((tag: string) => (
              <Badge key={tag} variant="default">{tag}</Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/culinary/recipes/${r.id}/edit`}>
            <Button variant="secondary" size="sm">Edit Recipe</Button>
          </Link>
          <Link href="/culinary/recipes">
            <Button variant="ghost" size="sm">← Recipes</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recipe Details */}
        <Card className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-stone-900">Details</h2>

          {r.description && (
            <p className="text-sm text-stone-700 whitespace-pre-wrap">{r.description}</p>
          )}

          <dl className="space-y-2">
            {totalMinutes > 0 && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Total time</dt>
                <dd className="text-sm font-medium text-stone-900">{totalMinutes} min</dd>
              </div>
            )}
            {r.prep_time_minutes != null && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Prep</dt>
                <dd className="text-sm text-stone-900">{r.prep_time_minutes} min</dd>
              </div>
            )}
            {r.cook_time_minutes != null && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Cook</dt>
                <dd className="text-sm text-stone-900">{r.cook_time_minutes} min</dd>
              </div>
            )}
            {r.yield_description && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Yield</dt>
                <dd className="text-sm text-stone-900">{r.yield_description}</dd>
              </div>
            )}
            {r.times_cooked > 0 && (
              <div className="flex justify-between">
                <dt className="text-sm text-stone-500">Times cooked</dt>
                <dd className="text-sm text-stone-900">{r.times_cooked}</dd>
              </div>
            )}
          </dl>

          {r.method && (
            <div>
              <h3 className="text-sm font-medium text-stone-700 mb-1">Method</h3>
              <p className="text-sm text-stone-600 whitespace-pre-wrap">{r.method}</p>
            </div>
          )}

          {r.notes && (
            <div>
              <h3 className="text-sm font-medium text-stone-700 mb-1">Notes</h3>
              <p className="text-sm text-stone-500 whitespace-pre-wrap">{r.notes}</p>
            </div>
          )}
        </Card>

        {/* Ingredients & Cost */}
        <Card className="p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-stone-900">Ingredients</h2>
            {(r as any).costSummary?.total_cost_cents != null && (
              <span className="text-sm text-stone-500">
                Est. cost: <span className="font-medium text-stone-900">
                  {formatCurrency((r as any).costSummary.total_cost_cents)}
                </span>
              </span>
            )}
          </div>

          {r.recipe_ingredients?.length > 0 ? (
            <ul className="divide-y divide-stone-100">
              {r.recipe_ingredients.map((ri: any) => (
                <li key={ri.id} className="py-2 flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm text-stone-900">
                      {ri.quantity != null && `${ri.quantity} ${ri.unit ?? ''} `}
                      <span className="font-medium">{ri.ingredient?.name ?? 'Unknown'}</span>
                      {ri.is_optional && (
                        <span className="ml-1 text-xs text-stone-400">(optional)</span>
                      )}
                    </span>
                    {ri.preparation_notes && (
                      <p className="text-xs text-stone-500 mt-0.5">{ri.preparation_notes}</p>
                    )}
                  </div>
                  {ri.ingredient?.average_price_cents != null && (
                    <span className="text-xs text-stone-400 whitespace-nowrap">
                      {formatCurrency(ri.ingredient.average_price_cents)}/{ri.ingredient.default_unit ?? 'unit'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-400">No ingredients added yet.</p>
          )}
        </Card>
      </div>

      {/* Nutrition Lookup — Open Food Facts */}
      <NutritionLookupPanel defaultQuery={r.name} />

      {/* AI Recipe Scaling */}
      <RecipeScalingPanel recipeId={params.id} defaultServings={r.default_servings ?? r.servings ?? 4} />
    </div>
  )
}
