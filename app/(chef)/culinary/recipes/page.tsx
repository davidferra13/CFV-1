import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipes } from '@/lib/recipes/actions'
import { getTopIngredientPairings } from '@/lib/recipes/pairing-actions'
import { getPlaceholderImages, type PlaceholderImage } from '@/lib/images/placeholder-actions'
import { FoodPlaceholderImage } from '@/components/ui/food-placeholder-image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { NoRecipesIllustration } from '@/components/ui/branded-illustrations'
import { calculateRecipeConfidence } from '@/lib/recipes/confidence-score'

export const metadata: Metadata = { title: 'Recipe Book' }

const CATEGORY_STYLES: Record<string, string> = {
  sauce: 'bg-orange-900 text-orange-700',
  protein: 'bg-red-900 text-red-700',
  starch: 'bg-yellow-900 text-yellow-700',
  vegetable: 'bg-green-900 text-green-700',
  fruit: 'bg-lime-900 text-lime-700',
  dessert: 'bg-pink-900 text-pink-700',
  bread: 'bg-amber-900 text-amber-700',
  pasta: 'bg-yellow-900 text-yellow-600',
  soup: 'bg-teal-900 text-teal-700',
  salad: 'bg-emerald-900 text-emerald-700',
  appetizer: 'bg-purple-900 text-purple-700',
  condiment: 'bg-stone-800 text-stone-300',
  beverage: 'bg-brand-900 text-brand-700',
  other: 'bg-stone-800 text-stone-400',
}

async function PairingInsights() {
  const pairings = await getTopIngredientPairings(8)
  if (pairings.length === 0) return null

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-stone-200 mb-3">Your Signature Pairings</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {pairings.map((pair) => (
          <div
            key={`${pair.ingredientA}-${pair.ingredientB}`}
            className="flex items-center gap-2 rounded-lg bg-stone-800/50 px-3 py-2"
          >
            <span className="text-sm text-stone-300">
              {pair.ingredientA} + {pair.ingredientB}
            </span>
            <span className="text-xs text-stone-500 ml-auto whitespace-nowrap">
              {pair.recipeCount}x
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default async function ChefRecipesPage() {
  await requireChef()

  let recipes: Awaited<ReturnType<typeof getRecipes>> = []
  let fetchError = false
  try {
    recipes = await getRecipes()
  } catch {
    fetchError = true
  }

  // Batch-fetch placeholder images for recipes without their own photo
  const needPlaceholders = recipes
    .filter((r: any) => !r.photo_url)
    .map((r: any) => ({ id: r.id, query: r.name }))
  const placeholders: Record<string, PlaceholderImage | null> =
    needPlaceholders.length > 0
      ? await getPlaceholderImages(needPlaceholders).catch(
          () => ({}) as Record<string, PlaceholderImage | null>
        )
      : {}

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-100">Recipe Book</h1>
            {!fetchError && (
              <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
                {recipes.length}
              </span>
            )}
          </div>
          <Link href="/culinary/recipes/new">
            <Button>Add Recipe</Button>
          </Link>
        </div>
        <p className="text-stone-500 mt-1">Your complete collection of documented recipes</p>
      </div>

      <Suspense fallback={null}>
        <WidgetErrorBoundary name="Pairing Insights">
          <PairingInsights />
        </WidgetErrorBoundary>
      </Suspense>

      {fetchError ? (
        <Card className="p-8 text-center">
          <p className="text-stone-400 font-medium mb-1">Could not load recipes</p>
          <p className="text-stone-500 text-sm">Check your connection and refresh the page.</p>
        </Card>
      ) : recipes.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex justify-center mb-4">
            <NoRecipesIllustration className="h-24 w-24" />
          </div>
          <p className="text-stone-400 font-medium mb-1">No recipes yet</p>
          <p className="text-stone-400 text-sm mb-4">
            Build your library by documenting dishes from past events
          </p>
          <Link href="/culinary/recipes/new">
            <Button variant="secondary" size="sm">
              Add First Recipe
            </Button>
          </Link>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipe</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Cook Time</TableHead>
                <TableHead>Yield</TableHead>
                <TableHead>Ingredients</TableHead>
                <TableHead className="w-20">Confidence</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Times Cooked</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipes.map((recipe) => {
                const ingredientCount = recipe.ingredient_count ?? 0
                const confidence = calculateRecipeConfidence({
                  hasMethod: !!(recipe.method && recipe.method.trim()),
                  hasIngredients: ingredientCount > 0,
                  ingredientCount,
                  hasPrices:
                    recipe.has_all_prices === true ||
                    (recipe.total_cost_cents != null && recipe.total_cost_cents > 0),
                  pricedIngredientPct: recipe.has_all_prices
                    ? 100
                    : recipe.total_cost_cents != null && ingredientCount > 0
                      ? 50
                      : 0,
                  hasPeakWindows: false,
                  hasDietaryTags:
                    Array.isArray(recipe.dietary_tags) && recipe.dietary_tags.length > 0,
                  hasPrepTimes: recipe.prep_time_minutes != null,
                  hasCategory: !!(recipe.category && recipe.category !== 'other'),
                  timesCookedInEvents: recipe.times_cooked ?? 0,
                  hasPhoto: !!recipe.photo_url,
                })
                return (
                  <TableRow key={recipe.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {(recipe as any).photo_url ? (
                          <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                            <Image
                              src={(recipe as any).photo_url}
                              alt={recipe.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <FoodPlaceholderImage
                            image={placeholders[recipe.id] ?? null}
                            size="thumb"
                          />
                        )}
                        <Link
                          href={`/culinary/recipes/${recipe.id}`}
                          className="text-brand-600 hover:text-brand-300 hover:underline"
                        >
                          {recipe.name}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_STYLES[recipe.category] ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {recipe.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {recipe.cook_time_minutes ? `${recipe.cook_time_minutes}m` : '-'}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {recipe.yield_quantity && recipe.yield_unit
                        ? `${recipe.yield_quantity} ${recipe.yield_unit}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {recipe.ingredient_count ?? '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="relative h-7 w-7 rounded-full"
                          title={`${confidence.score}% - ${confidence.label}`}
                        >
                          <svg className="h-7 w-7 -rotate-90" viewBox="0 0 28 28">
                            <circle
                              cx="14"
                              cy="14"
                              r="12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              className="text-stone-700"
                            />
                            <circle
                              cx="14"
                              cy="14"
                              r="12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeDasharray={`${(confidence.score / 100) * 75.4} 75.4`}
                              className={
                                confidence.level === 'dialed-in'
                                  ? 'text-emerald-500'
                                  : confidence.level === 'solid'
                                    ? 'text-brand-500'
                                    : confidence.level === 'draft'
                                      ? 'text-amber-500'
                                      : 'text-stone-500'
                              }
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-stone-300">
                            {confidence.score}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {recipe.total_cost_cents != null ? (
                        <span className={recipe.has_all_prices ? '' : 'text-stone-400'}>
                          {formatCurrency(recipe.total_cost_cents)}
                          {!recipe.has_all_prices && <span className="text-xs ml-1">est.</span>}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">{recipe.times_cooked}</TableCell>
                    <TableCell>
                      <Link href={`/culinary/recipes/${recipe.id}`}>
                        <Button size="sm" variant="secondary">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
