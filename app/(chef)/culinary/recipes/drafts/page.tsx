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

export const metadata: Metadata = { title: 'Incomplete Recipes' }

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

type SearchParams = {
  category?: string
}

function getMissingFields(recipe: { method: string; ingredient_count: number | null }): string[] {
  const missing: string[] = []
  if (!recipe.method || recipe.method.trim() === '') missing.push('method')
  if (!recipe.ingredient_count || recipe.ingredient_count === 0) missing.push('ingredients')
  return missing
}

function getCategoryKey(category: string | null | undefined): string {
  const normalized = (category ?? '').trim().toLowerCase()
  return CATEGORY_STYLES[normalized] ? normalized : 'other'
}

function getCategoryLabel(category: string): string {
  return category
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeCategoryFilter(value: string | undefined): string | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'all') return null
  return CATEGORY_STYLES[normalized] ? normalized : null
}

export default async function IncompleteRecipesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  await requireChef()
  const params = await searchParams
  const activeCategory = normalizeCategoryFilter(params?.category)
  const allRecipes = await getRecipes()

  // "Drafts" = recipes missing method or ingredients - not yet fully documented
  const incompleteRecipes = allRecipes.filter(
    (r) =>
      !r.method || r.method.trim() === '' || r.ingredient_count === null || r.ingredient_count === 0
  )
  const categoryCounts = incompleteRecipes.reduce<Record<string, number>>((counts, recipe) => {
    const category = getCategoryKey(recipe.category)
    counts[category] = (counts[category] ?? 0) + 1
    return counts
  }, {})
  const categoriesWithRecipes = Object.entries(categoryCounts).sort(([a], [b]) =>
    getCategoryLabel(a).localeCompare(getCategoryLabel(b))
  )
  const visibleRecipes = activeCategory
    ? incompleteRecipes.filter((recipe) => getCategoryKey(recipe.category) === activeCategory)
    : incompleteRecipes

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
        <div className="space-y-4">
          <Card>
            <div className="border-b border-stone-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-stone-200">Incomplete by Category</h2>
              <p className="mt-1 text-xs text-stone-500">
                Select a category to focus the recipe list below.
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Incomplete Recipes</TableHead>
                  <TableHead>Filter</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className={!activeCategory ? 'bg-stone-900/60' : undefined}>
                  <TableCell className="font-medium text-stone-100">All categories</TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {incompleteRecipes.length}
                  </TableCell>
                  <TableCell>
                    <Link href="/culinary/recipes/drafts">
                      <Button size="sm" variant={!activeCategory ? 'primary' : 'secondary'}>
                        View All
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
                {categoriesWithRecipes.map(([category, count]) => {
                  const isActive = activeCategory === category
                  return (
                    <TableRow key={category} className={isActive ? 'bg-stone-900/60' : undefined}>
                      <TableCell>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_STYLES[category]}`}
                        >
                          {getCategoryLabel(category)}
                        </span>
                      </TableCell>
                      <TableCell className="text-stone-400 text-sm">{count}</TableCell>
                      <TableCell>
                        <Link href={`/culinary/recipes/drafts?category=${category}`}>
                          <Button size="sm" variant={isActive ? 'primary' : 'secondary'}>
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

          <Card>
            <div className="border-b border-stone-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-stone-200">
                {activeCategory
                  ? `${getCategoryLabel(activeCategory)} Incomplete Recipes`
                  : 'All Incomplete Recipes'}
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                {visibleRecipes.length} recipe{visibleRecipes.length === 1 ? '' : 's'} need
                documentation.
              </p>
            </div>
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
                {visibleRecipes.map((recipe) => {
                  const missing = getMissingFields(recipe)
                  const category = getCategoryKey(recipe.category)
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
                          className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_STYLES[category]}`}
                        >
                          {getCategoryLabel(category)}
                        </span>
                      </TableCell>
                      <TableCell className="text-stone-400 text-sm">
                        {recipe.times_cooked}
                      </TableCell>
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
        </div>
      )}
    </div>
  )
}
