// Ingredient Price Detail Page
// Shows price history chart and multi-vendor price comparison for a single ingredient.

import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

const PriceHistoryChart = dynamic(
  () => import('@/components/inventory/price-history-chart').then((m) => m.PriceHistoryChart),
  {
    loading: () => <div className="h-64 rounded-lg bg-stone-800 animate-pulse" />,
    ssr: false,
  }
)
import { VendorComparisonPanel } from '@/components/inventory/vendor-comparison-panel'
import { EntityPhotoUpload } from '@/components/entities/entity-photo-upload'

export const metadata: Metadata = { title: 'Ingredient Price Detail' }

export default async function IngredientPriceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireChef()
  const { id } = await params
  const db: any = createServerClient()

  // Fetch ingredient info
  const { data: ingredient } = await db
    .from('ingredients')
    .select('id, name, category, unit, last_price_cents, image_url')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  // Fetch recipes using this ingredient
  let recipesUsingThis: { id: string; name: string; photo_url: string | null }[] = []
  try {
    const { data: riRows } = await db
      .from('recipe_ingredients')
      .select('recipe_id')
      .eq('ingredient_id', id)
    if (riRows && riRows.length > 0) {
      const recipeIds = Array.from(new Set(riRows.map((r: any) => r.recipe_id)))
      const { data: recipes } = await db
        .from('recipes')
        .select('id, name, photo_url')
        .in('id', recipeIds)
        .eq('tenant_id', user.tenantId!)
        .order('name', { ascending: true })
      if (recipes) recipesUsingThis = recipes
    }
  } catch (err: any) {
    console.error('[ingredient-detail] Recipe usage fetch failed (non-blocking):', err.message)
  }

  if (!ingredient) {
    return (
      <div className="space-y-6">
        <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Inventory
        </Link>
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-400">Ingredient not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/recipes/ingredients" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Ingredient Library
        </Link>
        <div className="flex items-start gap-4 mt-1">
          <EntityPhotoUpload
            entityType="ingredient"
            entityId={ingredient.id}
            currentPhotoUrl={ingredient.image_url ?? null}
            compact
            label="Add image"
          />
          <div>
            <h1 className="text-3xl font-bold text-stone-100">{ingredient.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-stone-500">
              {ingredient.category && <span>Category: {ingredient.category}</span>}
              {ingredient.unit && <span>Unit: {ingredient.unit}</span>}
              {ingredient.last_price_cents != null && (
                <span>Last price: ${(ingredient.last_price_cents / 100).toFixed(2)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recipes using this ingredient */}
      {recipesUsingThis.length > 0 && (
        <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
          <h2 className="text-sm font-medium text-stone-400 mb-3">
            Your Recipes Using This ({recipesUsingThis.length})
          </h2>
          <div className="space-y-2">
            {recipesUsingThis.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-stone-800 transition-colors group"
              >
                {recipe.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={recipe.photo_url}
                    alt=""
                    className="h-8 w-8 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-8 w-8 rounded bg-stone-800 flex items-center justify-center flex-shrink-0 text-xs text-stone-500">
                    {recipe.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <span className="text-sm text-stone-200 group-hover:text-amber-500 transition-colors">
                  {recipe.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Price history chart */}
      <PriceHistoryChart
        ingredientId={ingredient.id}
        ingredientName={ingredient.name}
        months={12}
      />

      {/* Vendor price comparison */}
      <VendorComparisonPanel ingredientName={ingredient.name} ingredientId={ingredient.id} />
    </div>
  )
}
