import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipes, getIngredients } from '@/lib/recipes/actions'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Consolidated Shopping - ChefFlow' }

// Group ingredients by category for display
const CATEGORY_ORDER = [
  'produce',
  'protein',
  'dairy',
  'dry_goods',
  'pantry',
  'beverages',
  'spices',
  'equipment',
  'other',
]

export default async function ConsolidatedShoppingPage() {
  await requireChef()
  const [recipes, ingredients] = await Promise.all([getRecipes(), getIngredients()])

  // Ingredients that appear in at least one recipe (usage_count > 0)
  const usedIngredients = ingredients.filter((i) => (i.usage_count ?? 0) > 0)

  // Group by category
  const byCategory = new Map<string, typeof usedIngredients>()
  for (const ing of usedIngredients) {
    const cat = ing.category ?? 'other'
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(ing)
  }

  const sortedCategories = Array.from(byCategory.entries()).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a[0])
    const bi = CATEGORY_ORDER.indexOf(b[0])
    if (ai === -1 && bi === -1) return a[0].localeCompare(b[0])
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const withPricing = usedIngredients.filter((i) => i.average_price_cents != null)
  const staples = usedIngredients.filter((i) => i.is_staple)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/prep" className="text-sm text-stone-500 hover:text-stone-300">
          ← Prep
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Consolidated Shopping</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {usedIngredients.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          All ingredients in use across your recipes — your master pantry reference
        </p>
      </div>

      <Card className="p-4 bg-sky-950 border-sky-200">
        <p className="text-sm font-medium text-sky-800">Event-specific shopping lists</p>
        <p className="text-sm text-sky-700 mt-1">
          This page shows your full ingredient library. For a per-event shopping list based on
          specific recipes and guest counts, open any event and use the{' '}
          <strong>Grocery List</strong> document. That document scales quantities automatically from
          your recipe yield settings.
        </p>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">{recipes.length}</p>
          <p className="text-sm text-stone-500 mt-1">Recipes referencing ingredients</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">{withPricing.length}</p>
          <p className="text-sm text-stone-500 mt-1">Ingredients with pricing</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">{staples.length}</p>
          <p className="text-sm text-stone-500 mt-1">Pantry staples</p>
        </Card>
      </div>

      {usedIngredients.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No ingredients in use yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Add ingredients to your recipes to see them here
          </p>
          <Link
            href="/culinary/recipes"
            className="text-brand-600 hover:underline text-sm mt-3 inline-block"
          >
            Browse recipes →
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide">
                  {category.replace(/_/g, ' ')}
                </h2>
                <span className="text-xs text-stone-400">({items.length})</span>
              </div>
              <Card>
                <div className="divide-y divide-stone-800">
                  {items
                    .sort((a, b) => (b.usage_count ?? 0) - (a.usage_count ?? 0))
                    .map((ing) => (
                      <div key={ing.id} className="px-4 py-3 flex items-center gap-4">
                        <div className="flex-1">
                          <span className="font-medium text-stone-100">{ing.name}</span>
                          {ing.is_staple && (
                            <span className="ml-2 text-xs bg-amber-900 text-amber-700 px-1.5 py-0.5 rounded">
                              Staple
                            </span>
                          )}
                          {ing.allergen_flags && ing.allergen_flags.length > 0 && (
                            <span className="ml-2 text-xs bg-red-900 text-red-600 px-1.5 py-0.5 rounded">
                              {ing.allergen_flags.join(', ')}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-stone-500 text-right shrink-0">
                          {ing.default_unit && (
                            <span className="mr-3 text-stone-400">{ing.default_unit}</span>
                          )}
                          {ing.average_price_cents != null ? (
                            <span className="text-stone-300">
                              ${(ing.average_price_cents / 100).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-stone-300">—</span>
                          )}
                        </div>
                        <div className="text-xs text-stone-400 w-16 text-right shrink-0">
                          {(ing.usage_count ?? 0) > 0 && (
                            <span>
                              {ing.usage_count} recipe{ing.usage_count !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
