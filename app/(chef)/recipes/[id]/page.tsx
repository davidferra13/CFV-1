// Recipe Detail Page
// Shows full recipe with ingredients, cost summary, and event history

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipeById } from '@/lib/recipes/actions'
import { RecipeDetailClient } from './recipe-detail-client'

export default async function RecipeDetailPage({
  params
}: {
  params: { id: string }
}) {
  await requireChef()

  const recipe = await getRecipeById(params.id)

  if (!recipe) {
    notFound()
  }

  return <RecipeDetailClient recipe={recipe} />
}
