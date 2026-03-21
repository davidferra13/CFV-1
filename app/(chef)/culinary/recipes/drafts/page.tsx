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

export const metadata: Metadata = { title: 'Incomplete Recipes - ChefFlow' }

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

function getMissingFields(recipe: { method: string; ingredient_count: number | null }): string[] {
  const missing: string[] = []
  if (!recipe.method || recipe.method.trim() === '') missing.push('method')
  if (!recipe.ingredient_count || recipe.ingredient_count === 0) missing.push('ingredients')
  return missing
}

export default async function IncompleteRecipesPage() {
  await requireChef()
  const allRecipes = await getRecipes()

  // "Drafts" = recipes missing method or ingredients - not yet fully documented
  const incompleteRecipes = allRecipes.filter(
    (r) =>
      !r.method || r.method.trim() === '' || r.ingredient_count === null || r.ingredient_count === 0
  )

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/recipes" className="text-sm text-stone-500 hover:text-stone-300">
          ← Recipe Book
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Incomplete Recipes</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {incompleteRecipes.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Recipes missing a method or ingredients - finish documenting these
        </p>
      </div>

      {incompleteRecipes.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">All recipes are fully documented</p>
          <p className="text-stone-400 text-sm mb-4">
            Every recipe has a method and at least one ingredient
          </p>
          <Link href="/culinary/recipes">
            <Button variant="secondary" size="sm">
              View Recipe Book
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
                <TableHead>Times Cooked</TableHead>
                <TableHead>Missing</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incompleteRecipes.map((recipe) => {
                const missing = getMissingFields(recipe)
                return (
                  <TableRow key={recipe.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/culinary/recipes/${recipe.id}`}
                        className="text-brand-600 hover:text-brand-300 hover:underline"
                      >
                        {recipe.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_STYLES[recipe.category] ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {recipe.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">{recipe.times_cooked}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {missing.map((field) => (
                          <span
                            key={field}
                            className="text-xs bg-red-900 text-red-700 px-2 py-0.5 rounded-full"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/culinary/recipes/${recipe.id}`}>
                        <Button size="sm" variant="secondary">
                          Complete
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
