'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'

type DishRatingRow = {
  dish_name: string
  sentiment: string | null
  rating: number | null
  comment: string | null
  event_id: string
  event_occasion: string | null
  event_date: string | null
  submitted_at: string
}

export type DishQualityTrend = {
  dishName: string
  dataPoints: number
  currentAvg: number
  previousAvg: number
  trend: 'improving' | 'stable' | 'declining'
  trendMagnitude: number
  firstSeen: string
  lastSeen: string
  events: { eventId: string; eventName: string; date: string; rating: number }[]
}

export type QualityDriftAlert = {
  dishName: string
  severity: 'warning' | 'info'
  message: string
  currentAvg: number
  peakAvg: number
  decline: number
}

function normalizeDishName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

async function fetchDishRatings(tenantId: string): Promise<DishRatingRow[]> {
  const rows = await pgClient`
    SELECT
      df.value->>'dish_name' AS dish_name,
      df.value->>'sentiment' AS sentiment,
      (df.value->>'rating')::int AS rating,
      df.value->>'comment' AS comment,
      gf.event_id,
      e.occasion AS event_occasion,
      e.event_date::text AS event_date,
      gf.submitted_at
    FROM guest_feedback gf,
         jsonb_array_elements(gf.dish_feedback) AS df(value)
    JOIN events e ON e.id = gf.event_id
    WHERE gf.tenant_id = ${tenantId}
      AND gf.submitted_at IS NOT NULL
      AND jsonb_array_length(gf.dish_feedback) > 0
    ORDER BY gf.submitted_at ASC
  `
  return rows as unknown as DishRatingRow[]
}

function groupByDish(rows: DishRatingRow[]): Map<string, DishRatingRow[]> {
  const grouped = new Map<string, DishRatingRow[]>()
  for (const row of rows) {
    if (!row.dish_name) continue
    const key = normalizeDishName(row.dish_name)
    const existing = grouped.get(key)
    if (existing) {
      existing.push(row)
    } else {
      grouped.set(key, [row])
    }
  }
  return grouped
}

function sentimentToRating(sentiment: string | null): number | null {
  if (!sentiment) return null
  if (sentiment === 'liked') return 5
  if (sentiment === 'neutral') return 3
  if (sentiment === 'disliked') return 1
  return null
}

function effectiveRating(row: DishRatingRow): number | null {
  if (row.rating != null) return row.rating
  return sentimentToRating(row.sentiment)
}

export async function getDishQualityTrends(minDataPoints: number = 3): Promise<DishQualityTrend[]> {
  const user = await requireChef()
  const rows = await fetchDishRatings(user.tenantId!)
  const grouped = groupByDish(rows)

  const trends: DishQualityTrend[] = []

  for (const [, dishRows] of grouped) {
    const rated = dishRows
      .map((r) => ({ row: r, rating: effectiveRating(r) }))
      .filter((x): x is { row: DishRatingRow; rating: number } => x.rating !== null)

    if (rated.length < minDataPoints) continue

    const displayName = dishRows[0].dish_name
    const allRatings = rated.map((x) => x.rating)

    const midpoint = Math.floor(rated.length / 2)
    const firstHalf = allRatings.slice(0, midpoint)
    const secondHalf = allRatings.slice(midpoint)

    const firstAvg =
      firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0
    const secondAvg =
      secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0

    const diff = secondAvg - firstAvg
    let trend: 'improving' | 'stable' | 'declining'
    if (diff > 0.5) trend = 'improving'
    else if (diff < -0.5) trend = 'declining'
    else trend = 'stable'

    const events = rated.map((x) => ({
      eventId: x.row.event_id,
      eventName: x.row.event_occasion || 'Event',
      date: x.row.event_date || x.row.submitted_at,
      rating: x.rating,
    }))

    const dates = rated.map((x) => x.row.submitted_at || x.row.event_date || '')

    trends.push({
      dishName: displayName,
      dataPoints: rated.length,
      currentAvg: round1(secondAvg),
      previousAvg: round1(firstAvg),
      trend,
      trendMagnitude: round1(Math.abs(diff)),
      firstSeen: dates[0] || '',
      lastSeen: dates[dates.length - 1] || '',
      events,
    })
  }

  trends.sort((a, b) => b.trendMagnitude - a.trendMagnitude)
  return trends
}

export async function getQualityDriftAlerts(): Promise<QualityDriftAlert[]> {
  const user = await requireChef()
  const rows = await fetchDishRatings(user.tenantId!)
  const grouped = groupByDish(rows)

  const alerts: QualityDriftAlert[] = []

  for (const [, dishRows] of grouped) {
    const rated = dishRows
      .map((r) => ({ row: r, rating: effectiveRating(r) }))
      .filter((x): x is { row: DishRatingRow; rating: number } => x.rating !== null)

    if (rated.length < 3) continue

    const displayName = dishRows[0].dish_name

    let peakAvg = 0
    for (let i = 0; i <= rated.length - 3; i++) {
      const windowAvg = (rated[i].rating + rated[i + 1].rating + rated[i + 2].rating) / 3
      if (windowAvg > peakAvg) peakAvg = windowAvg
    }

    const recentSlice = rated.slice(-3)
    const recentAvg = recentSlice.reduce((a, x) => a + x.rating, 0) / recentSlice.length

    const decline = round1(peakAvg - recentAvg)

    if (decline >= 0.3) {
      const severity: 'warning' | 'info' = decline > 0.5 ? 'warning' : 'info'
      alerts.push({
        dishName: displayName,
        severity,
        message: `${displayName} quality trending down: ${round1(peakAvg)} to ${round1(recentAvg)} over ${rated.length} ratings`,
        currentAvg: round1(recentAvg),
        peakAvg: round1(peakAvg),
        decline,
      })
    }
  }

  alerts.sort((a, b) => b.decline - a.decline)
  return alerts
}

export async function getDishQualitySnapshot(dishName: string): Promise<{
  dishName: string
  totalRatings: number
  overallAvg: number
  ratings: {
    eventId: string
    eventName: string
    date: string
    rating: number
    comment: string | null
    sentiment: string | null
  }[]
} | null> {
  const user = await requireChef()
  const rows = await fetchDishRatings(user.tenantId!)
  const target = normalizeDishName(dishName)

  const matching = rows.filter((r) => r.dish_name && normalizeDishName(r.dish_name) === target)
  if (matching.length === 0) return null

  const rated = matching
    .map((r) => ({ row: r, rating: effectiveRating(r) }))
    .filter((x): x is { row: DishRatingRow; rating: number } => x.rating !== null)

  const overallAvg =
    rated.length > 0 ? round1(rated.reduce((a, x) => a + x.rating, 0) / rated.length) : 0

  return {
    dishName: matching[0].dish_name,
    totalRatings: rated.length,
    overallAvg,
    ratings: matching.map((r) => ({
      eventId: r.event_id,
      eventName: r.event_occasion || 'Event',
      date: r.event_date || r.submitted_at,
      rating: effectiveRating(r) ?? 0,
      comment: r.comment,
      sentiment: r.sentiment,
    })),
  }
}
