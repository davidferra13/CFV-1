// Pre-Service Checklist Generator (Phase 4)
// Auto-generates a checklist from event data: menu, dietary, guests, equipment, staff.
// 100% deterministic (Formula > AI). No Ollama calls.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

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
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch event with all related data
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(
      'id, title, event_date, start_time, end_time, guest_count, venue, venue_address, dietary_notes, notes, status, client_id'
    )
    .eq('id', eventId)
    .eq('chef_id', tenantId)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  // Fetch related data in parallel
  const [clientResult, menuResult, staffResult, customItemsResult] = await Promise.all([
    // Client info (for dietary/allergy data)
    event.client_id
      ? supabase
          .from('clients')
          .select('id, name, dietary_restrictions, allergies, notes')
          .eq('id', event.client_id)
          .single()
      : Promise.resolve({ data: null }),
    // Menu items for this event
    supabase
      .from('event_menu_items')
      .select('id, menu_item:menu_items(id, name), servings, notes')
      .eq('event_id', eventId)
      .then((r: any) => r)
      .catch((err: any) => {
        console.error('[PreServiceChecklist] Failed to load menu items:', err)
        return { data: [], _loadFailed: true }
      }),
    // Staff assigned
    supabase
      .from('event_staff')
      .select('id, staff_member:staff_members(id, name, role), role_override')
      .eq('event_id', eventId)
      .then((r: any) => r)
      .catch((err: any) => {
        console.error('[PreServiceChecklist] Failed to load staff:', err)
        return { data: [], _loadFailed: true }
      }),
    // Custom checklist items (stored in event's unknown_fields or a separate store)
    Promise.resolve({ data: [] }),
  ])

  const client = clientResult.data
  const menuItems = menuResult.data ?? []
  const staffAssigned = staffResult.data ?? []
  const menuLoadFailed = !!(menuResult as any)._loadFailed
  const staffLoadFailed = !!(staffResult as any)._loadFailed

  const items: ChecklistItem[] = []

  // ============================================
  // DATA LOAD WARNINGS (show chef that data may be incomplete)
  // ============================================

  if (menuLoadFailed) {
    items.push({
      id: `warning-menu-load-${eventId}`,
      category: 'safety',
      title: 'WARNING: Menu items failed to load',
      detail:
        'The menu section below may be incomplete. Check the event page for full menu details.',
      completed: false,
      source: 'auto',
      priority: 'critical',
    })
  }

  if (staffLoadFailed) {
    items.push({
      id: `warning-staff-load-${eventId}`,
      category: 'safety',
      title: 'WARNING: Staff assignments failed to load',
      detail: 'Staff section below may be incomplete. Check the event page for full staff roster.',
      completed: false,
      source: 'auto',
      priority: 'critical',
    })
  }

  // ============================================
  // SAFETY ITEMS (CRITICAL - always first)
  // ============================================

  // Dietary restrictions from client
  if (client?.dietary_restrictions) {
    items.push({
      id: `safety-dietary-${eventId}`,
      category: 'safety',
      title: 'Verify dietary restrictions are accommodated',
      detail: `Restrictions: ${client.dietary_restrictions}`,
      completed: false,
      source: 'auto',
      priority: 'critical',
    })
  }

  // Allergies from client
  if (client?.allergies) {
    items.push({
      id: `safety-allergy-${eventId}`,
      category: 'safety',
      title: 'Confirm allergy-safe preparation',
      detail: `Allergies: ${client.allergies}. Cross-contamination check required.`,
      completed: false,
      source: 'auto',
      priority: 'critical',
    })
  }

  // Dietary notes from event itself
  if (event.dietary_notes) {
    items.push({
      id: `safety-event-dietary-${eventId}`,
      category: 'safety',
      title: 'Review event dietary notes',
      detail: event.dietary_notes,
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

  for (const mi of menuItems) {
    const itemName = mi.menu_item?.name ?? 'Menu item'
    const servings = mi.servings ?? event.guest_count ?? 0

    items.push({
      id: `prep-menu-${mi.id}`,
      category: 'prep',
      title: `Prep: ${itemName}`,
      detail: servings > 0 ? `${servings} servings` : null,
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

  if (event.venue) {
    items.push({
      id: `venue-access-${eventId}`,
      category: 'venue',
      title: `Confirm venue access: ${event.venue}`,
      detail: event.venue_address ?? null,
      completed: false,
      source: 'auto',
      priority: 'high',
    })
  }

  if (event.start_time) {
    // Suggest arrival 1-2 hours before
    items.push({
      id: `venue-arrival-${eventId}`,
      category: 'venue',
      title: `Plan arrival time (service starts at ${formatTime(event.start_time)})`,
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
    event_title: event.title ?? 'Untitled Event',
    event_date: event.event_date,
    start_time: event.start_time,
    client_name: client?.name ?? null,
    items,
  }
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}
