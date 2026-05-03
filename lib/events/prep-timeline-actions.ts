// Prep Timeline - Reverse Schedule from Serve Time
// Generates a countdown timeline for event preparation.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export interface PrepTimelineItem {
  id: string
  event_id: string
  label: string
  minutes_before: number // minutes before serve time
  duration_minutes: number | null
  category: 'prep' | 'cook' | 'setup' | 'transport' | 'plate' | 'other'
  completed: boolean
  notes: string | null
  sort_order: number
  assigned_to: string | null
  assigned_name: string | null
}

export interface PrepTimeline {
  items: PrepTimelineItem[]
  serveTime: string | null
  eventDate: string | null
}

/**
 * Verify user has access to event (owner or accepted collaborator).
 * Returns the event's tenant_id (owner) if authorized, null otherwise.
 */
async function verifyEventAccess(db: any, eventId: string, userId: string): Promise<string | null> {
  // Check if owner
  const { data: ownedEvent } = await db
    .from('events')
    .select('tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', userId)
    .maybeSingle()

  if (ownedEvent) return ownedEvent.tenant_id

  // Check if collaborator
  const { data: collab } = await db
    .from('event_collaborators')
    .select('id, events!inner(tenant_id)')
    .eq('event_id', eventId)
    .eq('chef_id', userId)
    .eq('status', 'accepted')
    .maybeSingle()

  if (collab) return (collab as any).events?.tenant_id ?? null
  return null
}

/**
 * Get the prep timeline for an event.
 * Accessible by event owner and accepted collaborators.
 */
export async function getPrepTimeline(eventId: string): Promise<PrepTimeline> {
  const user = await requireChef()
  const db: any = createServerClient()

  const ownerTenantId = await verifyEventAccess(db, eventId, user.entityId!)
  if (!ownerTenantId) return { items: [], serveTime: null, eventDate: null }

  const { data: event } = await db
    .from('events')
    .select('serve_time, event_date')
    .eq('id', eventId)
    .single()

  const { data: items } = await db
    .from('event_prep_timeline')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', ownerTenantId)
    .order('minutes_before', { ascending: false })

  return {
    items: items || [],
    serveTime: event?.serve_time || null,
    eventDate: event?.event_date || null,
  }
}

/**
 * Add a prep timeline item.
 */
export async function addPrepTimelineItem(input: {
  eventId: string
  label: string
  minutesBefore: number
  durationMinutes?: number
  category?: PrepTimelineItem['category']
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db.from('event_prep_timeline').insert({
    event_id: input.eventId,
    tenant_id: user.entityId,
    label: input.label.trim(),
    minutes_before: input.minutesBefore,
    duration_minutes: input.durationMinutes || null,
    category: input.category || 'prep',
    completed: false,
    notes: input.notes?.trim() || null,
    sort_order: input.minutesBefore,
  })

  if (error) return { success: false, error: 'Failed to add timeline item' }

  revalidatePath(`/events/${input.eventId}`)
  return { success: true }
}

/**
 * Toggle completion of a prep timeline item.
 * Owner and collaborators can toggle items.
 */
export async function togglePrepItem(input: {
  itemId: string
  eventId: string
  completed: boolean
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const ownerTenantId = await verifyEventAccess(db, input.eventId, user.entityId!)
  if (!ownerTenantId) return { success: false, error: 'Access denied' }

  const { error } = await db
    .from('event_prep_timeline')
    .update({ completed: input.completed })
    .eq('id', input.itemId)
    .eq('tenant_id', ownerTenantId)

  if (error) return { success: false, error: 'Failed to update item' }

  revalidatePath(`/events/${input.eventId}`)
  return { success: true }
}

/**
 * Remove a prep timeline item. Only owner can remove.
 */
export async function removePrepItem(input: {
  itemId: string
  eventId: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('event_prep_timeline')
    .delete()
    .eq('id', input.itemId)
    .eq('tenant_id', user.entityId)

  if (error) return { success: false, error: 'Failed to remove item' }

  revalidatePath(`/events/${input.eventId}`)
  return { success: true }
}

/**
 * Generate a suggested prep timeline from the event's menu recipes.
 * Uses recipe prep/cook times to build a reverse schedule.
 */
export async function generatePrepTimeline(eventId: string): Promise<{
  success: boolean
  generated: number
  error?: string
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get event menus
  const { data: eventMenus } = await db
    .from('event_menus')
    .select('menu_id')
    .eq('event_id', eventId)

  let menuIds: string[] = (eventMenus || []).map((em: any) => em.menu_id)

  if (menuIds.length === 0) {
    const { data: event } = await db.from('events').select('menu_id').eq('id', eventId).single()
    if (event?.menu_id) menuIds = [event.menu_id]
  }

  if (menuIds.length === 0) {
    return { success: false, generated: 0, error: 'No menu assigned to this event' }
  }

  // Get courses and recipes
  const { data: courses } = await db
    .from('menu_courses')
    .select('recipe_id, course_type, sort_order')
    .in('menu_id', menuIds)
    .not('recipe_id', 'is', null)
    .order('sort_order', { ascending: true })

  if (!courses || courses.length === 0) {
    return { success: false, generated: 0, error: 'No recipes in menu' }
  }

  const recipeIds = [...new Set(courses.map((c: any) => c.recipe_id))]

  const { data: recipes } = await db
    .from('recipes')
    .select('id, name, prep_time_minutes, cook_time_minutes, total_time_minutes')
    .in('id', recipeIds)

  if (!recipes || recipes.length === 0) {
    return { success: false, generated: 0, error: 'No recipe data found' }
  }

  // Build timeline items based on prep + cook times
  // Stack recipes so they finish before serve time
  const items: {
    label: string
    minutes_before: number
    duration_minutes: number
    category: string
  }[] = []

  // Add setup and transport defaults
  items.push({
    label: 'Load vehicle, depart for venue',
    minutes_before: 180,
    duration_minutes: 30,
    category: 'transport',
  })
  items.push({
    label: 'Arrive, unload, set up station',
    minutes_before: 150,
    duration_minutes: 30,
    category: 'setup',
  })

  // Process each recipe
  let currentOffset = 120 // Start cooking 2 hours before
  for (const recipe of recipes) {
    const prepTime = recipe.prep_time_minutes || 20
    const cookTime = recipe.cook_time_minutes || 15
    const totalTime = recipe.total_time_minutes || prepTime + cookTime

    // Prep phase
    items.push({
      label: `Prep: ${recipe.name}`,
      minutes_before: currentOffset,
      duration_minutes: prepTime,
      category: 'prep',
    })

    // Cook phase (starts after prep)
    const cookStart = currentOffset - prepTime
    if (cookTime > 0) {
      items.push({
        label: `Cook: ${recipe.name}`,
        minutes_before: cookStart > 0 ? cookStart : 30,
        duration_minutes: cookTime,
        category: 'cook',
      })
    }

    currentOffset = Math.max(currentOffset - Math.round(totalTime * 0.6), 30)
  }

  // Final items
  items.push({
    label: 'Final plating and garnish',
    minutes_before: 15,
    duration_minutes: 15,
    category: 'plate',
  })
  items.push({
    label: 'Service begins',
    minutes_before: 0,
    duration_minutes: null as any,
    category: 'other',
  })

  // Clear existing generated items and insert new ones
  await db
    .from('event_prep_timeline')
    .delete()
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)

  const rows = items.map((item, idx) => ({
    event_id: eventId,
    tenant_id: user.entityId,
    label: item.label,
    minutes_before: item.minutes_before,
    duration_minutes: item.duration_minutes || null,
    category: item.category,
    completed: false,
    sort_order: items.length - idx,
  }))

  const { error } = await db.from('event_prep_timeline').insert(rows)
  if (error) return { success: false, generated: 0, error: 'Failed to save timeline' }

  revalidatePath(`/events/${eventId}`)
  return { success: true, generated: rows.length }
}

/**
 * Assign a prep timeline item to a specific collaborator.
 */
export async function assignPrepItem(input: {
  itemId: string
  eventId: string
  assignedTo: string | null // chef ID or null to unassign
  assignedName: string | null
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('event_prep_timeline')
    .update({
      assigned_to: input.assignedTo,
      assigned_name: input.assignedName,
    })
    .eq('id', input.itemId)
    .eq('tenant_id', user.entityId)

  if (error) return { success: false, error: 'Failed to assign item' }

  revalidatePath(`/events/${input.eventId}`)
  return { success: true }
}
