import { requireChef } from '@/lib/auth/get-user'
import { isAIConfigured } from '@/lib/ai/parse'
import { CreateRecipeClient } from '@/app/(chef)/recipes/new/create-recipe-client'

export default async function NewCulinaryRecipePage({
  searchParams,
}: {
  searchParams: { component?: string; componentName?: string; componentCategory?: string }
}) {
  const user = await requireChef()
  const aiConfigured = await isAIConfigured()

  return (
    <CreateRecipeClient
      aiConfigured={aiConfigured}
      chefId={user.entityId}
      prefillComponent={
        searchParams.component
          ? {
              componentId: searchParams.component,
              name: searchParams.componentName || '',
              category: searchParams.componentCategory || '',
            }
          : undefined
      }
    />
  )
}
