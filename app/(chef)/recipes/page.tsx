// Recipe Book — Library Page
// Browse, search, and filter the chef's recipe collection
// Seasonal banner at top shows active season's creative thesis and micro-window alerts.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'

export const metadata: Metadata = { title: 'Recipes - ChefFlow' }
import { getRecipes } from '@/lib/recipes/actions'
import { getActivePalette } from '@/lib/seasonal/actions'
import { getActiveMicroWindows, getEndingMicroWindows } from '@/lib/seasonal/helpers'
import { SeasonalBanner } from '@/components/seasonal/seasonal-banner'
import { RecipeLibraryClient } from './recipes-client'

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: {
    category?: string
    cuisine?: string
    meal_type?: string
    search?: string
    sort?: string
  }
}) {
  await requireChef()

  const [recipes, palette] = await Promise.all([
    getRecipes({
      category: searchParams.category,
      cuisine: searchParams.cuisine,
      meal_type: searchParams.meal_type,
      search: searchParams.search,
      sort: (searchParams.sort as 'name' | 'recent' | 'most_used') || 'name',
    }),
    getActivePalette(),
  ])

  const activeMicroWindows = palette ? getActiveMicroWindows(palette) : []
  const endingMicroWindows = palette ? getEndingMicroWindows(palette) : []

  return (
    <>
      <SeasonalBanner
        palette={palette}
        activeMicroWindows={activeMicroWindows}
        endingMicroWindows={endingMicroWindows}
      />
      <RecipeLibraryClient recipes={recipes} />
    </>
  )
}
