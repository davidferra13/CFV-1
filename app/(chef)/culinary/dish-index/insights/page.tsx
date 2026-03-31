import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import {
  getDishIndexStats,
  getSeasonalDistribution,
  findPotentialDuplicates,
} from '@/lib/menus/dish-index-actions'
import { DishInsightsClient } from './insights-client'

export const metadata: Metadata = { title: 'Dish Insights' }

export default async function DishInsightsPage() {
  await requireChef()
  const [stats, seasonal, duplicates] = await Promise.all([
    getDishIndexStats(),
    getSeasonalDistribution(),
    findPotentialDuplicates(),
  ])

  return <DishInsightsClient stats={stats} seasonal={seasonal} duplicates={duplicates} />
}
