import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getDishIndex, getDishIndexStats } from '@/lib/menus/dish-index-actions'
import { DishIndexClient } from './dish-index-client'

export const metadata: Metadata = { title: 'Dish Index - ChefFlow' }

export default async function DishIndexPage() {
  await requireChef()
  const [{ dishes, total }, stats] = await Promise.all([
    getDishIndex({ limit: 50 }),
    getDishIndexStats(),
  ])

  return <DishIndexClient initialDishes={dishes} totalCount={total} stats={stats} />
}
