import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getMyDishHistory } from '@/lib/recipes/client-recipe-actions'
import { RecipesClient } from './recipes-client'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'My Recipes' }

export default async function MyRecipesPage() {
  await requireClient()
  const dishes = await getMyDishHistory()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Dish History</h1>
        <p className="text-stone-400 mt-1">Everything your chef has prepared for you.</p>
      </div>
      <RecipesClient dishes={dishes} />
      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}
