import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipes } from '@/lib/recipes/actions'
import { Button } from '@/components/ui/button'
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
import { NoRecipesIllustration } from '@/components/ui/branded-illustrations'

export const metadata: Metadata = { title: 'Recipe Book - ChefFlow' }

const CATEGORY_STYLES: Record<string, string> = {
  sauce: 'bg-orange-100 text-orange-700',
  protein: 'bg-red-100 text-red-700',
  starch: 'bg-yellow-100 text-yellow-700',
  vegetable: 'bg-green-100 text-green-700',
  fruit: 'bg-lime-100 text-lime-700',
  dessert: 'bg-pink-100 text-pink-700',
  bread: 'bg-amber-100 text-amber-700',
  pasta: 'bg-yellow-100 text-yellow-600',
  soup: 'bg-teal-100 text-teal-700',
  salad: 'bg-emerald-100 text-emerald-700',
  appetizer: 'bg-purple-100 text-purple-700',
  condiment: 'bg-stone-100 text-stone-700',
  beverage: 'bg-sky-100 text-sky-700',
  other: 'bg-stone-100 text-stone-600',
}

export default async function ChefRecipesPage() {
  await requireChef()
  const recipes = await getRecipes()

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-900">Recipe Book</h1>
            <span className="bg-stone-100 text-stone-600 text-sm px-2 py-0.5 rounded-full">
              {recipes.length}
            </span>
          </div>
          <Link href="/culinary/recipes/new">
            <Button>Add Recipe</Button>
          </Link>
        </div>
        <p className="text-stone-500 mt-1">Your complete collection of documented recipes</p>
      </div>

      {recipes.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex justify-center mb-4">
            <NoRecipesIllustration className="h-24 w-24" />
          </div>
          <p className="text-stone-600 font-medium mb-1">No recipes yet</p>
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
                <TableHead>Total Time</TableHead>
                <TableHead>Yield</TableHead>
                <TableHead>Ingredients</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Times Cooked</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipes.map((recipe) => (
                <TableRow key={recipe.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/culinary/recipes/${recipe.id}`}
                      className="text-brand-600 hover:text-brand-800 hover:underline"
                    >
                      {recipe.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_STYLES[recipe.category] ?? 'bg-stone-100 text-stone-600'}`}
                    >
                      {recipe.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">
                    {recipe.cook_time_minutes ? `${recipe.cook_time_minutes}m` : '—'}
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">
                    {recipe.yield_quantity && recipe.yield_unit
                      ? `${recipe.yield_quantity} ${recipe.yield_unit}`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">
                    {recipe.ingredient_count ?? '—'}
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">
                    {recipe.total_cost_cents != null ? (
                      <span className={recipe.has_all_prices ? '' : 'text-stone-400'}>
                        {formatCurrency(recipe.total_cost_cents)}
                        {!recipe.has_all_prices && <span className="text-xs ml-1">est.</span>}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-stone-600 text-sm">{recipe.times_cooked}</TableCell>
                  <TableCell>
                    <Link href={`/culinary/recipes/${recipe.id}`}>
                      <Button size="sm" variant="secondary">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
