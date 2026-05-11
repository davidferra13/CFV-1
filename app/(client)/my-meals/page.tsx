import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getMyMealBoard } from '@/lib/meals/client-meal-actions'
import { MealsClient } from './meals-client'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'My Meals' }

export default async function MyMealsPage() {
  await requireClient()
  const weekData = await getMyMealBoard(0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">My Meals</h1>
        <p className="text-stone-400 mt-1">Your weekly meal board from your chef.</p>
      </div>
      <MealsClient initialWeek={weekData} />
      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}
