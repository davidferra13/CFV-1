// Ingredient Library Page
// Browse and manage the master ingredients list

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'

export const metadata: Metadata = {
  title: 'Ingredient Library - ChefFlow',
}
import { getIngredients } from '@/lib/recipes/actions'
import { IngredientsClient } from './ingredients-client'

export default async function IngredientsPage({
  searchParams,
}: {
  searchParams: { category?: string; search?: string }
}) {
  await requireChef()

  const ingredients = await getIngredients({
    category: searchParams.category,
    search: searchParams.search,
  })

  return <IngredientsClient ingredients={ingredients} />
}
