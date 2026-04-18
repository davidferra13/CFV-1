// Recipe Detail Page
// Shows full recipe with ingredients, cost summary, and event history

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipeById } from '@/lib/recipes/actions'
import { RecipeDetailClient } from './recipe-detail-client'
import { evaluateCompletion } from '@/lib/completion/engine'
import { getRecipeProvenance } from '@/lib/collaboration/actions'

export default async function RecipeDetailPage({ params }: { params: { id: string } }) {
  const user = await requireChef()

  const [recipe, provenance, completionData] = await Promise.all([
    getRecipeById(params.id),
    getRecipeProvenance(params.id).catch(() => null),
    evaluateCompletion('recipe', params.id, user.tenantId!).catch(() => null),
  ])

  if (!recipe) {
    notFound()
  }

  return (
    <RecipeDetailClient
      recipe={recipe}
      initialCompletion={completionData}
      provenance={provenance}
    />
  )
}
