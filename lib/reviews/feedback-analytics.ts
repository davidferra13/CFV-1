'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type DimensionAvg = {
  dimension: string
  label: string
  avg: number
  count: number
}

export type FeedbackAnalytics = {
  totalReviews: number
  averageRating: number
  wouldBookAgainPct: number
  dimensions: DimensionAvg[]
  recentTrend: 'improving' | 'stable' | 'declining' | 'insufficient'
  topStrength: string | null
  topWeakness: string | null
}

const DIMENSION_LABELS: Record<string, string> = {
  food_quality_rating: 'Food Quality',
  presentation_rating: 'Presentation',
  communication_rating: 'Communication',
  punctuality_rating: 'Punctuality',
  cleanup_rating: 'Cleanup',
}

/**
 * Compute feedback analytics from client_reviews.
 * All computation is deterministic (Formula > AI).
 */
export async function getFeedbackAnalytics(): Promise<FeedbackAnalytics> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: reviews, error } = await supabase
    .from('client_reviews')
    .select(
      'rating, food_quality_rating, presentation_rating, communication_rating, punctuality_rating, cleanup_rating, would_book_again, created_at'
    )
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch reviews: ${error.message}`)

  const all = (reviews ?? []) as Array<{
    rating: number
    food_quality_rating: number
    presentation_rating: number
    communication_rating: number
    punctuality_rating: number
    cleanup_rating: number
    would_book_again: boolean
    created_at: string
  }>

  const totalReviews = all.length

  if (totalReviews === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      wouldBookAgainPct: 0,
      dimensions: [],
      recentTrend: 'insufficient',
      topStrength: null,
      topWeakness: null,
    }
  }

  const averageRating = all.reduce((sum, r) => sum + r.rating, 0) / totalReviews

  const wouldBookAgainPct = (all.filter((r) => r.would_book_again).length / totalReviews) * 100

  // Dimension averages
  const dimKeys = Object.keys(DIMENSION_LABELS) as Array<keyof typeof DIMENSION_LABELS>
  const dimensions: DimensionAvg[] = dimKeys.map((key) => {
    const values = all.map((r) => (r as any)[key]).filter((v: any) => v != null && v > 0)
    return {
      dimension: key,
      label: DIMENSION_LABELS[key],
      avg:
        values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0,
      count: values.length,
    }
  })

  // Identify top strength and weakness
  const sorted = [...dimensions].filter((d) => d.count > 0).sort((a, b) => b.avg - a.avg)
  const topStrength = sorted.length > 0 ? sorted[0].label : null
  const topWeakness = sorted.length > 1 ? sorted[sorted.length - 1].label : null

  // Trend: compare last 3 reviews avg vs prior 3
  let recentTrend: FeedbackAnalytics['recentTrend'] = 'insufficient'
  if (totalReviews >= 6) {
    const recent3Avg = all.slice(0, 3).reduce((s, r) => s + r.rating, 0) / 3
    const prior3Avg = all.slice(3, 6).reduce((s, r) => s + r.rating, 0) / 3
    const diff = recent3Avg - prior3Avg
    if (diff > 0.3) recentTrend = 'improving'
    else if (diff < -0.3) recentTrend = 'declining'
    else recentTrend = 'stable'
  } else if (totalReviews >= 3) {
    recentTrend = 'stable'
  }

  return {
    totalReviews,
    averageRating: parseFloat(averageRating.toFixed(2)),
    wouldBookAgainPct: parseFloat(wouldBookAgainPct.toFixed(0)),
    dimensions,
    recentTrend,
    topStrength,
    topWeakness,
  }
}
