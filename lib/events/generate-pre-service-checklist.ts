// Pre-Service Checklist Generator (Phase 4)
// Auto-generates a checklist from event data: menu, dietary, guests, equipment, staff.
// 100% deterministic (Formula > AI). No Ollama calls.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type ChecklistItem = {
  id: string // deterministic ID based on source
  category: 'safety' | 'prep' | 'equipment' | 'venue' | 'staff' | 'service' | 'custom'
  title: string
  detail: string | null
  completed: boolean
  source: 'auto' | 'manual'
  priority: 'critical' | 'high' | 'normal'
}

export type PreServiceChecklist = {
  event_id: string
  event_title: string
  event_date: string
  start_time: string | null
  client_name: string | null
  items: ChecklistItem[]
}

/**
 * Generate a pre-service checklist for an event.
 * Safety items (allergies, dietary) always come first.
 */
export async function generatePreServiceChecklist(eventId: string): Promise<PreServiceChecklist> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch event with all related data
  const { data: event, error: eventError } = await db
    .from('events')
    .select(
      'id, occasion, event_date, serve_time, guest_count, location_address, location_city, location_state, dietary_restrictions, allergies, notes, status, client_id'
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  // Get menu dishes via event_menus -> dishes chain
  const { data: eventMenuLinks } = await (db
    .from('event_menus' as any)
    .select('menu_id')
    .eq('event_id', eventId) as any)
  const checklistMenuIds = ((eventMenuLinks ?? []) as Array<{ menu_id: string }>).map(
    (em) => em.menu_id
  )
  const menuDishData =
    checklistMenuIds.length > 0
      ? await (db
          .from('dishes' as any)
          .select('id, name, course_name')
          .eq('tenant_id', tenantId)
          .in('menu_id', checklistMenuIds)
          .not('name', 'is', null)
          .order('course_number', { ascending: true }) as any)
      : { data: [] }

  // Fetch related data in parallel
  const [clientResult, staffResult] = await Promise.all([
    // Client info (for dietary/allergy data)
    event.client_id
      ? db
          .from('clients')
          .select('id, full_name, dietary_restrictions, allergies')
          .eq('id', event.client_id)
          .single()
      : Promise.resolve({ data: null }),
    // Staff assigned
    db
      .from('event_staff_assignments' as any)
      .select('id, staff_member:staff_members(id, name, role), role_override')
      .eq('event_id', eventId)
      .then((r: any) => r)
      .catch(() => ({ data: [] })),
  ])

  const client = clientResult.data
  const menuItems = (menuDishData.data ?? []) as Array<{
    id: string
    name: string
    course_name: string | null
  }>
  const staffAssigned = staffResult.data ?? []

  const items: ChecklistItem[] = []

  // ============================================
  // SAFETY ITEMS (CRITICAL - always first)
  // ============================================

  // Dietary restrictions from client
  const clientDietary = Array.isArray(client?.dietary_restrictions)
    ? client.dietary_restrictions.filter(Boolean)
    : []
  if (clientDietary.length > 0) {
    items.push({
      id: `safety-dietary-${eventId}`,
      category: 'safety',
      title: 'Verify dietary restrictions are accommodated',
      detail: `Restrictions: ${clientDietary.join(', ')}`,
      completed: false,
      source: 'auto',
      priority: 'critical',
    })
  }

  // Allergies from client
  const clientAllergies = Array.isArray(client?.allergies) ? client.allergies.filter(Boolean) : []
  if (clientAllergies.length > 0) {
    items.push({
      id: `safety-allergy-${eventId}`,
      category: 'safety',
      title: 'Confirm allergy-safe preparation',
      detail: `Allergies: ${clientAllergies.join(', ')}. Cross-contamination check required.`,
      completed: false,
      source: 'auto',
      priority: 'critical',
    })
  }

  // Dietary restrictions from event itself
  const eventDietary = Array.isArray(event.dietary_restrictions)
    ? event.dietary_restrictions.filter(Boolean)
    : []
  const eventAllergies = Array.isArray(event.allergies) ? event.allergies.filter(Boolean) : []
  if (eventDietary.length > 0 || eventAllergies.length > 0) {
    const parts = [
      eventDietary.length > 0 ? `Dietary: ${eventDietary.join(', ')}` : null,
      eventAllergies.length > 0 ? `Allergies: ${eventAllergies.join(', ')}` : null,
    ].filter(Boolean)
    items.push({
      id: `safety-event-dietary-${eventId}`,
      category: 'safety',
      title: 'Review event dietary and allergy notes',
      detail: parts.join(' | '),
      completed: false,
      source: 'auto',
      priority: 'critical',
    })
  }

  // Guest count verification
  if (event.guest_count) {
    items.push({
      id: `safety-headcount-${eventId}`,
      category: 'safety',
      title: `Confirm final headcount: ${event.guest_count} guests`,
      detail: 'Verify with client if count has changed',
      completed: false,
      source: 'auto',
      priority: 'high',
    })
  }

  // ============================================
  // PREP ITEMS
  // ============================================

  for (const dish of menuItems) {
    items.push({
      id: `prep-menu-${dish.id}`,
      category: 'prep',
      title: `Prep: ${dish.name}`,
      detail:
        event.guest_count > 0
          ? `${event.guest_count} servings${dish.course_name ? ` (${dish.course_name})` : ''}`
          : (dish.course_name ?? null),
      completed: false,
      source: 'auto',
      priority: 'high',
    })
  }

  // If no menu items but there's an event, add generic prep reminder
  if (menuItems.length === 0) {
    items.push({
      id: `prep-general-${eventId}`,
      category: 'prep',
      title: 'Complete all prep for this event',
      detail: event.guest_count ? `${event.guest_count} guests` : null,
      completed: false,
      source: 'auto',
      priority: 'high',
    })
  }

  // ============================================
  // VENUE ITEMS
  // ============================================

  if (event.location_address) {
    const fullAddress = [event.location_address, event.location_city, event.location_state]
      .filter(Boolean)
      .join(', ')
    items.push({
      id: `venue-access-${eventId}`,
      category: 'venue',
      title: `Confirm venue access`,
      detail: fullAddress,
      completed: false,
      source: 'auto',
      priority: 'high',
    })
  }

  if (event.serve_time) {
    // Suggest arrival 1-2 hours before
    items.push({
      id: `venue-arrival-${eventId}`,
      category: 'venue',
      title: `Plan arrival time (service starts at ${formatTime(event.serve_time)})`,
      detail: 'Arrive at least 1-2 hours before service for setup',
      completed: false,
      source: 'auto',
      priority: 'normal',
    })
  }

  // ============================================
  // STAFF ITEMS
  // ============================================

  if (staffAssigned.length > 0) {
    items.push({
      id: `staff-confirm-${eventId}`,
      category: 'staff',
      title: `Confirm ${staffAssigned.length} staff member${staffAssigned.length !== 1 ? 's' : ''} for today`,
      detail: staffAssigned
        .map((s: any) => {
          const name = s.staff_member?.name ?? 'Unknown'
          const role = s.role_override ?? s.staff_member?.role ?? ''
          return `${name} (${role})`
        })
        .join(', '),
      completed: false,
      source: 'auto',
      priority: 'high',
    })
  }

  // ============================================
  // SERVICE ITEMS
  // ============================================

  items.push({
    id: `service-plating-${eventId}`,
    category: 'service',
    title: 'Review plating and presentation plan',
    detail: null,
    completed: false,
    source: 'auto',
    priority: 'normal',
  })

  items.push({
    id: `service-timeline-${eventId}`,
    category: 'service',
    title: 'Confirm service timeline and courses',
    detail: null,
    completed: false,
    source: 'auto',
    priority: 'normal',
  })

  return {
    event_id: event.id,
    event_title: event.occasion ?? 'Event',
    event_date: event.event_date,
    start_time: event.serve_time ?? null,
    client_name: client?.full_name ?? null,
    items,
  }
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}
