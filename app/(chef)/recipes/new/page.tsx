// Create Recipe Page
// Two modes: Smart Import (AI-parsed) or Manual form entry

import { requireChef } from '@/lib/auth/get-user'
import { isAIConfigured } from '@/lib/ai/parse'
import { CreateRecipeClient } from './create-recipe-client'

export default async function NewRecipePage({
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
