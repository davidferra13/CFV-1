'use server'

// Menu Performance Server Actions
// Aggregates data from: menus, events, menu_items, menu_item_sales,
// dish_index, dish_feedback, dish_appearances, ledger_entries, chef_feedback
// No new tables; read-only analytics.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  MenuPerformance,
  MenuPerformanceDetail,
  MenuEventRecord,
  DishInMenuPerformance,
  MenuCostAnalysis,
  DishRanking,
  SeasonalTrend,
  PerformanceMetrics,
} from './performance-types'

// ── getMenuPerformanceOverview ────────────────────────────────────────────
// All menus with high-level performance metrics.
// times_served from dish_appearances count, revenue from ledger_entries,
// rating from chef_feedback, reuse from fork_generation/times_used.

export async function getMenuPerformanceOverview(): Promise<MenuPerformance[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Get all menus for this chef
  const { data: menus, error: menuErr } = await db
    .from('menus')
    .select('id, name, status, service_style, season, is_template, times_used, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (menuErr || !menus) {
    console.error('[menu-performance] overview menus error', menuErr)
    return []
  }

  if (menus.length === 0) return []

  const menuIds = menus.map((m: any) => m.id)

  // Get events linked to these menus (menus.event_id -> events)
  const { data: events } = await db
    .from('events')
    .select('id, event_date, guest_count, quoted_price_cents')
    .eq('tenant_id', tenantId)

  const eventMap = new Map<string, any[]>()
  for (const e of events ?? []) {
    // We will map events to menus below
    if (!eventMap.has(e.id)) eventMap.set(e.id, [])
  }

  // Get menu-to-event linkage
  const { data: menuEventLinks } = await db
    .from('menus')
    .select('id, event_id')
    .eq('tenant_id', tenantId)
    .neq('event_id', null)

  // Map: menuId -> event records
  const menuEventsMap = new Map<string, any[]>()
  for (const link of menuEventLinks ?? []) {
    if (!link.event_id) continue
    const ev = (events ?? []).find((e: any) => e.id === link.event_id)
    if (!ev) continue
    if (!menuEventsMap.has(link.id)) menuEventsMap.set(link.id, [])
    menuEventsMap.get(link.id)!.push(ev)
  }

  // Also check service_menus for restaurant-style linkage
  const { data: serviceMenuLinks } = await db
    .from('service_menus')
    .select('menu_id, service_day_id')
    .eq('chef_id', tenantId)

  for (const sm of serviceMenuLinks ?? []) {
    if (!menuEventsMap.has(sm.menu_id)) menuEventsMap.set(sm.menu_id, [])
  }

  // Get avg ratings from chef_feedback per event
  const { data: feedback } = await db
    .from('chef_feedback')
    .select('event_id, rating')
    .eq('tenant_id', tenantId)

  const eventRatingMap = new Map<string, number[]>()
  for (const fb of feedback ?? []) {
    if (!fb.event_id || fb.rating == null) continue
    if (!eventRatingMap.has(fb.event_id)) eventRatingMap.set(fb.event_id, [])
    eventRatingMap.get(fb.event_id)!.push(fb.rating)
  }

  // Get revenue from ledger_entries per event
  const { data: ledger } = await db
    .from('ledger_entries')
    .select('event_id, amount_cents, entry_type')
    .eq('tenant_id', tenantId)

  const eventRevMap = new Map<string, number>()
  for (const le of ledger ?? []) {
    if (!le.event_id) continue
    // Sum positive amounts (payments/charges)
    const curr = eventRevMap.get(le.event_id) ?? 0
    eventRevMap.set(le.event_id, curr + (le.amount_cents ?? 0))
  }

  // Get fork counts per menu (how many menus forked from each)
  const { data: forks } = await db
    .from('menus')
    .select('forked_from_id')
    .eq('tenant_id', tenantId)
    .neq('forked_from_id', null)

  const forkCountMap = new Map<string, number>()
  for (const f of forks ?? []) {
    if (!f.forked_from_id) continue
    forkCountMap.set(f.forked_from_id, (forkCountMap.get(f.forked_from_id) ?? 0) + 1)
  }

  // Get dish appearances count per menu
  const { data: appearances } = await db
    .from('dish_appearances')
    .select('menu_id')
    .eq('tenant_id', tenantId)

  const menuAppearanceCount = new Map<string, number>()
  for (const a of appearances ?? []) {
    if (!a.menu_id) continue
    menuAppearanceCount.set(a.menu_id, (menuAppearanceCount.get(a.menu_id) ?? 0) + 1)
  }

  // Get the most recent service date per menu from service_menus + service_days
  const { data: serviceDays } = await db
    .from('service_days')
    .select('id, service_date')
    .eq('chef_id', tenantId)
    .order('service_date', { ascending: false })

  const serviceDayMap = new Map<string, string>()
  for (const sd of serviceDays ?? []) {
    serviceDayMap.set(sd.id, sd.service_date)
  }

  return menus.map((menu: any) => {
    const linkedEvents = menuEventsMap.get(menu.id) ?? []
    const timesServed = linkedEvents.length || (menu.times_used ?? 0)

    // Avg revenue across events linked to this menu
    let totalRev = 0
    let revCount = 0
    for (const ev of linkedEvents) {
      const rev = eventRevMap.get(ev.id)
      if (rev != null) {
        totalRev += rev
        revCount++
      } else if (ev.quoted_price_cents) {
        totalRev += ev.quoted_price_cents
        revCount++
      }
    }
    const avgRevenueCents = revCount > 0 ? Math.round(totalRev / revCount) : 0

    // Avg rating across events
    let totalRating = 0
    let ratingCount = 0
    for (const ev of linkedEvents) {
      const ratings = eventRatingMap.get(ev.id)
      if (ratings && ratings.length > 0) {
        for (const r of ratings) {
          totalRating += r
          ratingCount++
        }
      }
    }
    const avgRating = ratingCount > 0 ? Math.round((totalRating / ratingCount) * 10) / 10 : null

    // Reuse count = fork count + times_used
    const reuseCount = (forkCountMap.get(menu.id) ?? 0) + (menu.times_used ?? 0)

    // Last served: either from events or service days
    let lastServedAt: string | null = null
    if (linkedEvents.length > 0) {
      const dates = linkedEvents
        .map((e: any) => e.event_date)
        .filter(Boolean)
        .sort()
        .reverse()
      lastServedAt = dates[0] ?? null
    }

    return {
      menuId: menu.id,
      menuName: menu.name,
      status: menu.status,
      serviceStyle: menu.service_style ?? null,
      season: menu.season ?? null,
      isTemplate: menu.is_template ?? false,
      timesServed,
      avgRevenueCents,
      avgRating,
      reuseCount,
      lastServedAt,
      createdAt: menu.created_at,
    } satisfies MenuPerformance
  })
}

// ── getMenuPerformanceDetail ──────────────────────────────────────────────
// Deep dive on a single menu: events served, revenue per event, guest
// feedback, fork count, cost analysis.

export async function getMenuPerformanceDetail(
  menuId: string
): Promise<MenuPerformanceDetail | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Get the menu
  const { data: menuData, error: menuErr } = await db
    .from('menus')
    .select('id, name, description, status, service_style, season, is_template, event_id')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  if (menuErr || !menuData) return null

  // Fork count: how many menus forked from this one
  const { data: forkedMenus } = await db
    .from('menus')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('forked_from_id', menuId)

  const forkCount = forkedMenus?.length ?? 0

  // Get events where this menu was used
  // Direct link: menus with this id that have event_id
  // Also: other menus that share the same event
  const eventIds: string[] = []
  if (menuData.event_id) {
    eventIds.push(menuData.event_id)
  }

  // Check service_menus linkage
  const { data: serviceLinks } = await db
    .from('service_menus')
    .select('service_day_id')
    .eq('chef_id', tenantId)
    .eq('menu_id', menuId)

  // Get events for direct linkage
  const { data: linkedEvents } =
    eventIds.length > 0
      ? await db
          .from('events')
          .select('id, event_date, guest_count, quoted_price_cents, client_id')
          .in('id', eventIds)
          .eq('tenant_id', tenantId)
          .order('event_date', { ascending: false })
      : { data: [] }

  // Get all menus that share same event_id (for menus used across multiple events)
  const { data: otherMenusWithEvents } = await db
    .from('menus')
    .select('event_id')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)

  // Also find events via dish_appearances
  const { data: dishAppearanceEvents } = await db
    .from('dish_appearances')
    .select('event_id, event_date')
    .eq('tenant_id', tenantId)
    .eq('menu_id', menuId)

  const additionalEventIds = (dishAppearanceEvents ?? [])
    .map((da: any) => da.event_id)
    .filter((id: string | null) => id && !eventIds.includes(id))

  let additionalEvents: any[] = []
  if (additionalEventIds.length > 0) {
    const { data: moreEvents } = await db
      .from('events')
      .select('id, event_date, guest_count, quoted_price_cents, client_id')
      .in('id', additionalEventIds)
      .eq('tenant_id', tenantId)

    additionalEvents = moreEvents ?? []
  }

  const allEvents = [...(linkedEvents ?? []), ...additionalEvents]

  // Get client names for these events
  const clientIds = [...new Set(allEvents.map((e: any) => e.client_id).filter(Boolean))]
  let clientNameMap = new Map<string, string>()
  if (clientIds.length > 0) {
    const { data: clients } = await db.from('clients').select('id, full_name').in('id', clientIds)

    for (const c of clients ?? []) {
      clientNameMap.set(c.id, c.full_name)
    }
  }

  // Get feedback per event
  const allEventIds = allEvents.map((e: any) => e.id)
  let feedbackMap = new Map<string, { rating: number | null; text: string | null }>()
  if (allEventIds.length > 0) {
    const { data: feedback } = await db
      .from('chef_feedback')
      .select('event_id, rating, feedback_text')
      .eq('tenant_id', tenantId)
      .in('event_id', allEventIds)

    for (const fb of feedback ?? []) {
      if (!fb.event_id) continue
      feedbackMap.set(fb.event_id, {
        rating: fb.rating ?? null,
        text: fb.feedback_text ?? null,
      })
    }
  }

  // Get revenue per event from ledger_entries
  let eventRevMap = new Map<string, number>()
  if (allEventIds.length > 0) {
    const { data: ledger } = await db
      .from('ledger_entries')
      .select('event_id, amount_cents')
      .eq('tenant_id', tenantId)
      .in('event_id', allEventIds)

    for (const le of ledger ?? []) {
      if (!le.event_id) continue
      eventRevMap.set(le.event_id, (eventRevMap.get(le.event_id) ?? 0) + (le.amount_cents ?? 0))
    }
  }

  const events: MenuEventRecord[] = allEvents.map((ev: any) => {
    const fb = feedbackMap.get(ev.id)
    const rev = eventRevMap.get(ev.id) ?? ev.quoted_price_cents ?? 0
    return {
      eventId: ev.id,
      eventDate: ev.event_date,
      clientName: clientNameMap.get(ev.client_id) ?? null,
      guestCount: ev.guest_count ?? 0,
      revenueCents: rev,
      feedbackRating: fb?.rating ?? null,
      feedbackText: fb?.text ?? null,
    }
  })

  // Dish performance from menu_item_performance view
  // Get menu_items for this menu, then look up their performance
  const { data: menuItems } = await db
    .from('menu_items')
    .select('id, name, category')
    .eq('menu_id', menuId)
    .eq('chef_id', tenantId)

  let dishPerformance: DishInMenuPerformance[] = []
  if (menuItems && menuItems.length > 0) {
    const itemIds = menuItems.map((mi: any) => mi.id)
    const { data: perfData } = await db
      .from('menu_item_performance')
      .select(
        'menu_item_id, item_name, category, total_sold, total_revenue_cents, food_cost_pct, profit_per_unit_cents'
      )
      .eq('chef_id', tenantId)
      .in('menu_item_id', itemIds)

    dishPerformance = (perfData ?? []).map((p: any) => ({
      dishName: p.item_name,
      category: p.category ?? null,
      timesSold: Number(p.total_sold) || 0,
      totalRevenueCents: Number(p.total_revenue_cents) || 0,
      foodCostPct: p.food_cost_pct != null ? Number(p.food_cost_pct) : null,
      profitPerUnitCents: p.profit_per_unit_cents != null ? Number(p.profit_per_unit_cents) : null,
    }))
  }

  // Cost analysis from events and service days
  let costAnalysis: MenuCostAnalysis | null = null
  if (events.length > 0) {
    const totalRevenueCents = events.reduce((sum, e) => sum + e.revenueCents, 0)
    const totalGuests = events.reduce((sum, e) => sum + e.guestCount, 0)

    // Get food cost from service day data if available
    let totalFoodCostCents = 0
    if (serviceLinks && serviceLinks.length > 0) {
      const sdIds = serviceLinks.map((sl: any) => sl.service_day_id)
      const { data: sdData } = await db
        .from('service_days')
        .select('total_food_cost_cents')
        .in('id', sdIds)
        .eq('chef_id', tenantId)

      totalFoodCostCents = (sdData ?? []).reduce(
        (sum: number, sd: any) => sum + (sd.total_food_cost_cents ?? 0),
        0
      )
    }

    // Fallback: sum from menu item performance
    if (totalFoodCostCents === 0 && dishPerformance.length > 0) {
      const totalDishRev = dishPerformance.reduce((s, d) => s + d.totalRevenueCents, 0)
      const avgFoodPct = dishPerformance
        .filter((d) => d.foodCostPct != null)
        .reduce((s, d) => s + d.foodCostPct!, 0)
      const pctCount = dishPerformance.filter((d) => d.foodCostPct != null).length
      if (pctCount > 0 && totalDishRev > 0) {
        const avgPct = avgFoodPct / pctCount
        totalFoodCostCents = Math.round((totalRevenueCents * avgPct) / 100)
      }
    }

    const foodCostPct =
      totalRevenueCents > 0 ? Math.round((totalFoodCostCents / totalRevenueCents) * 1000) / 10 : 0

    costAnalysis = {
      totalRevenueCents,
      totalFoodCostCents,
      foodCostPct,
      avgRevenuePerEventCents: Math.round(totalRevenueCents / events.length),
      avgRevenuePerGuestCents: totalGuests > 0 ? Math.round(totalRevenueCents / totalGuests) : 0,
      eventCount: events.length,
      totalGuests,
    }
  }

  return {
    menuId: menuData.id,
    menuName: menuData.name,
    description: menuData.description ?? null,
    status: menuData.status,
    serviceStyle: menuData.service_style ?? null,
    season: menuData.season ?? null,
    isTemplate: menuData.is_template ?? false,
    forkCount,
    events,
    dishPerformance,
    costAnalysis,
  }
}

// ── getTopMenus ───────────────────────────────────────────────────────────
// Best performing menus ranked by composite score.
// Score = (times_served * 2) + (avg_rating * 10) + (reuse_count * 3) + revenue_factor

export async function getTopMenus(limit: number = 10): Promise<MenuPerformance[]> {
  const all = await getMenuPerformanceOverview()

  // Compute composite score for ranking
  const maxRev = Math.max(...all.map((m) => m.avgRevenueCents), 1)

  const scored = all.map((menu) => {
    const revFactor = maxRev > 0 ? (menu.avgRevenueCents / maxRev) * 20 : 0
    const score =
      menu.timesServed * 2 + (menu.avgRating ?? 0) * 10 + menu.reuseCount * 3 + revFactor
    return { ...menu, _score: score }
  })

  scored.sort((a, b) => b._score - a._score)

  return scored.slice(0, limit).map(({ _score, ...rest }) => rest)
}

// ── getMenuSeasonalPerformance ────────────────────────────────────────────
// Which seasons a given menu performs best in, based on events.

export async function getMenuSeasonalPerformance(menuId: string): Promise<SeasonalTrend[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Verify menu ownership
  const { data: menu } = await db
    .from('menus')
    .select('id, event_id')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  if (!menu) return []

  // Get all events linked to this menu
  const eventIds: string[] = []
  if (menu.event_id) eventIds.push(menu.event_id)

  // Also via dish_appearances
  const { data: appearanceEvents } = await db
    .from('dish_appearances')
    .select('event_id')
    .eq('tenant_id', tenantId)
    .eq('menu_id', menuId)

  for (const ae of appearanceEvents ?? []) {
    if (ae.event_id && !eventIds.includes(ae.event_id)) {
      eventIds.push(ae.event_id)
    }
  }

  if (eventIds.length === 0) return []

  const { data: events } = await db
    .from('events')
    .select('id, event_date, guest_count, quoted_price_cents')
    .in('id', eventIds)
    .eq('tenant_id', tenantId)

  if (!events || events.length === 0) return []

  // Get feedback ratings
  const { data: feedback } = await db
    .from('chef_feedback')
    .select('event_id, rating')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  const eventRatingMap = new Map<string, number[]>()
  for (const fb of feedback ?? []) {
    if (!fb.event_id || fb.rating == null) continue
    if (!eventRatingMap.has(fb.event_id)) eventRatingMap.set(fb.event_id, [])
    eventRatingMap.get(fb.event_id)!.push(fb.rating)
  }

  // Get revenue
  const { data: ledger } = await db
    .from('ledger_entries')
    .select('event_id, amount_cents')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  const eventRevMap = new Map<string, number>()
  for (const le of ledger ?? []) {
    if (!le.event_id) continue
    eventRevMap.set(le.event_id, (eventRevMap.get(le.event_id) ?? 0) + (le.amount_cents ?? 0))
  }

  // Group by season
  const seasonBuckets = new Map<
    string,
    {
      events: any[]
      totalRev: number
      ratings: number[]
      totalGuests: number
    }
  >()

  for (const ev of events) {
    const season = dateSeason(ev.event_date)
    if (!seasonBuckets.has(season)) {
      seasonBuckets.set(season, { events: [], totalRev: 0, ratings: [], totalGuests: 0 })
    }
    const bucket = seasonBuckets.get(season)!
    bucket.events.push(ev)
    bucket.totalRev += eventRevMap.get(ev.id) ?? ev.quoted_price_cents ?? 0
    bucket.totalGuests += ev.guest_count ?? 0

    const ratings = eventRatingMap.get(ev.id)
    if (ratings) bucket.ratings.push(...ratings)
  }

  const results: SeasonalTrend[] = []
  for (const [season, bucket] of seasonBuckets) {
    const avgRating =
      bucket.ratings.length > 0
        ? Math.round((bucket.ratings.reduce((s, r) => s + r, 0) / bucket.ratings.length) * 10) / 10
        : null

    results.push({
      season,
      eventCount: bucket.events.length,
      totalRevenueCents: bucket.totalRev,
      avgRevenueCents:
        bucket.events.length > 0 ? Math.round(bucket.totalRev / bucket.events.length) : 0,
      avgRating,
      avgGuestCount:
        bucket.events.length > 0 ? Math.round(bucket.totalGuests / bucket.events.length) : 0,
    })
  }

  // Sort by event count descending
  results.sort((a, b) => b.eventCount - a.eventCount)
  return results
}

// ── getDishPerformanceRanking ─────────────────────────────────────────────
// Individual dish popularity and rating from the dish_index catalog.

export async function getDishPerformanceRanking(): Promise<DishRanking[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: dishes, error } = await db
    .from('dish_index')
    .select(
      'id, name, course, times_served, is_signature, rotation_status, last_served, season_affinity'
    )
    .eq('tenant_id', tenantId)
    .eq('archived', false)
    .order('times_served', { ascending: false })

  if (error || !dishes) {
    console.error('[menu-performance] dish ranking error', error)
    return []
  }

  if (dishes.length === 0) return []

  const dishIds = dishes.map((d: any) => d.id)

  // Get feedback counts and avg ratings
  const { data: feedback } = await db
    .from('dish_feedback')
    .select('dish_id, rating')
    .eq('tenant_id', tenantId)
    .in('dish_id', dishIds)

  const feedbackMap = new Map<string, { ratings: number[]; count: number }>()
  for (const fb of feedback ?? []) {
    if (!feedbackMap.has(fb.dish_id)) feedbackMap.set(fb.dish_id, { ratings: [], count: 0 })
    const entry = feedbackMap.get(fb.dish_id)!
    entry.count++
    if (fb.rating != null) entry.ratings.push(fb.rating)
  }

  return dishes.map((dish: any) => {
    const fb = feedbackMap.get(dish.id)
    const avgRating =
      fb && fb.ratings.length > 0
        ? Math.round(
            (fb.ratings.reduce((s: number, r: number) => s + r, 0) / fb.ratings.length) * 10
          ) / 10
        : null

    return {
      dishId: dish.id,
      dishName: dish.name,
      course: dish.course,
      timesServed: dish.times_served ?? 0,
      avgRating,
      feedbackCount: fb?.count ?? 0,
      isSignature: dish.is_signature ?? false,
      rotationStatus: dish.rotation_status ?? 'active',
      lastServed: dish.last_served ?? null,
      seasonAffinity: dish.season_affinity ?? [],
    } satisfies DishRanking
  })
}

// ── getMenuRetirementCandidates ───────────────────────────────────────────
// Menus not used in 6+ months. Uses event dates and service day dates.

export async function getMenuRetirementCandidates(): Promise<MenuPerformance[]> {
  const all = await getMenuPerformanceOverview()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const cutoff = sixMonthsAgo.toISOString().split('T')[0]

  return all.filter((menu) => {
    // Templates are not retirement candidates
    if (menu.isTemplate) return false
    // Never served = candidate
    if (!menu.lastServedAt) return true
    // Last served before cutoff = candidate
    return menu.lastServedAt < cutoff
  })
}

// ── Helper: date to season ────────────────────────────────────────────────

function dateSeason(dateStr: string): string {
  const month = new Date(dateStr).getMonth() + 1 // 1-12
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'fall'
  return 'winter'
}
