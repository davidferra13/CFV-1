import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipes } from '@/lib/recipes/actions'
import { getPlaceholderImages } from '@/lib/images/placeholder-actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { NoRecipesIllustration } from '@/components/ui/branded-illustrations'
import { RecipesTable } from './recipes-table'

export const metadata: Metadata = { title: 'Recipe Book - ChefFlow' }

export default async function ChefRecipesPage() {
  await requireChef()
  const recipes = await getRecipes()

  // Batch-fetch placeholder images for recipes without their own photo
  const needPlaceholders = recipes
    .filter((r: any) => !r.photo_url)
    .map((r: any) => ({ id: r.id, query: r.name }))
  const placeholders =
    needPlaceholders.length > 0 ? await getPlaceholderImages(needPlaceholders) : {}

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-100">Recipe Book</h1>
            <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
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
          <p className="text-stone-400 font-medium mb-1">No recipes yet</p>
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
        <RecipesTable recipes={recipes as any} placeholders={placeholders} />
      )}
    </div>
  )
}
