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

export const metadata: Metadata = { title: 'Dietary Flags - ChefFlow' }

const DIETARY_COLORS: Record<string, string> = {
  vegan: 'bg-green-900 text-green-200',
  vegetarian: 'bg-lime-900 text-lime-200',
  'gluten-free': 'bg-yellow-900 text-yellow-200',
  'dairy-free': 'bg-blue-900 text-blue-200',
  'nut-free': 'bg-orange-900 text-orange-200',
  paleo: 'bg-amber-900 text-amber-200',
  keto: 'bg-purple-900 text-purple-200',
  halal: 'bg-teal-900 text-teal-200',
  kosher: 'bg-sky-900 text-sky-200',
}

export default async function DietaryFlagsPage() {
  await requireChef()
  const recipes = await getRecipes()

  const flagged = recipes.filter((r) => r.dietary_tags.length > 0)
  const unflagged = recipes.filter((r) => r.dietary_tags.length === 0)

  // Count per dietary flag
  const flagCounts = new Map<string, number>()
  for (const recipe of recipes) {
    for (const tag of recipe.dietary_tags) {
      flagCounts.set(tag, (flagCounts.get(tag) ?? 0) + 1)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/recipes" className="text-sm text-stone-500 hover:text-stone-300">
          ← Recipe Book
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Dietary Flags</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {flagged.length} flagged
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Recipes with dietary labels — essential for client accommodation
        </p>
      </div>

      {flagCounts.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from(flagCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([flag, count]) => (
              <span
                key={flag}
                className={`text-sm px-3 py-1 rounded-full font-medium ${DIETARY_COLORS[flag] ?? 'bg-stone-800 text-stone-400'}`}
              >
                {flag} ({count})
              </span>
            ))}
        </div>
      )}

      {flagged.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No recipes with dietary flags</p>
          <p className="text-stone-400 text-sm mt-1">
            Add dietary tags to recipes to track accommodations
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipe</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Dietary Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flagged.map((recipe) => (
                <TableRow key={recipe.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/culinary/recipes/${recipe.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      {recipe.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 capitalize">
                      {recipe.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {recipe.dietary_tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-xs px-2 py-0.5 rounded-full ${DIETARY_COLORS[tag] ?? 'bg-stone-800 text-stone-400'}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {unflagged.length > 0 && (
        <p className="text-xs text-stone-400">
          {unflagged.length} recipe{unflagged.length > 1 ? 's' : ''} without dietary flags —{' '}
          <Link href="/culinary/recipes" className="text-brand-600 hover:underline">
            view all recipes
          </Link>
        </p>
      )}
    </div>
  )
}
