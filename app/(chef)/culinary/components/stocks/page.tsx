import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipes } from '@/lib/recipes/actions'
import { getAllComponents } from '@/lib/menus/actions'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Stocks & Broths - ChefFlow' }

const STOCK_KEYWORDS = ['stock', 'broth', 'fond', 'jus', 'fumet', 'court bouillon', 'consommé', 'demi-glace', 'demi glace']

function isStockLike(name: string) {
  const lower = name.toLowerCase()
  return STOCK_KEYWORDS.some(kw => lower.includes(kw))
}

export default async function StocksPage() {
  await requireChef()

  const [recipes, components] = await Promise.all([
    getRecipes({ category: 'sauce' }),
    getAllComponents(),
  ])

  // Recipes that are stock-like (sauce category with stock keywords)
  const stockRecipes = recipes.filter(r => isStockLike(r.name))

  // Components that are stock-like (any category, stock keywords in name)
  const stockComponents = components.filter(c => isStockLike(c.name))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/components" className="text-sm text-stone-500 hover:text-stone-700">← Components</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-900">Stocks &amp; Broths</h1>
          <span className="bg-amber-100 text-amber-700 text-sm px-2 py-0.5 rounded-full">
            {stockRecipes.length + stockComponents.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Stock, broth, fond, jus, and fumet — the foundations of your cooking</p>
      </div>

      <Card className="p-4 bg-stone-50 border-stone-200">
        <p className="text-sm text-stone-600">
          Stocks are matched by name — any recipe or menu component containing &quot;stock&quot;, &quot;broth&quot;,
          &quot;fond&quot;, &quot;jus&quot;, or similar terms appears here.
        </p>
      </Card>

      {stockRecipes.length > 0 && (
        <>
          <h2 className="text-base font-semibold text-stone-700">Recipes</h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Prep Time</TableHead>
                  <TableHead>Cook Time</TableHead>
                  <TableHead>Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockRecipes.map(recipe => (
                  <TableRow key={recipe.id}>
                    <TableCell className="font-medium">
                      <Link href={`/culinary/recipes/${recipe.id}`} className="text-brand-600 hover:underline">{recipe.name}</Link>
                    </TableCell>
                    <TableCell className="text-stone-500 text-sm">{recipe.prep_time_minutes ? `${recipe.prep_time_minutes}m` : '—'}</TableCell>
                    <TableCell className="text-stone-500 text-sm">{recipe.cook_time_minutes ? `${recipe.cook_time_minutes}m` : '—'}</TableCell>
                    <TableCell className="text-stone-500 text-sm">
                      {recipe.total_cost_cents != null ? formatCurrency(recipe.total_cost_cents) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {stockComponents.length > 0 && (
        <>
          <h2 className="text-base font-semibold text-stone-700">Menu Components</h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Dish</TableHead>
                  <TableHead>Menu</TableHead>
                  <TableHead>Recipe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockComponents.map(comp => (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium text-stone-900">{comp.name}</TableCell>
                    <TableCell className="text-stone-500 text-sm">{comp.dish_name ?? '—'}</TableCell>
                    <TableCell className="text-stone-500 text-sm">
                      {comp.menu_id ? (
                        <Link href={`/culinary/menus/${comp.menu_id}`} className="text-brand-600 hover:underline">{comp.menu_name ?? 'View'}</Link>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {comp.recipe_id ? (
                        <Link href={`/culinary/recipes/${comp.recipe_id}`} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Linked</Link>
                      ) : <span className="text-xs text-stone-400">No recipe</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {stockRecipes.length === 0 && stockComponents.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium">No stocks or broths found</p>
          <p className="text-stone-400 text-sm mt-1">
            Create recipes or menu components with &quot;stock&quot;, &quot;broth&quot;, or &quot;fond&quot; in the name
          </p>
        </Card>
      )}
    </div>
  )
}
