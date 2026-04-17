// Recipe Detail Page
// Shows full recipe with ingredients, cost summary, and event history

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipeById } from '@/lib/recipes/actions'
import { RecipeDetailClient } from './recipe-detail-client'
import { evaluateCompletion } from '@/lib/completion/engine'

export default async function RecipeDetailPage({ params }: { params: { id: string } }) {
  const user = await requireChef()

  const recipe = await getRecipeById(params.id)

  if (!recipe) {
    notFound()
  }

  let completionData = null
  try {
    completionData = await evaluateCompletion('recipe', params.id, user.tenantId!)
  } catch {
    // Non-blocking: completion card just won't render
  }

  return <RecipeDetailClient recipe={recipe} initialCompletion={completionData} />
}
