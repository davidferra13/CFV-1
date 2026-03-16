import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipes } from '@/lib/recipes/actions'
import { getMenuCostSummaries } from '@/lib/menus/actions'
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

export const metadata: Metadata = { title: 'Costing - ChefFlow' }

export default async function CostingPage() {
  await requireChef()
  const [recipes, menuCosts] = await Promise.all([getRecipes(), getMenuCostSummaries()])

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
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Food Costing</h1>
        <p className="text-stone-500 mt-1">Recipe and menu cost breakdowns</p>
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
                      <TableCell>
                        {recipe.has_all_prices ? (
                          <span className="text-xs bg-green-900 text-green-700 px-2 py-0.5 rounded-full">
                            Complete
                          </span>
                        ) : (
                          <span className="text-xs bg-amber-900 text-amber-700 px-2 py-0.5 rounded-full">
                            Partial
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

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
                      {mc.has_all_recipe_costs ? (
                        <span className="text-xs bg-green-900 text-green-700 px-2 py-0.5 rounded-full">
                          Complete
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-900 text-amber-700 px-2 py-0.5 rounded-full">
                          Partial
                        </span>
                      )}
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
