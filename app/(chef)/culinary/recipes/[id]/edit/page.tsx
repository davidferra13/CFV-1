import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipeById } from '@/lib/recipes/actions'
import { EditRecipeClient } from './edit-recipe-client'

export default async function EditRecipePage({ params }: { params: { id: string } }) {
  const user = await requireChef()

  let recipe: Awaited<ReturnType<typeof getRecipeById>> = null
  try {
    recipe = await getRecipeById(params.id)
  } catch {
    notFound()
  }
  if (!recipe) notFound()

  return <EditRecipeClient recipe={recipe} chefId={user.entityId} />
}
