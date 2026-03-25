'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface DishFeedbackSummary {
  avgRating: number
  totalReviews: number
  wouldServeAgainPct: number
}

/**
 * Aggregates dish_feedback ratings for a set of dish IDs.
 * Returns a map of dishId to summary stats. Missing dishes are omitted.
 */
export async function getDishFeedbackSummary(
  dishIds: string[]
): Promise<Record<string, DishFeedbackSummary>> {
  if (!dishIds.length) return {}

  const user = await requireChef()
  const db = await createServerClient()

  const { data, error } = await db
    .from('dish_feedback')
    .select('dish_id, rating, would_serve_again')
    .eq('tenant_id', user.tenantId!)
    .in('dish_id', dishIds)

  if (error) {
    console.error('[dish-feedback-query] Failed to fetch feedback:', error.message)
    return {}
  }

  if (!data || data.length === 0) return {}

  // Group by dish_id and aggregate
  const grouped: Record<
    string,
    { ratings: number[]; serveAgainYes: number; serveAgainTotal: number }
  > = {}

  for (const row of data) {
    if (!grouped[row.dish_id]) {
      grouped[row.dish_id] = { ratings: [], serveAgainYes: 0, serveAgainTotal: 0 }
    }
    const g = grouped[row.dish_id]
    if (row.rating != null) {
      g.ratings.push(row.rating)
    }
    if (row.would_serve_again != null) {
      g.serveAgainTotal++
      if (row.would_serve_again) g.serveAgainYes++
    }
  }

  const result: Record<string, DishFeedbackSummary> = {}

  for (const [dishId, g] of Object.entries(grouped)) {
    const totalReviews = g.ratings.length
    if (totalReviews === 0) continue

    const avgRating = Math.round((g.ratings.reduce((a, b) => a + b, 0) / totalReviews) * 10) / 10
    const wouldServeAgainPct =
      g.serveAgainTotal > 0 ? Math.round((g.serveAgainYes / g.serveAgainTotal) * 100) : 0

    result[dishId] = { avgRating, totalReviews, wouldServeAgainPct }
  }

  return result
}
