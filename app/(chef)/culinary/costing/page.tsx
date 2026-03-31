import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipes, getIngredients } from '@/lib/recipes/actions'
import { getMenuCostSummaries } from '@/lib/menus/actions'
import { ShoppingOptimizer } from '@/components/pricing/shopping-optimizer'
import { EventShoppingPlanner } from '@/components/pricing/event-shopping-planner'
import { StoreScorecard } from '@/components/pricing/store-scorecard'
import { CostImpact } from '@/components/pricing/cost-impact'
import { CostRefreshButton } from '@/components/pricing/cost-refresh-button'
import { CostingConfidenceBadge } from '@/components/pricing/costing-confidence-badge'
import { IngredientMatchReview } from '@/components/pricing/ingredient-match-review'
import { getUnmatchedIngredientsAction } from '@/lib/pricing/ingredient-matching-actions'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Costing' }

function priceFreshness(dateStr: string | null): { text: string; color: string } {
  if (!dateStr) return { text: 'No data', color: 'text-stone-600' }
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return { text: 'Updated today', color: 'text-emerald-400' }
  if (days === 1) return { text: '1d ago', color: 'text-emerald-400' }
  if (days <= 7) return { text: `${days}d ago`, color: 'text-stone-400' }
  if (days <= 14) return { text: `${days}d ago`, color: 'text-stone-400' }
  if (days <= 30) return { text: `${days}d ago`, color: 'text-amber-400' }
  return { text: `${days}d ago`, color: 'text-amber-400' }
}

export default async function CostingPage() {
  await requireChef()
  const [recipes, menuCosts, allIngredients, unmatchedIngredients] = await Promise.all([
    getRecipes(),
    getMenuCostSummaries(),
    getIngredients().catch(() => []),
    getUnmatchedIngredientsAction().catch(() => []),
  ])

  const costedRecipes = recipes.filter((r) => r.total_cost_cents !== null)
  const uncostedRecipes = recipes.length - costedRecipes.length
  const totalRecipeCostCents = costedRecipes.reduce((sum, r) => sum + (r.total_cost_cents ?? 0), 0)
  const avgRecipeCostCents =
    costedRecipes.length > 0 ? Math.round(totalRecipeCostCents / costedRecipes.length) : 0

  const costingCoverage =
    recipes.length > 0 ? Math.round((costedRecipes.length / recipes.length) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary" className="text-sm text-stone-500 hover:text-stone-300">
          ← Culinary
        </Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Food Costing</h1>
            <p className="text-stone-500 mt-1">Recipe and menu cost breakdowns</p>
          </div>
          <CostRefreshButton />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{recipes.length}</p>
          <p className="text-sm text-stone-500 mt-1">Total recipes</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{costingCoverage}%</p>
          <p className="text-sm text-stone-500 mt-1">Costing coverage</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{formatCurrency(avgRecipeCostCents)}</p>
          <p className="text-sm text-stone-500 mt-1">Avg recipe cost</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-amber-700">{uncostedRecipes}</p>
          <p className="text-sm text-stone-500 mt-1">Missing price data</p>
        </Card>
      </div>

      {/* Recipe costs */}
      <div>
        <h2 className="text-lg font-semibold text-stone-100 mb-3">Recipe Costs</h2>
        {costedRecipes.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-stone-400 font-medium mb-1">No recipe costs yet</p>
            <p className="text-stone-400 text-sm">
              Add ingredient prices to your recipes to see cost data here
            </p>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Ingredients</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Cost / Portion</TableHead>
                  <TableHead>Freshness</TableHead>
                  <TableHead>Complete Pricing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costedRecipes
                  .sort((a, b) => (b.total_cost_cents ?? 0) - (a.total_cost_cents ?? 0))
                  .map((recipe) => (
                    <TableRow key={recipe.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/culinary/recipes/${recipe.id}`}
                          className="text-brand-600 hover:text-brand-300 hover:underline"
                        >
                          {recipe.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-stone-400 text-sm capitalize">
                        {recipe.category}
                      </TableCell>
                      <TableCell className="text-stone-400 text-sm">
                        {recipe.ingredient_count ?? '-'}
                      </TableCell>
                      <TableCell className="text-stone-100 font-medium text-sm">
                        {formatCurrency(recipe.total_cost_cents ?? 0)}
                      </TableCell>
                      <TableCell className="text-stone-400 text-sm">
                        {recipe.yield_quantity && recipe.total_cost_cents
                          ? formatCurrency(
                              Math.round(recipe.total_cost_cents / recipe.yield_quantity)
                            )
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {(() => {
                          const fresh = priceFreshness(recipe.last_price_updated_at)
                          return <span className={fresh.color}>{fresh.text}</span>
                        })()}
                      </TableCell>
                      <TableCell>
                        <CostingConfidenceBadge
                          coveragePct={
                            recipe.has_all_prices
                              ? 100
                              : recipe.has_all_prices === false
                                ? 50
                                : null
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Ingredient Match Review Panel */}
      {unmatchedIngredients.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-stone-100 mb-3">Ingredient Matching</h2>
          <IngredientMatchReview initialUnmatched={unmatchedIngredients} />
        </div>
      )}

      {/* Event Shopping Planner - optimized shopping for upcoming events */}
      <div>
        <h2 className="text-lg font-semibold text-stone-100 mb-3">Event Shopping Planner</h2>
        <EventShoppingPlanner />
      </div>

      {/* Price Intelligence row: Cost Impact + Store Scorecard */}
      {allIngredients.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-100 mb-3">Price Changes</h2>
            <CostImpact ingredientNames={allIngredients.map((i: any) => i.name)} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-100 mb-3">Store Rankings</h2>
            <StoreScorecard ingredientNames={allIngredients.map((i: any) => i.name)} />
          </div>
        </div>
      )}

      {/* Shopping Optimizer - find cheapest stores for your ingredients */}
      {allIngredients.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-stone-100 mb-3">Shopping Optimizer</h2>
          <ShoppingOptimizer ingredientNames={allIngredients.map((i: any) => i.name)} />
        </div>
      )}

      {/* Menu costs */}
      {menuCosts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-stone-100 mb-3">Menu Costs</h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Menu</TableHead>
                  <TableHead>Components</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Per Guest</TableHead>
                  <TableHead>Food Cost %</TableHead>
                  <TableHead>Complete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuCosts.map((mc) => (
                  <TableRow key={mc.menu_id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/culinary/menus/${mc.menu_id}`}
                        className="text-brand-600 hover:text-brand-300 hover:underline"
                      >
                        {mc.menu_name || 'Untitled Menu'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {mc.total_component_count ?? '-'}
                    </TableCell>
                    <TableCell className="text-stone-100 font-medium text-sm">
                      {mc.total_recipe_cost_cents != null
                        ? formatCurrency(mc.total_recipe_cost_cents)
                        : '-'}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {mc.cost_per_guest_cents != null
                        ? formatCurrency(mc.cost_per_guest_cents)
                        : '-'}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {mc.food_cost_percentage != null
                        ? `${mc.food_cost_percentage.toFixed(1)}%`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <CostingConfidenceBadge
                        coveragePct={
                          mc.has_all_recipe_costs
                            ? 100
                            : mc.has_all_recipe_costs === false
                              ? 50
                              : null
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  )
}
