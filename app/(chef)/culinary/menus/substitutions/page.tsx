import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipes } from '@/lib/recipes/actions'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Substitutions & Adaptations' }

export default async function SubstitutionsPage() {
  await requireChef()
  const recipes = await getRecipes()

  // Recipes with adaptations = substitution reference
  const withAdaptations = recipes.filter((r) => (r as any).adaptations)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/menus" className="text-sm text-stone-500 hover:text-stone-300">
          ← Menus
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Substitutions &amp; Adaptations</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {withAdaptations.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Recipes with documented ingredient substitutions and dietary adaptations
        </p>
      </div>

      <Card className="p-4 bg-stone-800 border-stone-700">
        <p className="text-sm text-stone-400">
          Substitutions in ChefFlow are stored in each recipe&apos;s <strong>Adaptations</strong>{' '}
          field. Edit a recipe to document common swaps - dairy-free alternatives, gluten-free
          versions, seasonal ingredient changes, etc.
        </p>
      </Card>

      {withAdaptations.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No recipes with adaptations yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Add an &quot;Adaptations&quot; note to any recipe to document substitutions and
            alternatives
          </p>
          <Link
            href="/culinary/recipes"
            className="text-brand-600 hover:underline text-sm mt-3 inline-block"
          >
            Browse recipes →
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {withAdaptations.map((recipe) => (
            <Card key={recipe.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Link
                    href={`/culinary/recipes/${recipe.id}`}
                    className="font-semibold text-stone-100 hover:text-brand-600"
                  >
                    {recipe.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 mb-2">
                    <span className="text-xs bg-stone-800 text-stone-500 px-2 py-0.5 rounded-full capitalize">
                      {recipe.category}
                    </span>
                    {recipe.dietary_tags.length > 0 &&
                      recipe.dietary_tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-stone-800 text-stone-500 px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                  <p className="text-sm text-stone-400 line-clamp-3">
                    {(recipe as any).adaptations}
                  </p>
                </div>
                <Link href={`/culinary/recipes/${recipe.id}`}>
                  <span className="text-xs text-brand-600 hover:underline cursor-pointer shrink-0">
                    View recipe →
                  </span>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
