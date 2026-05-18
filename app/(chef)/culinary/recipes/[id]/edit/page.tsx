import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipeById } from '@/lib/recipes/actions'
import { EditRecipeClient } from '@/app/(chef)/recipes/[id]/edit/edit-recipe-client'

export async function generateMetadata() {
  return { title: 'Edit Recipe | ChefFlow' }
}

export default async function EditCulinaryRecipePage({ params }: { params: { id: string } }) {
  const user = await requireChef()

  const recipe = await getRecipeById(params.id)

  if (!recipe) {
    notFound()
  }

  return <EditRecipeClient recipe={recipe} chefId={user.entityId} />
}
