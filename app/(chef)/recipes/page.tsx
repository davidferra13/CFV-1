// Recipe Book - Library Page
// Browse, search, and filter the chef's recipe collection
// Seasonal banner at top shows active season's creative thesis and micro-window alerts.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'

export const metadata: Metadata = { title: 'Recipes' }
import { getRecipes } from '@/lib/recipes/actions'
import { getActivePalette } from '@/lib/seasonal/actions'
import { getActiveMicroWindows, getEndingMicroWindows } from '@/lib/seasonal/helpers'
import { SeasonalBanner } from '@/components/seasonal/seasonal-banner'
import { RecipeLibraryClient } from './recipes-client'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { DietaryTrendsBar } from '@/components/intelligence/dietary-trends-bar'

function DietaryTrendsSkeleton() {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/70 p-4">
      <div className="h-4 w-44 animate-pulse rounded bg-stone-800" />
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-12 animate-pulse rounded bg-stone-800/80" />
        ))}
      </div>
    </div>
  )
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireChef()
  const params = await searchParams
  const page = Math.max(1, parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1)

  const [recipesResult, palette] = await Promise.all([
    getRecipes({
      category: typeof params.category === 'string' ? params.category : undefined,
      cuisine: typeof params.cuisine === 'string' ? params.cuisine : undefined,
      meal_type: typeof params.meal_type === 'string' ? params.meal_type : undefined,
      search: typeof params.search === 'string' ? params.search : undefined,
      sort:
        typeof params.sort === 'string' ? (params.sort as 'name' | 'recent' | 'most_used') : 'name',
      page,
      pageSize: 25,
    }),
    getActivePalette(),
  ])
  const recipes = recipesResult.recipes

  const activeMicroWindows = palette ? getActiveMicroWindows(palette) : []
  const endingMicroWindows = palette ? getEndingMicroWindows(palette) : []

  return (
    <div className="space-y-4">
      <SeasonalBanner
        palette={palette}
        activeMicroWindows={activeMicroWindows}
        endingMicroWindows={endingMicroWindows}
      />

      {/* Dietary Intelligence */}
      <WidgetErrorBoundary name="Dietary Trends" compact>
        <Suspense fallback={<DietaryTrendsSkeleton />}>
          <DietaryTrendsBar />
        </Suspense>
      </WidgetErrorBoundary>

      <RecipeLibraryClient recipes={recipes} pagination={recipesResult.pagination} />
    </div>
  )
}
