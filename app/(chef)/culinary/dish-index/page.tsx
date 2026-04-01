import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getDishIndex, getDishIndexStats } from '@/lib/menus/dish-index-actions'
import { DishIndexClient } from './dish-index-client'

export const metadata: Metadata = { title: 'Dish Index' }

export default async function DishIndexPage() {
  await requireChef()

  let dishes: any[] = []
  let total = 0
  let stats: any = null
  let loadError: string | null = null

  try {
    const [indexResult, statsResult] = await Promise.all([
      getDishIndex({ limit: 50 }).catch((err: unknown) => {
        console.error('[DishIndexPage] getDishIndex failed:', err)
        return { dishes: [], total: 0, error: err instanceof Error ? err.message : 'Unknown error' }
      }),
      getDishIndexStats().catch((err: unknown) => {
        console.error('[DishIndexPage] getDishIndexStats failed:', err)
        return null
      }),
    ])
    dishes = (indexResult as any).dishes ?? []
    total = (indexResult as any).total ?? 0
    stats = statsResult
    if ((indexResult as any).error) {
      loadError = (indexResult as any).error
    }
  } catch (err: unknown) {
    loadError = err instanceof Error ? err.message : 'Failed to load dish index'
    console.error('[DishIndexPage] Unhandled error:', err)
  }

  return (
    <DishIndexClient
      initialDishes={dishes}
      totalCount={total}
      stats={stats}
      loadError={loadError}
    />
  )
}
