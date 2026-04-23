import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipes } from '@/lib/recipes/actions'
import { getExpenses } from '@/lib/expenses/actions'
import { getTenantFinancialSummary } from '@/lib/ledger/compute'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { getFoodCostRating } from '@/lib/finance/food-cost-calculator'
import { archetypeToOperatorType } from '@/lib/costing/knowledge'
import { createServerClient } from '@/lib/db/server'

export const metadata: Metadata = { title: 'Food Cost %' }

export default async function FoodCostPage() {
  const chef = await requireChef()
  const db = createServerClient()
  const { data: prefs } = await (db as any)
    .from('chef_preferences')
    .select('archetype')
    .eq('chef_id', chef.id)
    .single()
  const operatorType = archetypeToOperatorType(prefs?.archetype)

  function pctColor(pct: number) {
    return getFoodCostRating(pct, operatorType).color
  }
  const [recipes, allExpenses, summary] = await Promise.all([
    getRecipes(),
    getExpenses({}),
    getTenantFinancialSummary(),
  ])

  // Food-related expense categories
  const FOOD_CATEGORIES = ['groceries', 'alcohol', 'specialty_items']
  const foodExpenses = allExpenses.filter((e: any) => FOOD_CATEGORIES.includes(e.category ?? ''))
  const totalFoodCostCents = foodExpenses.reduce((s: any, e: any) => s + (e.amount_cents ?? 0), 0)

  const grossRevenueCents = summary.totalRevenueCents
  const foodCostPct = grossRevenueCents > 0 ? (totalFoodCostCents / grossRevenueCents) * 100 : null

  // Recipe cost stats
  const pricedRecipes = recipes.filter((r) => r.total_cost_cents && r.total_cost_cents > 0)
  const totalRecipeCostCents = pricedRecipes.reduce((s, r) => s + (r.total_cost_cents ?? 0), 0)
  const avgRecipeCostCents =
    pricedRecipes.length > 0 ? Math.round(totalRecipeCostCents / pricedRecipes.length) : 0

  // Top 5 most expensive recipes
  const topRecipes = [...pricedRecipes]
    .sort((a, b) => (b.total_cost_cents ?? 0) - (a.total_cost_cents ?? 0))
    .slice(0, 5)

  // Category breakdown of recipe costs
  const byCatMap = new Map<string, { count: number; totalCents: number }>()
  for (const r of pricedRecipes) {
    const cat = r.category ?? 'other'
    if (!byCatMap.has(cat)) byCatMap.set(cat, { count: 0, totalCents: 0 })
    const entry = byCatMap.get(cat)!
    entry.count++
    entry.totalCents += r.total_cost_cents ?? 0
  }
  const categoryBreakdown = Array.from(byCatMap.entries()).sort(
    (a, b) => b[1].totalCents - a[1].totalCents
  )

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/costing" className="text-sm text-stone-500 hover:text-stone-300">
          ← Costing
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Food Cost %</h1>
        <p className="text-stone-500 mt-1">Ingredient spend as a percentage of gross revenue</p>
      </div>

      {/* Primary food cost % KPI */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-stone-500 mb-1">Food cost percentage</p>
            <p
              className={`text-5xl font-bold ${foodCostPct != null ? pctColor(foodCostPct) : 'text-stone-300'}`}
            >
              {foodCostPct != null ? `${foodCostPct.toFixed(1)}%` : '-'}
            </p>
            <p className="text-xs text-stone-400 mt-2">
              ${(totalFoodCostCents / 100).toFixed(2)} food spend ÷ $
              {(grossRevenueCents / 100).toFixed(2)} gross revenue
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-500 space-y-1">
              <p>
                <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1 align-middle" />
                Under 28% - excellent
              </p>
              <p>
                <span className="inline-block w-3 h-3 rounded-full bg-amber-400 mr-1 align-middle" />
                28–35% - good
              </p>
              <p>
                <span className="inline-block w-3 h-3 rounded-full bg-red-400 mr-1 align-middle" />
                Over 35% - review margins
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Supporting KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">{formatCurrency(totalFoodCostCents)}</p>
          <p className="text-sm text-stone-500 mt-1">Total food spend</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">{pricedRecipes.length}</p>
          <p className="text-sm text-stone-500 mt-1">Recipes with full pricing</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-100">
            {avgRecipeCostCents > 0 ? formatCurrency(avgRecipeCostCents) : '-'}
          </p>
          <p className="text-sm text-stone-500 mt-1">Avg recipe ingredient cost</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top recipes by cost */}
        <div>
          <h2 className="text-base font-semibold text-stone-300 mb-3">Most expensive recipes</h2>
          {topRecipes.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-stone-400 text-sm">No recipe pricing yet</p>
              <Link
                href="/culinary/costing/recipe"
                className="text-brand-600 hover:underline text-sm mt-2 inline-block"
              >
                View recipe costs →
              </Link>
            </Card>
          ) : (
            <Card>
              <div className="divide-y divide-stone-800">
                {topRecipes.map((r, i) => (
                  <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="text-stone-300 text-sm w-5">{i + 1}</span>
                    <Link
                      href={`/culinary/recipes/${r.id}`}
                      className="flex-1 font-medium text-stone-100 hover:text-brand-600"
                    >
                      {r.name}
                    </Link>
                    <span className="text-stone-300 font-semibold text-sm">
                      {formatCurrency(r.total_cost_cents ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Cost by category */}
        <div>
          <h2 className="text-base font-semibold text-stone-300 mb-3">Recipe cost by category</h2>
          {categoryBreakdown.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-stone-400 text-sm">No data yet</p>
            </Card>
          ) : (
            <Card>
              <div className="divide-y divide-stone-800">
                {categoryBreakdown.map(([cat, data]) => (
                  <div key={cat} className="px-4 py-3 flex items-center gap-3">
                    <span className="flex-1 text-sm text-stone-300 capitalize">
                      {cat.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-stone-400">
                      {data.count} recipe{data.count !== 1 ? 's' : ''}
                    </span>
                    <span className="text-stone-300 font-semibold text-sm">
                      ${(data.totalCents / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="flex gap-3 text-sm">
        <Link href="/culinary/costing/recipe" className="text-brand-600 hover:underline">
          View all recipe costs →
        </Link>
        <span className="text-stone-300">|</span>
        <Link href="/culinary/costing/menu" className="text-brand-600 hover:underline">
          View menu costs →
        </Link>
        <span className="text-stone-300">|</span>
        <Link href="/finance/expenses/food-ingredients" className="text-brand-600 hover:underline">
          View food expenses →
        </Link>
      </div>
    </div>
  )
}
