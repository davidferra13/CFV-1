import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipes } from '@/lib/recipes/actions'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Recipe Tags - ChefFlow' }

export default async function RecipeTagsPage() {
  await requireChef()
  const recipes = await getRecipes()

  // Build tag → recipe list map
  const tagMap = new Map<string, typeof recipes>()
  for (const recipe of recipes) {
    for (const tag of recipe.dietary_tags) {
      const existing = tagMap.get(tag) ?? []
      existing.push(recipe)
      tagMap.set(tag, existing)
    }
  }

  const tagList = Array.from(tagMap.entries()).sort((a, b) => b[1].length - a[1].length)
  const untaggedCount = recipes.filter((r) => r.dietary_tags.length === 0).length

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/recipes" className="text-sm text-stone-500 hover:text-stone-300">
          ← Recipe Book
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Recipe Tags</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {tagList.length} tags
          </span>
        </div>
        <p className="text-stone-500 mt-1">Recipes organized by dietary tags</p>
      </div>

      {tagList.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No tagged recipes yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Add dietary tags when creating or editing recipes
          </p>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {tagList.map(([tag, tagRecipes]) => (
              <span
                key={tag}
                className="bg-stone-800 text-stone-300 text-sm px-3 py-1 rounded-full font-medium"
              >
                {tag} ({tagRecipes.length})
              </span>
            ))}
            {untaggedCount > 0 && (
              <span className="bg-stone-800 text-stone-400 text-sm px-3 py-1 rounded-full">
                {untaggedCount} untagged
              </span>
            )}
          </div>

          <div className="space-y-6">
            {tagList.map(([tag, tagRecipes]) => (
              <div key={tag}>
                <h2 className="text-base font-semibold text-stone-200 mb-3 capitalize">{tag}</h2>
                <div className="grid grid-cols-2 gap-2">
                  {tagRecipes.map((recipe) => (
                    <Card key={recipe.id} className="p-3">
                      <Link
                        href={`/culinary/recipes/${recipe.id}`}
                        className="text-brand-600 hover:underline font-medium text-sm"
                      >
                        {recipe.name}
                      </Link>
                      <p className="text-xs text-stone-400 mt-0.5 capitalize">{recipe.category}</p>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
