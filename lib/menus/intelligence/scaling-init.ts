// Menu Intelligence: Guest count scaling and menu initialization for events

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { UnknownAppError } from '@/lib/errors/app-error'
import { revalidateMenuIntelligenceCache } from './cache-utils'
import {
  BATCH_SPLIT_THRESHOLD,
  SMALL_BATCH_THRESHOLD,
  getSeason,
  getGuestTier,
  OCCASION_SERVICE_MAP,
  type ScalingSummary,
  type ScalingAdjustment,
} from './shared'

// ============================================
// 3. GUEST COUNT AUTO-SCALING
// ============================================

export async function scaleMenuToGuestCount(
  menuId: string,
  newGuestCount: number
): Promise<ScalingSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (newGuestCount < 1 || newGuestCount > 500) {
    throw new UnknownAppError('Guest count must be between 1 and 500')
  }

  // Get menu + current guest count
  const { data: menu } = await db
    .from('menus')
    .select('id, target_guest_count, status, event_id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!menu) throw new UnknownAppError('Menu not found')
  if (menu.status === 'locked') throw new UnknownAppError('Cannot scale a locked menu')

  const previousGuestCount = menu.target_guest_count || newGuestCount

  // Fetch all dishes and components
  const { data: dishes } = await db
    .from('dishes')
    .select('id')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)

  if (!dishes?.length) {
    // Update menu guest count even if no dishes
    await db
      .from('menus')
      .update({ target_guest_count: newGuestCount, updated_by: user.id })
      .eq('id', menuId)

    revalidatePath(`/culinary/menus/${menuId}`)
    revalidateMenuIntelligenceCache(menuId)
    return {
      menuId,
      previousGuestCount,
      newGuestCount,
      componentsScaled: 0,
      previousCostPerGuest: null,
      newCostPerGuest: null,
      adjustments: [],
    }
  }

  const dishIds = dishes.map((d: any) => d.id)

  const { data: components } = await db
    .from('components')
    .select('id, name, scale_factor, recipe_id, dish_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)

  if (!components?.length) {
    await db
      .from('menus')
      .update({ target_guest_count: newGuestCount, updated_by: user.id })
      .eq('id', menuId)

    revalidatePath(`/culinary/menus/${menuId}`)
    revalidateMenuIntelligenceCache(menuId)
    return {
      menuId,
      previousGuestCount,
      newGuestCount,
      componentsScaled: 0,
      previousCostPerGuest: null,
      newCostPerGuest: null,
      adjustments: [],
    }
  }

  // Fetch recipe yield info for components with recipes
  const recipeIds = components
    .map((c: any) => c.recipe_id)
    .filter((id: string | null) => id !== null)

  const recipeYieldMap = new Map<string, number>()
  if (recipeIds.length > 0) {
    const { data: recipes } = await db
      .from('recipes')
      .select('id, yield_quantity')
      .in('id', recipeIds)

    if (recipes) {
      for (const r of recipes) {
        if (r.yield_quantity) recipeYieldMap.set(r.id, r.yield_quantity)
      }
    }
  }

  // Calculate new scale factors
  const adjustments: ScalingAdjustment[] = []
  const scaleRatio = previousGuestCount > 0 ? newGuestCount / previousGuestCount : 1

  for (const comp of components) {
    const previousScale = comp.scale_factor || 1
    let newScale: number

    if (comp.recipe_id && recipeYieldMap.has(comp.recipe_id)) {
      // Recipe has yield: scale directly from yield
      const yieldQty = recipeYieldMap.get(comp.recipe_id)!
      newScale = newGuestCount / yieldQty
    } else {
      // No yield data: use ratio-based scaling
      newScale = previousScale * scaleRatio
    }

    // Round to 2 decimal places
    newScale = Math.round(newScale * 100) / 100

    let note: string | null = null
    if (newScale > BATCH_SPLIT_THRESHOLD) {
      note = 'Consider batch splitting at this scale'
    } else if (newScale < SMALL_BATCH_THRESHOLD) {
      note = 'Small batch: adjust seasoning carefully'
    }

    if (Math.abs(newScale - previousScale) > 0.01) {
      adjustments.push({
        componentName: comp.name,
        previousScale,
        newScale,
        note,
      })

      // Update component
      await db
        .from('components')
        .update({ scale_factor: newScale })
        .eq('id', comp.id)
        .eq('tenant_id', user.tenantId!)
    }
  }

  // Update menu guest count
  await db
    .from('menus')
    .update({ target_guest_count: newGuestCount, updated_by: user.id })
    .eq('id', menuId)

  // Also update event guest count if linked
  if (menu.event_id) {
    await db
      .from('events')
      .update({ guest_count: newGuestCount, updated_by: user.id })
      .eq('id', menu.event_id)
      .eq('tenant_id', user.tenantId!)
  }

  revalidatePath(`/culinary/menus/${menuId}`)
  revalidateMenuIntelligenceCache(menuId)
  if (menu.event_id) {
    revalidatePath(`/events/${menu.event_id}`)
  }

  // Get updated cost per guest
  const { data: costData } = await db
    .from('menu_cost_summary')
    .select('cost_per_guest_cents')
    .eq('menu_id', menuId)
    .maybeSingle()

  return {
    menuId,
    previousGuestCount,
    newGuestCount,
    componentsScaled: adjustments.length,
    previousCostPerGuest: null,
    newCostPerGuest: costData?.cost_per_guest_cents ?? null,
    adjustments,
  }
}

// ============================================
// 5. MENU INITIATION FOR EVENT
// ============================================

export async function initializeMenuForEvent(eventId: string): Promise<{
  success: boolean
  menuId: string
  contextTags: {
    season: string
    guestTier: string
    serviceStyle: string | null
    clientDietary: string[]
    clientAllergies: string[]
  }
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event with client info
  const { data: event, error: eventErr } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count, service_style, client_id, menu_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventErr || !event) {
    throw new UnknownAppError('Event not found')
  }

  // Don't create duplicate menu
  if (event.menu_id) {
    throw new UnknownAppError('Event already has a menu attached')
  }

  // Fetch client dietary info
  let clientDietary: string[] = []
  let clientAllergies: string[] = []
  let clientLastName = ''

  if (event.client_id) {
    const { data: client } = await db
      .from('clients')
      .select('full_name, dietary_restrictions, allergies')
      .eq('id', event.client_id)
      .single()

    if (client) {
      // Use last word of full_name as surname for menu naming
      const parts = (client.full_name || '').split(' ')
      clientLastName = parts.length > 1 ? parts[parts.length - 1] : parts[0] || ''
      clientDietary = client.dietary_restrictions || []
      clientAllergies = client.allergies || []
    }
  }

  // Derive context
  const eventDate = event.event_date ? new Date(event.event_date) : new Date()
  const season = getSeason(eventDate)
  const guestTier = getGuestTier(event.guest_count || 4)
  const occasion = (event.occasion || '').toLowerCase()

  // Infer service style if not set
  let serviceStyle = event.service_style || null
  if (!serviceStyle && occasion) {
    serviceStyle = OCCASION_SERVICE_MAP[occasion] || null
  }

  // Build menu name
  const occasionLabel = event.occasion || 'Event'
  const menuName = clientLastName
    ? `${occasionLabel} Menu - ${clientLastName}`
    : `${occasionLabel} Menu`

  // Create the draft menu
  const { data: menu, error: menuErr } = await db
    .from('menus')
    .insert({
      tenant_id: user.tenantId!,
      name: menuName,
      service_style: serviceStyle,
      target_guest_count: event.guest_count,
      event_id: eventId,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (menuErr || !menu) {
    console.error('[initializeMenuForEvent] Error:', menuErr)
    throw new UnknownAppError('Failed to create menu for event')
  }

  // Log state transition
  await db.from('menu_state_transitions').insert({
    tenant_id: user.tenantId!,
    menu_id: menu.id,
    from_status: null,
    to_status: 'draft',
    transitioned_by: user.id,
  })

  // Link menu to event
  await db
    .from('events')
    .update({ menu_id: menu.id, updated_by: user.id })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/culinary/menus')
  revalidateMenuIntelligenceCache(menu.id)

  const contextTags = {
    season,
    guestTier,
    serviceStyle,
    clientDietary,
    clientAllergies,
  }

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'menu_initialized_for_event',
      domain: 'menu',
      entityType: 'menu',
      entityId: menu.id,
      summary: `Auto-initialized menu "${menuName}" for event`,
      context: { eventId, ...contextTags },
    })
  } catch (err) {
    console.error('[initializeMenuForEvent] Activity log failed (non-blocking):', err)
  }

  return {
    success: true,
    menuId: menu.id,
    contextTags,
  }
}
