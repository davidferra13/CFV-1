// Menu Muse — Server Actions
// Surfaces the chef's own data to break through menu writer's block.
// Zero AI generation. Everything is truth — recipes, seasons, heroes, ideas.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getSeasonalProduceGrouped } from '@/lib/calendar/seasonal-produce'
import type { SeasonalPalette, MicroWindow, ProvenWin } from '@/lib/seasonal/types'
import {
  getCurrentSeason,
  getActiveMicroWindows,
  getEndingMicroWindows,
} from '@/lib/seasonal/helpers'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MuseRecipe = {
  id: string
  name: string
  category: string
  dietary_tags: string[]
  times_cooked: number
  last_cooked_at: string | null
  created_at: string
}

export type MuseFavoriteChef = {
  chef_name: string
  reason: string | null
  website_url: string | null
}

export type MuseMenu = {
  id: string
  name: string
  cuisine_type: string | null
  service_style: string | null
  is_template: boolean
  created_at: string
  course_count: number
  courses: string[]
}

export type MuseJourneyIdea = {
  id: string
  title: string
  concept_notes: string | null
  application_area: string
  status: string
  priority: number | null
  journey_title: string | null
}

export type MuseCulinaryWord = {
  word: string
  category: string
  tier: number
}

export type MuseClientContext = {
  client_name: string
  dietary_restrictions: string[]
  allergies: string[]
  favorite_dishes: string[]
  favorite_cuisines: string[]
  dislikes: string[]
  event_occasion: string | null
  event_date: string | null
  guest_count: number | null
  special_requests: string | null
  service_style: string | null
  past_menus: MuseMenu[]
}

export type MuseSeasonalData = {
  season_label: string
  peak_produce: { name: string; category: string; note?: string }[]
  active_micro_windows: (MicroWindow & { days_remaining?: number })[]
  ending_micro_windows: (MicroWindow & { days_remaining?: number })[]
  proven_wins: ProvenWin[]
  sensory_anchor: string | null
}

export type MuseData = {
  recipes: {
    forgotten: MuseRecipe[]
    trusted: MuseRecipe[]
    byCategory: Record<string, MuseRecipe[]>
  }
  seasonal: MuseSeasonalData
  favoriteChefs: MuseFavoriteChef[]
  clientContext: MuseClientContext | null
  ideas: {
    backlog: MuseJourneyIdea[]
    testing: MuseJourneyIdea[]
    dishesToExplore: string[]
  }
  culinaryWords: MuseCulinaryWord[]
  menuPatterns: {
    templates: MuseMenu[]
    recent: MuseMenu[]
    sameSeasonLastYear: MuseMenu[]
  }
}

// ---------------------------------------------------------------------------
// Main Action
// ---------------------------------------------------------------------------

export async function getMuseData(eventId?: string): Promise<MuseData> {
  const user = await requireChef()
  const supabase = createServerClient()
  const tenantId = user.tenantId!
  const now = new Date()
  const currentMonth = now.getMonth() + 1

  // Run all queries in parallel
  const [
    recipesResult,
    favoriteChefs,
    palettes,
    journeyIdeas,
    journeyEntries,
    culinaryWords,
    menusResult,
    clientContext,
  ] = await Promise.all([
    // 1. Recipes
    supabase
      .from('recipes')
      .select('id, name, category, dietary_tags, times_cooked, last_cooked_at, created_at')
      .eq('tenant_id', tenantId)
      .eq('archived', false)
      .order('name'),

    // 2. Favorite chefs
    supabase
      .from('favorite_chefs')
      .select('chef_name, reason, website_url')
      .eq('chef_id', tenantId)
      .order('sort_order'),

    // 3. Seasonal palettes
    supabase.from('seasonal_palettes').select('*').eq('tenant_id', tenantId).order('sort_order'),

    // 4. Journey ideas
    supabase
      .from('chef_journey_ideas')
      .select(
        'id, title, concept_notes, application_area, status, priority, journey:chef_journeys(title)'
      )
      .eq('tenant_id', tenantId)
      .in('status', ['backlog', 'testing'])
      .order('priority', { ascending: false }),

    // 5. Journey entries (for dishes_to_explore)
    supabase
      .from('chef_journey_entries')
      .select('dishes_to_explore, inspiration_taken')
      .eq('tenant_id', tenantId)
      .not('dishes_to_explore', 'is', null),

    // 6. Culinary words
    supabase
      .from('chef_culinary_words')
      .select('word, category, tier')
      .eq('chef_id', tenantId)
      .order('tier', { ascending: false }),

    // 7. Menus (all for templates + recent + seasonal matching)
    supabase
      .from('menus')
      .select(
        `
        id, name, cuisine_type, service_style, is_template, created_at,
        dishes(course_name)
      `
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }),

    // 8. Client context (if eventId provided)
    eventId ? getClientContext(supabase, tenantId, eventId) : Promise.resolve(null),
  ])

  // Process recipes
  const recipes = (recipesResult.data || []) as MuseRecipe[]
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const sixMonthsAgoStr = sixMonthsAgo.toISOString()

  const forgotten = recipes
    .filter((r) => !r.last_cooked_at || r.last_cooked_at < sixMonthsAgoStr)
    .sort(() => Math.random() - 0.5)
    .slice(0, 12)

  const trusted = [...recipes].sort((a, b) => b.times_cooked - a.times_cooked).slice(0, 12)

  const byCategory: Record<string, MuseRecipe[]> = {}
  for (const r of recipes) {
    const cat = r.category || 'other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(r)
  }

  // Process seasonal data
  const curated = getSeasonalProduceGrouped(currentMonth)
  const allPeakProduce = curated.groups.flatMap((g) =>
    g.items.map((i) => ({ name: i.name, category: g.label, note: i.note }))
  )

  const paletteList = (palettes.data || []) as SeasonalPalette[]
  const activePalette = getCurrentSeason(paletteList, now)

  const activeMW = activePalette ? getActiveMicroWindows(activePalette, now) : []
  const endingMW = activePalette ? getEndingMicroWindows(activePalette, 7, now) : []
  const provenWins = activePalette?.proven_wins || []
  const sensoryAnchor = activePalette?.sensory_anchor || null

  // Add days remaining to micro-windows
  const addDaysRemaining = (mw: MicroWindow): MicroWindow & { days_remaining?: number } => {
    const [endM, endD] = mw.end_date.split('-').map(Number)
    const endDate = new Date(now.getFullYear(), endM - 1, endD)
    if (endDate < now) endDate.setFullYear(endDate.getFullYear() + 1)
    const days = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return { ...mw, days_remaining: days }
  }

  // Process journey ideas
  const ideaRows = (journeyIdeas.data || []) as Array<{
    id: string
    title: string
    concept_notes: string | null
    application_area: string
    status: string
    priority: number | null
    journey: { title: string } | null
  }>
  const backlog = ideaRows
    .filter((i) => i.status === 'backlog')
    .map((i) => ({ ...i, journey_title: i.journey?.title || null }))
  const testing = ideaRows
    .filter((i) => i.status === 'testing')
    .map((i) => ({ ...i, journey_title: i.journey?.title || null }))

  // Collect dishes to explore from journey entries
  const entryRows = (journeyEntries.data || []) as Array<{
    dishes_to_explore: string[] | null
    inspiration_taken: string[] | null
  }>
  const dishesToExplore = [...new Set(entryRows.flatMap((e) => e.dishes_to_explore || []))].slice(
    0,
    20
  )

  // Process menus
  const menuRows = (menusResult.data || []) as Array<{
    id: string
    name: string
    cuisine_type: string | null
    service_style: string | null
    is_template: boolean
    created_at: string
    dishes: { course_name: string }[] | null
  }>

  const toMuseMenu = (m: (typeof menuRows)[0]): MuseMenu => ({
    id: m.id,
    name: m.name,
    cuisine_type: m.cuisine_type,
    service_style: m.service_style,
    is_template: m.is_template || false,
    created_at: m.created_at,
    course_count: m.dishes?.length || 0,
    courses: (m.dishes || []).map((d) => d.course_name),
  })

  const templates = menuRows
    .filter((m) => m.is_template)
    .map(toMuseMenu)
    .slice(0, 10)
  const recent = menuRows.slice(0, 10).map(toMuseMenu)

  // Same season last year: menus created in the same month range, prior year
  const lastYear = now.getFullYear() - 1
  const monthStart = new Date(lastYear, now.getMonth(), 1).toISOString()
  const monthEnd = new Date(lastYear, now.getMonth() + 1, 0).toISOString()
  const sameSeasonLastYear = menuRows
    .filter((m) => m.created_at >= monthStart && m.created_at <= monthEnd)
    .map(toMuseMenu)

  return {
    recipes: { forgotten, trusted, byCategory },
    seasonal: {
      season_label: curated.seasonLabel,
      peak_produce: allPeakProduce,
      active_micro_windows: activeMW.map(addDaysRemaining),
      ending_micro_windows: endingMW.map(addDaysRemaining),
      proven_wins: provenWins,
      sensory_anchor: sensoryAnchor,
    },
    favoriteChefs: (favoriteChefs.data || []) as MuseFavoriteChef[],
    clientContext,
    ideas: { backlog, testing, dishesToExplore },
    culinaryWords: (culinaryWords.data || []) as MuseCulinaryWord[],
    menuPatterns: { templates, recent, sameSeasonLastYear },
  }
}

// ---------------------------------------------------------------------------
// Client context loader (when launched from an event)
// ---------------------------------------------------------------------------

async function getClientContext(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  eventId: string
): Promise<MuseClientContext | null> {
  const { data: event } = await supabase
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, special_requests, service_style,
      client:clients(
        id, full_name, dietary_restrictions, allergies,
        favorite_dishes, favorite_cuisines, dislikes
      )
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event?.client) return null

  const client = event.client as {
    id: string
    full_name: string
    dietary_restrictions: string[] | null
    allergies: string[] | null
    favorite_dishes: string[] | null
    favorite_cuisines: string[] | null
    dislikes: string[] | null
  }

  // Get past menus for this client
  const { data: pastMenuData } = await supabase
    .from('menus')
    .select(
      `
      id, name, cuisine_type, service_style, is_template, created_at,
      dishes(course_name),
      event:events!inner(client_id)
    `
    )
    .eq('tenant_id', tenantId)
    .eq('events.client_id', client.id)
    .neq('id', eventId)
    .order('created_at', { ascending: false })
    .limit(10)

  const pastMenus = (pastMenuData || []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    name: m.name as string,
    cuisine_type: m.cuisine_type as string | null,
    service_style: m.service_style as string | null,
    is_template: (m.is_template as boolean) || false,
    created_at: m.created_at as string,
    course_count: ((m.dishes as { course_name: string }[]) || []).length,
    courses: ((m.dishes as { course_name: string }[]) || []).map((d) => d.course_name),
  }))

  return {
    client_name: client.full_name,
    dietary_restrictions: client.dietary_restrictions || [],
    allergies: client.allergies || [],
    favorite_dishes: client.favorite_dishes || [],
    favorite_cuisines: client.favorite_cuisines || [],
    dislikes: client.dislikes || [],
    event_occasion: event.occasion,
    event_date: event.event_date,
    guest_count: event.guest_count,
    special_requests: event.special_requests,
    service_style: event.service_style,
    past_menus: pastMenus,
  }
}
