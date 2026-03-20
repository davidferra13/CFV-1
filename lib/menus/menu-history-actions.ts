'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// -- Types --

type DishEntry = {
  name: string
  category?: string
  liked?: boolean
  disliked?: boolean
  notes?: string
}

type MenuHistoryEntry = {
  id: string
  chef_id: string
  client_id: string
  event_id: string | null
  menu_id: string | null
  served_date: string
  dishes_served: DishEntry[]
  overall_rating: number | null
  client_feedback: string | null
  chef_notes: string | null
  guest_count: number | null
  created_at: string
}

type AddMenuHistoryInput = {
  client_id: string
  event_id?: string | null
  menu_id?: string | null
  served_date: string
  dishes_served: DishEntry[]
  overall_rating?: number | null
  client_feedback?: string | null
  chef_notes?: string | null
  guest_count?: number | null
}

type FeedbackInput = {
  overall_rating?: number | null
  client_feedback?: string | null
  chef_notes?: string | null
  dishes_served?: DishEntry[]
}

// -- Actions --

/**
 * Get all menu history entries for a specific client, ordered by date desc.
 */
export async function getClientMenuHistory(
  clientId: string
): Promise<{ data: MenuHistoryEntry[]; error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('menu_service_history')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('client_id', clientId)
    .order('served_date', { ascending: false })

  if (error) {
    console.error('[getClientMenuHistory]', error)
    return { data: [], error: 'Failed to load menu history' }
  }

  return { data: (data ?? []) as MenuHistoryEntry[], error: null }
}

/**
 * Manually log a menu service entry.
 */
export async function addMenuHistoryEntry(
  input: AddMenuHistoryInput
): Promise<{ data: MenuHistoryEntry | null; error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('menu_service_history')
    .insert({
      chef_id: user.tenantId!,
      client_id: input.client_id,
      event_id: input.event_id ?? null,
      menu_id: input.menu_id ?? null,
      served_date: input.served_date,
      dishes_served: input.dishes_served,
      overall_rating: input.overall_rating ?? null,
      client_feedback: input.client_feedback ?? null,
      chef_notes: input.chef_notes ?? null,
      guest_count: input.guest_count ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[addMenuHistoryEntry]', error)
    return { data: null, error: 'Failed to add menu history entry' }
  }

  return { data: data as MenuHistoryEntry, error: null }
}

/**
 * Automatically log menu history from a completed event.
 * Pulls event date, client, guest count, and menu items from the event + assigned menu.
 */
export async function autoLogMenuFromEvent(
  eventId: string
): Promise<{ data: MenuHistoryEntry | null; error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch event with client info
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, client_id, event_date, guest_count, status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    console.error('[autoLogMenuFromEvent] Event fetch error:', eventError)
    return { data: null, error: 'Event not found' }
  }

  // Check if already logged for this event
  const { data: existing } = await supabase
    .from('menu_service_history')
    .select('id')
    .eq('chef_id', user.tenantId!)
    .eq('event_id', eventId)
    .limit(1)

  if (existing && existing.length > 0) {
    return { data: null, error: 'Menu history already logged for this event' }
  }

  // Fetch menu items if a menu is assigned
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('name, category')
    .eq('event_id', eventId)

  const dishes: DishEntry[] = (menuItems ?? []).map((item: any) => ({
    name: item.name,
    category: item.category ?? undefined,
  }))

  // Create the history entry
  const { data, error } = await supabase
    .from('menu_service_history')
    .insert({
      chef_id: user.tenantId!,
      client_id: event.client_id,
      event_id: eventId,
      served_date: event.event_date,
      dishes_served: dishes,
      guest_count: event.guest_count ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[autoLogMenuFromEvent]', error)
    return { data: null, error: 'Failed to auto-log menu history' }
  }

  return { data: data as MenuHistoryEntry, error: null }
}

/**
 * Update feedback/rating on an existing menu history entry.
 */
export async function updateMenuFeedback(
  historyId: string,
  feedback: FeedbackInput
): Promise<{ success: boolean; error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updateFields: Record<string, unknown> = {}
  if (feedback.overall_rating !== undefined) updateFields.overall_rating = feedback.overall_rating
  if (feedback.client_feedback !== undefined)
    updateFields.client_feedback = feedback.client_feedback
  if (feedback.chef_notes !== undefined) updateFields.chef_notes = feedback.chef_notes
  if (feedback.dishes_served !== undefined) updateFields.dishes_served = feedback.dishes_served

  if (Object.keys(updateFields).length === 0) {
    return { success: false, error: 'No fields to update' }
  }

  const { error } = await supabase
    .from('menu_service_history')
    .update(updateFields)
    .eq('id', historyId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[updateMenuFeedback]', error)
    return { success: false, error: 'Failed to update feedback' }
  }

  return { success: true, error: null }
}

/**
 * Get dish frequency for a specific client (how many times each dish was served).
 * Pure math/query, no AI.
 */
export async function getDishFrequency(
  clientId: string
): Promise<{ data: { name: string; count: number; lastServed: string }[]; error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: entries, error } = await supabase
    .from('menu_service_history')
    .select('dishes_served, served_date')
    .eq('chef_id', user.tenantId!)
    .eq('client_id', clientId)
    .order('served_date', { ascending: false })

  if (error) {
    console.error('[getDishFrequency]', error)
    return { data: [], error: 'Failed to load dish frequency' }
  }

  // Count frequency of each dish
  const freq = new Map<string, { count: number; lastServed: string }>()

  for (const entry of entries ?? []) {
    const dishes = (entry.dishes_served as DishEntry[]) ?? []
    for (const dish of dishes) {
      const existing = freq.get(dish.name)
      if (existing) {
        existing.count++
      } else {
        freq.set(dish.name, { count: 1, lastServed: entry.served_date })
      }
    }
  }

  const result = Array.from(freq.entries())
    .map(([name, info]) => ({ name, count: info.count, lastServed: info.lastServed }))
    .sort((a, b) => b.count - a.count)

  return { data: result, error: null }
}

/**
 * Get recipes the chef has that were never served to this client.
 * Cross-references the recipes table.
 */
export async function getNeverServedDishes(
  clientId: string
): Promise<{
  data: { id: string; name: string; category: string | null }[]
  error: string | null
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get all chef's recipes
  const { data: recipes, error: recipeError } = await supabase
    .from('recipes')
    .select('id, name, category')
    .eq('tenant_id', user.tenantId!)

  if (recipeError) {
    console.error('[getNeverServedDishes] Recipes error:', recipeError)
    return { data: [], error: 'Failed to load recipes' }
  }

  // Get all dishes served to this client
  const { data: entries, error: historyError } = await supabase
    .from('menu_service_history')
    .select('dishes_served')
    .eq('chef_id', user.tenantId!)
    .eq('client_id', clientId)

  if (historyError) {
    console.error('[getNeverServedDishes] History error:', historyError)
    return { data: [], error: 'Failed to load menu history' }
  }

  // Build set of served dish names (lowercase for matching)
  const servedNames = new Set<string>()
  for (const entry of entries ?? []) {
    const dishes = (entry.dishes_served as DishEntry[]) ?? []
    for (const dish of dishes) {
      servedNames.add(dish.name.toLowerCase())
    }
  }

  // Filter recipes not in served set
  const neverServed = (recipes ?? [])
    .filter((r: any) => !servedNames.has(r.name.toLowerCase()))
    .map((r: any) => ({ id: r.id, name: r.name, category: r.category ?? null }))

  return { data: neverServed, error: null }
}

/**
 * Get aggregate menu history stats, optionally filtered to a single client.
 */
export async function getMenuHistoryStats(clientId?: string): Promise<{
  data: {
    totalEvents: number
    uniqueDishes: number
    avgRating: number | null
    mostServed: { name: string; count: number }[]
    leastServed: { name: string; count: number }[]
  }
  error: string | null
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('menu_service_history')
    .select('dishes_served, overall_rating, served_date')
    .eq('chef_id', user.tenantId!)

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data: entries, error } = await query

  if (error) {
    console.error('[getMenuHistoryStats]', error)
    return {
      data: { totalEvents: 0, uniqueDishes: 0, avgRating: null, mostServed: [], leastServed: [] },
      error: 'Failed to load stats',
    }
  }

  const rows = entries ?? []
  const totalEvents = rows.length

  // Dish frequency map
  const freq = new Map<string, number>()
  const uniqueDishNames = new Set<string>()

  for (const entry of rows) {
    const dishes = (entry.dishes_served as DishEntry[]) ?? []
    for (const dish of dishes) {
      uniqueDishNames.add(dish.name)
      freq.set(dish.name, (freq.get(dish.name) ?? 0) + 1)
    }
  }

  // Average rating (only from entries that have a rating)
  const ratings = rows.map((r: any) => r.overall_rating).filter((r: any): r is number => r !== null)
  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((a: any, b: any) => a + b, 0) / ratings.length) * 10) / 10
      : null

  // Sort for most/least served
  const sorted = Array.from(freq.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const mostServed = sorted.slice(0, 5)
  const leastServed = sorted.length > 5 ? sorted.slice(-5).reverse() : []

  return {
    data: {
      totalEvents,
      uniqueDishes: uniqueDishNames.size,
      avgRating,
      mostServed,
      leastServed,
    },
    error: null,
  }
}

/**
 * Search menu history by dish name across all clients.
 */
export async function searchMenuHistory(
  query: string
): Promise<{ data: MenuHistoryEntry[]; error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (!query.trim()) {
    return { data: [], error: null }
  }

  // Fetch all history and filter in-app (JSONB dish name search)
  const { data: entries, error } = await supabase
    .from('menu_service_history')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('served_date', { ascending: false })

  if (error) {
    console.error('[searchMenuHistory]', error)
    return { data: [], error: 'Failed to search menu history' }
  }

  const lowerQuery = query.toLowerCase()
  const filtered = (entries ?? []).filter((entry: any) => {
    const dishes = (entry.dishes_served as DishEntry[]) ?? []
    return dishes.some((d: any) => d.name.toLowerCase().includes(lowerQuery))
  })

  return { data: filtered as MenuHistoryEntry[], error: null }
}
