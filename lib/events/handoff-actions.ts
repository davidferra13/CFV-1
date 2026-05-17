// Event Handoff Server Actions
// Chef-to-chef/staff event delegation with full context packets

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type {
  HandoffPacket,
  HandoffRecord,
  HandoffEventSummary,
  HandoffClientSummary,
  HandoffMenuSummary,
  HandoffCourse,
  HandoffDish,
  HandoffTimelineEntry,
  HandoffVendorContact,
  HandoffTask,
} from './handoff-types'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function verifyEventOwnership(db: any, eventId: string, tenantId: string): Promise<boolean> {
  const { data } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .limit(1)
    .single()
  return !!data
}

// ── Generate Handoff Packet ──────────────────────────────────────────────────

/**
 * Build a complete context packet for an event handoff.
 * Includes event details, client info, menu with allergens,
 * prep timeline, vendor contacts, chef notes, and outstanding tasks.
 */
export async function generateHandoffPacket(
  eventId: string
): Promise<{ data: HandoffPacket | null; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Verify ownership
  const owns = await verifyEventOwnership(db, eventId, tenantId)
  if (!owns) return { data: null, error: 'Event not found or access denied' }

  // 1) Event details
  const { data: evt } = await db
    .from('events')
    .select(
      'id, event_date, serve_time, guest_count, location_address, location_city, location_state, service_style, occasion, status, dietary_restrictions, allergies, special_requests, site_notes, kitchen_notes, client_id'
    )
    .eq('id', eventId)
    .single()

  if (!evt) return { data: null, error: 'Event not found' }

  const eventSummary: HandoffEventSummary = {
    id: evt.id,
    eventDate: evt.event_date ?? null,
    serveTime: evt.serve_time ?? null,
    guestCount: evt.guest_count ?? null,
    locationAddress: evt.location_address ?? null,
    locationCity: evt.location_city ?? null,
    locationState: evt.location_state ?? null,
    serviceStyle: evt.service_style ?? null,
    occasion: evt.occasion ?? null,
    status: evt.status ?? null,
    dietaryRestrictions: evt.dietary_restrictions ?? [],
    allergies: evt.allergies ?? [],
    specialRequests: evt.special_requests ?? null,
  }

  // 2) Client info
  let clientSummary: HandoffClientSummary | null = null
  if (evt.client_id) {
    const { data: client } = await db
      .from('clients')
      .select('id, full_name, email, phone, notes')
      .eq('id', evt.client_id)
      .single()
    if (client) {
      clientSummary = {
        id: client.id,
        name: client.full_name ?? 'Unknown',
        email: client.email ?? null,
        phone: client.phone ?? null,
        preferences: client.notes ?? null,
      }
    }
  }

  // 3) Menu with courses and dishes (allergens/dietary tags)
  let menuSummary: HandoffMenuSummary | null = null
  try {
    const { data: eventMenus } = await db
      .from('event_menus')
      .select('menu_id')
      .eq('event_id', eventId)
      .limit(1)

    if (eventMenus?.length) {
      const menuId = eventMenus[0].menu_id

      const { data: menu } = await db.from('menus').select('id, name').eq('id', menuId).single()

      const { data: dishes } = await db
        .from('dishes')
        .select('name, course, allergens, dietary_tags')
        .eq('menu_id', menuId)
        .eq('tenant_id', tenantId)

      if (menu) {
        // Group dishes by course
        const courseMap = new Map<string, HandoffDish[]>()
        for (const d of dishes ?? []) {
          const courseName = d.course ?? 'Uncategorized'
          if (!courseMap.has(courseName)) courseMap.set(courseName, [])
          courseMap.get(courseName)!.push({
            name: d.name ?? 'Unnamed dish',
            allergens: d.allergens ?? [],
            dietaryTags: d.dietary_tags ?? [],
          })
        }

        const courses: HandoffCourse[] = Array.from(courseMap.entries()).map(([name, items]) => ({
          name,
          dishes: items,
        }))

        menuSummary = {
          id: menu.id,
          name: menu.name ?? null,
          courses,
        }
      }
    }
  } catch {
    // Non-blocking: handoff works without menu data
  }

  // 4) Prep timeline
  let timeline: HandoffTimelineEntry[] = []
  try {
    const { data: entries } = await db
      .from('event_prep_timeline')
      .select('label, minutes_before, notes')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('minutes_before', { ascending: false })

    if (entries?.length) {
      timeline = entries.map((e: any) => ({
        time: `${e.minutes_before} min before`,
        label: e.label,
        notes: e.notes ?? null,
      }))
    }
  } catch {
    // Non-blocking
  }

  // 5) Vendor contacts (chef-level, not event-specific)
  let vendorContacts: HandoffVendorContact[] = []
  try {
    const { data: vendors } = await db
      .from('vendors')
      .select('name, category, phone, email')
      .eq('chef_id', tenantId)
      .eq('status', 'active')
      .limit(20)

    if (vendors?.length) {
      vendorContacts = vendors.map((v: any) => ({
        name: v.name,
        role: v.category ?? null,
        phone: v.phone ?? null,
        email: v.email ?? null,
      }))
    }
  } catch {
    // Non-blocking
  }

  // 6) Chef notes (combine site_notes + kitchen_notes)
  const notesParts: string[] = []
  if (evt.site_notes) notesParts.push(`Site: ${evt.site_notes}`)
  if (evt.kitchen_notes) notesParts.push(`Kitchen: ${evt.kitchen_notes}`)
  const chefNotes = notesParts.length > 0 ? notesParts.join('\n') : null

  // 7) Outstanding tasks (todos linked to this event)
  let outstandingTasks: HandoffTask[] = []
  try {
    const { data: todos } = await db
      .from('chef_todos')
      .select('title, due_date, completed')
      .eq('tenant_id', tenantId)
      .eq('event_id', eventId)
      .eq('completed', false)
      .order('due_date', { ascending: true })
      .limit(50)

    if (todos?.length) {
      outstandingTasks = todos.map((t: any) => ({
        description: t.title,
        dueDate: t.due_date ?? null,
        completed: !!t.completed,
      }))
    }
  } catch {
    // Non-blocking
  }

  const packet: HandoffPacket = {
    event: eventSummary,
    client: clientSummary,
    menu: menuSummary,
    timeline,
    vendorContacts,
    chefNotes,
    outstandingTasks,
  }

  return { data: packet }
}

// ── Create Handoff ───────────────────────────────────────────────────────────

/**
 * Create a handoff record with a full context packet.
 * The packet is auto-generated and stored as a snapshot.
 */
export async function createHandoff(
  eventId: string,
  recipientId: string,
  notes?: string
): Promise<{ data: HandoffRecord | null; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Verify ownership
  const owns = await verifyEventOwnership(db, eventId, tenantId)
  if (!owns) return { data: null, error: 'Event not found or access denied' }

  // Generate packet snapshot
  const { data: packet, error: packetError } = await generateHandoffPacket(eventId)
  if (packetError && !packet) {
    return { data: null, error: packetError }
  }

  const { data, error } = await db
    .from('event_handoffs')
    .insert({
      event_id: eventId,
      tenant_id: tenantId,
      from_user_id: user.id,
      to_user_id: recipientId,
      notes: notes?.trim() || null,
      status: 'pending',
      packet_json: packet,
    })
    .select()
    .single()

  if (error) {
    console.error('[handoff] create failed:', error.message)
    return { data: null, error: 'Failed to create handoff' }
  }

  revalidatePath('/dashboard')
  return { data: data as HandoffRecord }
}

// ── Get Active Handoffs ──────────────────────────────────────────────────────

/**
 * All active (non-completed, non-cancelled) handoffs for the current chef.
 * Includes both sent and received handoffs.
 */
export async function getActiveHandoffs(): Promise<{
  sent: HandoffRecord[]
  received: HandoffRecord[]
  error?: string
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Sent by this chef (tenant-scoped)
  const { data: sent, error: sentErr } = await db
    .from('event_handoffs')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('from_user_id', user.id)
    .in('status', ['pending', 'accepted'])
    .order('created_at', { ascending: false })

  if (sentErr) {
    console.error('[handoff] sent query failed:', sentErr.message)
    return { sent: [], received: [], error: 'Failed to load sent handoffs' }
  }

  // Received by this user
  const { data: received, error: recvErr } = await db
    .from('event_handoffs')
    .select('*')
    .eq('to_user_id', user.id)
    .in('status', ['pending', 'accepted'])
    .order('created_at', { ascending: false })

  if (recvErr) {
    console.error('[handoff] received query failed:', recvErr.message)
    return {
      sent: (sent ?? []) as HandoffRecord[],
      received: [],
      error: 'Failed to load received handoffs',
    }
  }

  return {
    sent: (sent ?? []) as HandoffRecord[],
    received: (received ?? []) as HandoffRecord[],
  }
}

// ── Accept Handoff ───────────────────────────────────────────────────────────

/**
 * Recipient accepts a pending handoff.
 */
export async function acceptHandoff(
  handoffId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify recipient
  const { data: handoff } = await db
    .from('event_handoffs')
    .select('id, to_user_id, status')
    .eq('id', handoffId)
    .single()

  if (!handoff) return { success: false, error: 'Handoff not found' }
  if (handoff.to_user_id !== user.id) return { success: false, error: 'Not the recipient' }
  if (handoff.status !== 'pending') return { success: false, error: 'Handoff is not pending' }

  const { error } = await db
    .from('event_handoffs')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', handoffId)

  if (error) {
    console.error('[handoff] accept failed:', error.message)
    return { success: false, error: 'Failed to accept handoff' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

// ── Complete Handoff ─────────────────────────────────────────────────────────

/**
 * Mark a handoff as completed. Either sender or recipient can complete.
 */
export async function completeHandoff(
  handoffId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify participant
  const { data: handoff } = await db
    .from('event_handoffs')
    .select('id, from_user_id, to_user_id, status')
    .eq('id', handoffId)
    .single()

  if (!handoff) return { success: false, error: 'Handoff not found' }
  if (handoff.from_user_id !== user.id && handoff.to_user_id !== user.id) {
    return { success: false, error: 'Not a participant in this handoff' }
  }
  if (handoff.status === 'completed') return { success: false, error: 'Already completed' }
  if (handoff.status === 'cancelled') return { success: false, error: 'Handoff was cancelled' }

  const { error } = await db
    .from('event_handoffs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', handoffId)

  if (error) {
    console.error('[handoff] complete failed:', error.message)
    return { success: false, error: 'Failed to complete handoff' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
