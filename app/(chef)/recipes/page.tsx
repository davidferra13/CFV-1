// Recipe Bible — Library Page
// Browse, search, and filter the chef's recipe collection
// Seasonal banner at top shows active season's creative thesis and micro-window alerts.

import { requireChef } from '@/lib/auth/get-user'
import { getRecipes } from '@/lib/recipes/actions'
import { getActivePalette } from '@/lib/seasonal/actions'
import { getActiveMicroWindows, getEndingMicroWindows } from '@/lib/seasonal/helpers'
import { SeasonalBanner } from '@/components/seasonal/seasonal-banner'
import { RecipeLibraryClient } from './recipes-client'

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: { category?: string; search?: string; sort?: string }
}) {
  await requireChef()

  const [recipes, palette] = await Promise.all([
    getRecipes({
      category: searchParams.category,
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
