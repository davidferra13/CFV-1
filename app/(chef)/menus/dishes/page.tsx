// Dish Index — every dish ever created across all menus

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getDishIndex } from '@/lib/menus/actions'
import { DishIndexClient } from './dish-index-client'

export const metadata: Metadata = { title: 'Dish Index - ChefFlow' }

export default async function DishIndexPage() {
  await requireChef()
  const dishes = await getDishIndex()
  return <DishIndexClient dishes={dishes} />
}
