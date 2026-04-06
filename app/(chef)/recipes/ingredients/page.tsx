// Ingredient Library Page
// Browse and manage the master ingredients list

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'

export const metadata: Metadata = {
  title: 'Ingredient Library',
}
import { getIngredients } from '@/lib/recipes/actions'
import { IngredientsClient } from './ingredients-client'
import { IngredientHealthBanner } from '@/components/pricing/ingredient-health-banner'
import { getIngredientHealthAction } from '@/lib/pricing/ingredient-health-actions'

export default async function IngredientsPage({
  searchParams,
}: {
  searchParams: { category?: string; search?: string }
}) {
  await requireChef()

  const [ingredients, health] = await Promise.all([
    getIngredients({
      category: searchParams.category,
      search: searchParams.search,
    }),
    getIngredientHealthAction().catch(() => null),
  ])

  return (
    <div className="space-y-6">
      {health && <IngredientHealthBanner health={health} />}
      <IngredientsClient ingredients={ingredients} />
    </div>
  )
}
