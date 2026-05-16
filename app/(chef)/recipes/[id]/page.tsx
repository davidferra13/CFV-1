// Recipe Detail Page
// Shows full recipe with ingredients, cost summary, and event history

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipeById } from '@/lib/recipes/actions'
import { RecipeDetailClient } from './recipe-detail-client'
import { evaluateCompletion } from '@/lib/completion/engine'
import { getRecipeProvenance } from '@/lib/collaboration/actions'
import { getRecipeLifecycleStatus } from '@/lib/recipes/lifecycle-actions'
import { getEventsUsingRecipe } from '@/lib/recipes/recipe-events-action'
import { getRecipeStepPhotos } from '@/lib/recipes/recipe-photo-actions'

export default async function RecipeDetailPage({ params }: { params: { id: string } }) {
  const user = await requireChef()

  const [recipe, provenance, completionData, lifecycle, recipeEvents, stepPhotos] =
    await Promise.all([
      getRecipeById(params.id),
      getRecipeProvenance(params.id).catch(() => null),
      evaluateCompletion('recipe', params.id, user.tenantId!).catch(() => null),
      getRecipeLifecycleStatus(params.id).catch(() => null),
      getEventsUsingRecipe(params.id).catch(() => []),
      getRecipeStepPhotos(params.id).catch(() => []),
    ])

  if (!recipe) {
    notFound()
  }

  const lifecycleProps = lifecycle
    ? {
        status: lifecycle.status as 'stub' | 'draft' | 'active' | 'archived',
        versionNumber: lifecycle.versionNumber,
        versionNote: lifecycle.versionNote,
        forkCount: lifecycle.forkCount,
        forkedFrom:
          lifecycle.forkedFromId && lifecycle.forkedFromName
            ? { id: lifecycle.forkedFromId, name: lifecycle.forkedFromName }
            : null,
      }
    : null

  return (
    <RecipeDetailClient
      recipe={recipe}
      initialCompletion={completionData}
      provenance={provenance}
      lifecycle={lifecycleProps}
      recipeEvents={recipeEvents}
      stepPhotos={stepPhotos}
    />
  )
}
