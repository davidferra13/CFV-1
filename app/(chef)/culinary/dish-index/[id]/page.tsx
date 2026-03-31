import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import {
  getDishById,
  getDishAppearances,
  getDishFeedback,
  getDishPairings,
} from '@/lib/menus/dish-index-actions'
import { DishDetailClient } from './dish-detail-client'
import { getRecipes } from '@/lib/recipes/actions'

export const metadata: Metadata = { title: 'Dish Detail' }

export default async function DishDetailPage({ params }: { params: { id: string } }) {
  await requireChef()
  const [dish, appearances, feedback, pairings, recipes] = await Promise.all([
    getDishById(params.id),
    getDishAppearances(params.id),
    getDishFeedback(params.id),
    getDishPairings(params.id),
    getRecipes(),
  ])

  return (
    <DishDetailClient
      dish={dish}
      appearances={appearances}
      feedback={feedback}
      pairings={pairings}
      recipes={recipes}
    />
  )
}
