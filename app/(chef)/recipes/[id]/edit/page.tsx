// Edit Recipe Page
// Pre-populated form for editing an existing recipe

import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipeById } from '@/lib/recipes/actions'
import { EditRecipeClient } from './edit-recipe-client'

export default async function EditRecipePage({
  params
}: {
  params: { id: string }
}) {
  await requireChef()

  const recipe = await getRecipeById(params.id)

  if (!recipe) {
    notFound()
  }

  return <EditRecipeClient recipe={recipe} />
}
