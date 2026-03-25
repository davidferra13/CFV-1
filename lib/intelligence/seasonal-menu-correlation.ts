'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SeasonalDishPerformance {
  dishName: string
  recipeId: string | null
  season: 'winter' | 'spring' | 'summer' | 'fall'
  timesServed: number
  avgEventRevenueCents: number
  avgEventRating: number | null
  occasions: string[]
}

export interface SeasonalMenuPattern {
  season: 'winter' | 'spring' | 'summer' | 'fall'
  months: string
  eventCount: number
  topDishes: { name: string; count: number }[]
  avgRevenueCents: number
  avgGuestCount: number
  popularOccasions: string[]
}

export interface DishSeasonalityScore {
  dishName: string
  bestSeason: 'winter' | 'spring' | 'summer' | 'fall'
  worstSeason: 'winter' | 'spring' | 'summer' | 'fall' | null
  seasonality: 'highly_seasonal' | 'moderate' | 'year_round'
  seasonCounts: { winter: number; spring: number; summer: number; fall: number }
}

export interface SeasonalMenuResult {
  patterns: SeasonalMenuPattern[]
  dishSeasonality: DishSeasonalityScore[]
  topDishes: SeasonalDishPerformance[]
  currentSeasonRecommendations: string[]
  menuDiversityScore: number // 0-100 - how varied the menu is across seasons
  totalDishesTracked: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSeason(month: number): 'winter' | 'spring' | 'summer' | 'fall' {
  if (month <= 2 || month === 12) return 'winter'
  if (month <= 5) return 'spring'
  if (month <= 8) return 'summer'
  return 'fall'
}

function getSeasonMonths(season: string): string {
  switch (season) {
    case 'winter':
      return 'Dec-Feb'
    case 'spring':
      return 'Mar-May'
    case 'summer':
      return 'Jun-Aug'
    case 'fall':
      return 'Sep-Nov'
    default:
      return ''
  }
}

function getCurrentSeason(): 'winter' | 'spring' | 'summer' | 'fall' {
  return getSeason(new Date().getMonth() + 1)
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getSeasonalMenuCorrelation(): Promise<SeasonalMenuResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch events with menus
  const { data: events, error } = await db
    .from('events')
    .select('id, event_date, menu_id, occasion, guest_count, quoted_price_cents')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .not('menu_id', 'is', null)
    .order('event_date', { ascending: true })

  if (error || !events || events.length < 5) return null

  // Fetch menu dishes
  const menuIds = [...new Set(events.map((e: any) => e.menu_id))]
  const { data: dishes } = await db
    .from('dishes')
    .select('id, menu_id, name, linked_recipe_id')
    .in('menu_id', menuIds)
    .eq('tenant_id', tenantId)

  if (!dishes || dishes.length === 0) return null

  // Map menu → dishes
  const menuDishMap = new Map<string, { name: string; recipeId: string | null }[]>()
  for (const dish of dishes) {
    if (!menuDishMap.has(dish.menu_id)) menuDishMap.set(dish.menu_id, [])
    menuDishMap.get(dish.menu_id)!.push({ name: dish.name, recipeId: dish.linked_recipe_id })
  }

  // ─── Seasonal Patterns ───

  const seasonData = new Map<
    string,
    {
      events: any[]
      dishCounts: Map<string, number>
      occasions: Map<string, number>
      totalRevenue: number
      totalGuests: number
    }
  >()

  for (const s of ['winter', 'spring', 'summer', 'fall'] as const) {
    seasonData.set(s, {
      events: [],
      dishCounts: new Map(),
      occasions: new Map(),
      totalRevenue: 0,
      totalGuests: 0,
    })
  }

  // Track dish → season mapping
  const dishSeasonMap = new Map<
    string,
    { winter: number; spring: number; summer: number; fall: number; recipeId: string | null }
  >()

  for (const event of events) {
    const month = new Date(event.event_date).getMonth() + 1
    const season = getSeason(month)
    const sd = seasonData.get(season)!
    sd.events.push(event)
    sd.totalRevenue += event.quoted_price_cents || 0
    sd.totalGuests += event.guest_count || 0

    if (event.occasion) {
      sd.occasions.set(event.occasion, (sd.occasions.get(event.occasion) || 0) + 1)
    }

    // Track dishes served in this season
    const eventDishes = menuDishMap.get(event.menu_id) || []
    for (const dish of eventDishes) {
      sd.dishCounts.set(dish.name, (sd.dishCounts.get(dish.name) || 0) + 1)

      if (!dishSeasonMap.has(dish.name)) {
        dishSeasonMap.set(dish.name, {
          winter: 0,
          spring: 0,
          summer: 0,
          fall: 0,
          recipeId: dish.recipeId,
        })
      }
      dishSeasonMap.get(dish.name)![season]++
    }
  }

  // Build seasonal patterns
  const patterns: SeasonalMenuPattern[] = (['winter', 'spring', 'summer', 'fall'] as const)
    .map((season) => {
      const sd = seasonData.get(season)!
      const topDishes = Array.from(sd.dishCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))

      const popularOccasions = Array.from(sd.occasions.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name)

      return {
        season,
        months: getSeasonMonths(season),
        eventCount: sd.events.length,
        topDishes,
        avgRevenueCents: sd.events.length > 0 ? Math.round(sd.totalRevenue / sd.events.length) : 0,
        avgGuestCount: sd.events.length > 0 ? Math.round(sd.totalGuests / sd.events.length) : 0,
        popularOccasions,
      }
    })
    .filter((p) => p.eventCount > 0)

  // ─── Dish Seasonality Scores ───

  const dishSeasonality: DishSeasonalityScore[] = Array.from(dishSeasonMap.entries())
    .filter(([, counts]) => {
      const total = counts.winter + counts.spring + counts.summer + counts.fall
      return total >= 3
    })
    .map(([dishName, counts]) => {
      const seasons = ['winter', 'spring', 'summer', 'fall'] as const
      const seasonCounts = {
        winter: counts.winter,
        spring: counts.spring,
        summer: counts.summer,
        fall: counts.fall,
      }
      const total = counts.winter + counts.spring + counts.summer + counts.fall

      const sorted = seasons
        .map((s) => ({ season: s, count: counts[s] }))
        .sort((a, b) => b.count - a.count)

      const bestSeason = sorted[0].season
      const worstSeason =
        sorted[sorted.length - 1].count === 0 ? sorted[sorted.length - 1].season : null

      // Seasonality score based on distribution variance
      const avg = total / 4
      const variance = seasons.reduce((s, sn) => s + Math.pow(counts[sn] - avg, 2), 0) / 4
      const cv = avg > 0 ? Math.sqrt(variance) / avg : 0

      const seasonality: DishSeasonalityScore['seasonality'] =
        cv > 0.8 ? 'highly_seasonal' : cv > 0.4 ? 'moderate' : 'year_round'

      return { dishName, bestSeason, worstSeason, seasonality, seasonCounts }
    })
    .sort((a, b) => {
      const order = { highly_seasonal: 0, moderate: 1, year_round: 2 }
      return order[a.seasonality] - order[b.seasonality]
    })

  // ─── Top Dishes with Performance ───

  const topDishes: SeasonalDishPerformance[] = Array.from(dishSeasonMap.entries())
    .filter(([, counts]) => {
      const total = counts.winter + counts.spring + counts.summer + counts.fall
      return total >= 2
    })
    .flatMap(([dishName, counts]) => {
      const seasons = ['winter', 'spring', 'summer', 'fall'] as const
      return seasons
        .filter((s) => counts[s] >= 2)
        .map((season) => {
          // Find events in this season with this dish
          const sd = seasonData.get(season)!
          const matchingEvents = sd.events.filter((e: any) => {
            const eventDishes = menuDishMap.get(e.menu_id) || []
            return eventDishes.some((d) => d.name === dishName)
          })

          const avgRevenue =
            matchingEvents.length > 0
              ? Math.round(
                  matchingEvents.reduce((s: number, e: any) => s + (e.quoted_price_cents || 0), 0) /
                    matchingEvents.length
                )
              : 0
          const occasions = [...new Set(matchingEvents.map((e: any) => e.occasion).filter(Boolean))]

          return {
            dishName,
            recipeId: counts.recipeId,
            season,
            timesServed: counts[season],
            avgEventRevenueCents: avgRevenue,
            avgEventRating: null,
            occasions,
          }
        })
    })
    .sort((a, b) => b.timesServed - a.timesServed)
    .slice(0, 20)

  // ─── Current Season Recommendations ───

  const currentSeason = getCurrentSeason()
  const currentSD = seasonData.get(currentSeason)!
  const recommendations: string[] = []

  // Recommend top dishes from this season historically
  const currentTopDishes = Array.from(currentSD.dishCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  if (currentTopDishes.length > 0) {
    recommendations.push(
      `Your top ${currentSeason} dishes: ${currentTopDishes.map(([n, c]) => `${n} (${c}x)`).join(', ')}`
    )
  }

  // Recommend seasonal dishes not yet used this current season
  const highlySeasonalForNow = dishSeasonality.filter(
    (d) => d.bestSeason === currentSeason && d.seasonality === 'highly_seasonal'
  )
  if (highlySeasonalForNow.length > 0) {
    recommendations.push(
      `Seasonal specialties to feature: ${highlySeasonalForNow.map((d) => d.dishName).join(', ')}`
    )
  }

  // Menu diversity score - how varied dishes are across seasons
  const seasonsWithDishes = patterns.filter((p) => p.topDishes.length > 0).length
  const uniqueDishesPerSeason = patterns.map((p) => new Set(p.topDishes.map((d) => d.name)))
  const allDishes = new Set(dishSeasonMap.keys())
  const diversityScore =
    allDishes.size > 0 && seasonsWithDishes > 0
      ? Math.min(
          100,
          Math.round((allDishes.size / seasonsWithDishes) * (seasonsWithDishes / 4) * 25)
        )
      : 0

  return {
    patterns,
    dishSeasonality,
    topDishes,
    currentSeasonRecommendations: recommendations,
    menuDiversityScore: diversityScore,
    totalDishesTracked: dishSeasonMap.size,
  }
}
