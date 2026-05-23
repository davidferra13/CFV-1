'use server'

// Kitchen Mode Server Actions
// Loads event data for kitchen mode and handles course status updates.
// Auth-gated, tenant-scoped.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ── Types ────────────────────────────────────────────────────────────────────

export interface KitchenCourse {
  id: string
  name: string
  category: string | null
  sortOrder: number
  status: 'pending' | 'plating' | 'served'
  servedAt: string | null
}

export interface KitchenGuest {
  name: string
  dietaryRestrictions: string[]
  allergies: string[]
  severity: 'allergy' | 'restriction' | 'preference'
}

export interface KitchenModeData {
  event: {
    id: string
    title: string | null
    occasion: string | null
    eventDate: string
    serveTime: string | null
    guestCount: number
    serviceStyle: string
    clientName: string | null
    dietaryRestrictions: string[]
    allergies: string[]
    specialRequests: string | null
    kitchenNotes: string | null
    status: string
    menuId: string | null
    serviceStartedAt: string | null
  }
  courses: KitchenCourse[]
  guests: KitchenGuest[]
}

// ── Data Loading ─────────────────────────────────────────────────────────────

export async function getKitchenModeData(
  eventId: string
): Promise<{ data: KitchenModeData | null; error: string | null }> {
  try {
    const user = await requireChef()
    const db = createServerClient({ admin: true })
    const tenantId = user.tenantId ?? user.entityId

    // Load event
    const { data: event, error: eventError } = await db
      .from('events')
      .select(
        'id, title, occasion, event_date, serve_time, guest_count, service_style, client_id, dietary_restrictions, allergies, special_requests, kitchen_notes, status, menu_id, service_started_at'
      )
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (eventError || !event) {
      return { data: null, error: eventError?.message ?? 'Event not found' }
    }

    // Load client name
    let clientName: string | null = null
    if (event.client_id) {
      const { data: client } = await db
        .from('clients')
        .select('full_name')
        .eq('id', event.client_id)
        .maybeSingle()
      clientName = client?.full_name ?? null
    }

    // Load menu items as courses
    let courses: KitchenCourse[] = []
    if (event.menu_id) {
      const { data: menuItems } = await db
        .from('menu_items')
        .select('id, name, category, sort_order, is_active')
        .eq('menu_id', event.menu_id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (menuItems && menuItems.length > 0) {
        courses = menuItems.map((item: any, idx: number) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          sortOrder: item.sort_order ?? idx,
          status: 'pending' as const,
          servedAt: null,
        }))
      }
    }

    // Build guest dietary info from event-level data
    const guests: KitchenGuest[] = []
    const eventDietary = (event.dietary_restrictions ?? []).filter(
      (d: string) => d && d.trim() !== ''
    )
    const eventAllergies = (event.allergies ?? []).filter((a: string) => a && a.trim() !== '')

    if (eventDietary.length > 0 || eventAllergies.length > 0) {
      guests.push({
        name: clientName ?? 'Guest',
        dietaryRestrictions: eventDietary,
        allergies: eventAllergies,
        severity: eventAllergies.length > 0 ? 'allergy' : 'restriction',
      })
    }

    return {
      data: {
        event: {
          id: event.id,
          title: event.title ?? event.occasion,
          occasion: event.occasion,
          eventDate: event.event_date,
          serveTime: event.serve_time,
          guestCount: event.guest_count,
          serviceStyle: event.service_style ?? 'plated',
          clientName,
          dietaryRestrictions: eventDietary,
          allergies: eventAllergies,
          specialRequests: event.special_requests,
          kitchenNotes: event.kitchen_notes,
          status: event.status,
          menuId: event.menu_id,
          serviceStartedAt: event.service_started_at,
        },
        courses,
        guests,
      },
      error: null,
    }
  } catch (err) {
    console.error('[getKitchenModeData] Error:', err)
    return { data: null, error: 'Failed to load kitchen mode data' }
  }
}

// ── Course Status Updates ────────────────────────────────────────────────────

export async function updateCourseStatus(
  eventId: string,
  courseId: string,
  newStatus: 'pending' | 'plating' | 'served'
): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId ?? user.entityId

    // Verify event ownership
    const db = createServerClient({ admin: true })
    const { data: event } = await db
      .from('events')
      .select('id, menu_id')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!event) {
      return { success: false, error: 'Event not found' }
    }

    // Log the status change for traceability
    console.log(`[updateCourseStatus] event=${eventId} course=${courseId} status=${newStatus}`)

    // Course status is managed client-side in the kitchen mode view.
    // This action validates ownership and revalidates the path.
    revalidatePath(`/events/${eventId}/kitchen-mode`)

    return { success: true, error: null }
  } catch (err) {
    console.error('[updateCourseStatus] Error:', err)
    return { success: false, error: 'Failed to update course status' }
  }
}
