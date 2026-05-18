'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'

export interface DishFrequencyEntry {
  dishName: string
  count: number
  lastServed: string
  uniqueClients: number
  avgRating: number | null
}

export interface DishFrequencyResult {
  dishes: DishFrequencyEntry[]
  diversityScore: number
  periodDays: number
  totalServings: number
}

export interface OverusedDish {
  dishName: string
  count: number
  lastServed: string
  uniqueClients: number
  suggestedAlternatives: string[]
}

function normalizeDays(days: number | undefined, fallback: number): number {
  if (days == null || !Number.isFinite(days)) return fallback
  return Math.max(1, Math.floor(days))
}

export async function getChefDishFrequency(days?: number): Promise<DishFrequencyResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const period = normalizeDays(days, 90)

  const rows = await pgClient<
    {
      dishName: string
      count: number
      lastServed: string
      uniqueClients: number
      avgRating: number | null
    }[]
  >`
    SELECT
      LOWER(TRIM(sdh.dish_name)) AS "dishName",
      COUNT(*)::int AS "count",
      MAX(sdh.served_date)::text AS "lastServed",
      COUNT(DISTINCT sdh.client_id)::int AS "uniqueClients",
      AVG(
        CASE sdh.client_reaction
          WHEN 'loved' THEN 4
          WHEN 'liked' THEN 3
          WHEN 'neutral' THEN 2
          WHEN 'disliked' THEN 1
          ELSE NULL
        END
      )::float AS "avgRating"
    FROM served_dish_history sdh
    WHERE sdh.chef_id = ${tenantId}
      AND sdh.served_date >= CURRENT_DATE - (${period} * INTERVAL '1 day')
    GROUP BY LOWER(TRIM(sdh.dish_name))
    ORDER BY "count" DESC, "dishName" ASC
  `

  const totalServings = rows.reduce((sum, r) => sum + r.count, 0)
  const uniqueDishes = rows.length
  const diversityScore =
    totalServings === 0 ? 100 : Math.round((uniqueDishes / totalServings) * 100)

  return {
    dishes: rows,
    diversityScore: Math.min(diversityScore, 100),
    periodDays: period,
    totalServings,
  }
}

export async function getOverusedDishes(
  days?: number,
  threshold?: number
): Promise<OverusedDish[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const period = normalizeDays(days, 90)
  const minCount = threshold != null && Number.isFinite(threshold) ? threshold : 5

  const overused = await pgClient<
    {
      dishName: string
      count: number
      lastServed: string
      uniqueClients: number
      course: string | null
    }[]
  >`
    SELECT
      LOWER(TRIM(sdh.dish_name)) AS "dishName",
      COUNT(*)::int AS "count",
      MAX(sdh.served_date)::text AS "lastServed",
      COUNT(DISTINCT sdh.client_id)::int AS "uniqueClients",
      di.course
    FROM served_dish_history sdh
    LEFT JOIN dish_index di
      ON di.tenant_id = ${tenantId}
      AND di.canonical_name = LOWER(TRIM(sdh.dish_name))
    WHERE sdh.chef_id = ${tenantId}
      AND sdh.served_date >= CURRENT_DATE - (${period} * INTERVAL '1 day')
    GROUP BY LOWER(TRIM(sdh.dish_name)), di.course
    HAVING COUNT(*) >= ${minCount}
    ORDER BY COUNT(*) DESC
  `

  if (overused.length === 0) return []

  const courses = overused.map((d) => d.course).filter((c): c is string => c != null)
  const uniqueCourses = [...new Set(courses)]

  let alternatives: { name: string; course: string }[] = []
  if (uniqueCourses.length > 0) {
    alternatives = await pgClient<{ name: string; course: string }[]>`
      SELECT di.name, di.course
      FROM dish_index di
      WHERE di.tenant_id = ${tenantId}
        AND di.archived = false
        AND di.rotation_status = 'active'
        AND di.course = ANY(${uniqueCourses})
        AND (
          di.last_served IS NULL
          OR di.last_served < CURRENT_DATE - (${period} * INTERVAL '1 day')
        )
      ORDER BY di.times_served ASC, di.name ASC
      LIMIT 50
    `
  }

  const altsByCourse = new Map<string, string[]>()
  for (const alt of alternatives) {
    const list = altsByCourse.get(alt.course) ?? []
    list.push(alt.name)
    altsByCourse.set(alt.course, list)
  }

  const overusedNames = new Set(overused.map((d) => d.dishName))

  return overused.map((dish) => {
    const courseAlts = dish.course ? (altsByCourse.get(dish.course) ?? []) : []
    const filtered = courseAlts
      .filter((name) => !overusedNames.has(name.toLowerCase().trim()))
      .slice(0, 5)

    return {
      dishName: dish.dishName,
      count: dish.count,
      lastServed: dish.lastServed,
      uniqueClients: dish.uniqueClients,
      suggestedAlternatives: filtered,
    }
  })
}
