import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipes } from '@/lib/recipes/actions'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

export const metadata: Metadata = { title: 'Recipe Cost - ChefFlow' }

function costBar(costCents: number, maxCents: number) {
  const pct = maxCents > 0 ? Math.min(100, (costCents / maxCents) * 100) : 0
  return (
    <div className="h-1.5 w-full bg-stone-800 rounded-full overflow-hidden">
      <div className="h-full bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
    </div>
  )
}

export default async function RecipeCostPage() {
  await requireChef()
  const recipes = await getRecipes({ sort: 'name' })

  const withCost = recipes.filter((r) => r.total_cost_cents != null && r.total_cost_cents > 0)
  const noCost = recipes.filter((r) => !r.total_cost_cents || r.total_cost_cents === 0)

  const totalCostCents = withCost.reduce((s, r) => s + (r.total_cost_cents ?? 0), 0)
  const avgCostCents = withCost.length > 0 ? Math.round(totalCostCents / withCost.length) : 0
  const maxCostCents = withCost.reduce((m, r) => Math.max(m, r.total_cost_cents ?? 0), 0)

  const sorted = [...withCost].sort((a, b) => (b.total_cost_cents ?? 0) - (a.total_cost_cents ?? 0))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/costing" className="text-sm text-stone-500 hover:text-stone-300">
          ← Costing
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Recipe Cost</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {withCost.length} priced
          </span>
        </div>
        <p className="text-stone-500 mt-1">Recipes sorted by ingredient cost — highest to lowest</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">
            {withCost.length > 0 ? `$${(maxCostCents / 100).toFixed(2)}` : '—'}
          </p>
          <p className="text-sm text-stone-500 mt-1">Most expensive recipe</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">
            {avgCostCents > 0 ? `$${(avgCostCents / 100).toFixed(2)}` : '—'}
          </p>
          <p className="text-sm text-stone-500 mt-1">Average recipe cost</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">{noCost.length}</p>
          <p className="text-sm text-stone-500 mt-1">Recipes missing pricing</p>
        </Card>
      </div>

      {withCost.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No recipe costs calculated yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Add ingredient prices to your recipes to see cost breakdowns here
          </p>
          <Link
            href="/culinary/recipes"
            className="text-brand-600 hover:underline text-sm mt-3 inline-block"
          >
            Browse recipes →
          </Link>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipe</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Ingredients</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead className="w-32">Relative cost</TableHead>
                <TableHead>Priced?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((recipe) => (
                <TableRow key={recipe.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/culinary/recipes/${recipe.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      {recipe.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-stone-500 text-sm capitalize">
                    {recipe.category?.replace(/_/g, ' ') ?? '—'}
                  </TableCell>
                  <TableCell className="text-stone-500 text-sm">
                    {recipe.ingredient_count ?? 0}
                  </TableCell>
                  <TableCell className="font-semibold text-stone-100">
                    ${((recipe.total_cost_cents ?? 0) / 100).toFixed(2)}
                  </TableCell>
                  <TableCell>{costBar(recipe.total_cost_cents ?? 0, maxCostCents)}</TableCell>
                  <TableCell>
                    {recipe.has_all_prices ? (
                      <span className="text-xs bg-green-900 text-green-200 px-2 py-0.5 rounded-full">
                        Full
                      </span>
                    ) : (
                      <span className="text-xs bg-amber-900 text-amber-200 px-2 py-0.5 rounded-full">
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

      {noCost.length > 0 && (
        <div>
          <p className="text-sm text-stone-500 mb-2">
            {noCost.length} recipe{noCost.length !== 1 ? 's' : ''} without ingredient pricing:
          </p>
          <div className="flex flex-wrap gap-2">
            {noCost.map((r) => (
              <Link key={r.id} href={`/culinary/recipes/${r.id}`}>
                <span className="text-xs bg-stone-800 text-stone-400 hover:bg-stone-700 px-2 py-1 rounded-full cursor-pointer">
                  {r.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
