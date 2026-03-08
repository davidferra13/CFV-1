// One-Click Client Rebooking Server Actions
// Creates a draft event pre-filled from a client's most recent completed event.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface RebookResult {
  success: boolean
  eventId?: string
  error?: string
}

/**
 * Create a new draft event pre-filled from the client's most recent completed event.
 * Returns the new event ID so the UI can navigate to /events/[id]/edit.
 */
export async function rebookClient(clientId: string): Promise<RebookResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Verify client belongs to this tenant
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, full_name, tenant_id')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (clientError || !client) {
    return { success: false, error: 'Client not found' }
  }

  // Find the most recent completed event for this client
  const { data: lastEvent, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .order('event_date', { ascending: false })
    .limit(1)
    .single()

  if (eventError || !lastEvent) {
    return { success: false, error: 'No completed events found for this client' }
  }

  // Build the new draft event payload (same client, same details, no date)
  const newEventPayload: Record<string, unknown> = {
    tenant_id: tenantId,
    client_id: clientId,
    event_date: null,
    serve_time: lastEvent.serve_time,
    guest_count: lastEvent.guest_count,
    location_address: lastEvent.location_address,
    location_city: lastEvent.location_city,
    location_state: lastEvent.location_state,
    location_zip: lastEvent.location_zip,
    occasion: lastEvent.occasion
      ? `${lastEvent.occasion} (rebook)`
      : 'Rebook',
    service_style: lastEvent.service_style,
    pricing_model: lastEvent.pricing_model,
    quoted_price_cents: lastEvent.quoted_price_cents,
    deposit_amount_cents: lastEvent.deposit_amount_cents,
    dietary_restrictions: lastEvent.dietary_restrictions,
    allergies: lastEvent.allergies,
    special_requests: lastEvent.special_requests,
    site_notes: lastEvent.site_notes,
    access_instructions: lastEvent.access_instructions,
    kitchen_notes: lastEvent.kitchen_notes,
    location_notes: lastEvent.location_notes,
    arrival_time: lastEvent.arrival_time,
    departure_time: lastEvent.departure_time,
    cannabis_preference: lastEvent.cannabis_preference,
    location_lat: lastEvent.location_lat,
    location_lng: lastEvent.location_lng,
    referral_partner_id: lastEvent.referral_partner_id ?? null,
    partner_location_id: lastEvent.partner_location_id ?? null,
    event_timezone: lastEvent.event_timezone ?? null,
    // Reset readiness flags
    grocery_list_ready: false,
    prep_list_ready: false,
    packing_list_ready: false,
    equipment_list_ready: false,
    timeline_ready: false,
    execution_sheet_ready: false,
    non_negotiables_checked: false,
    car_packed: false,
    aar_filed: false,
    reset_complete: false,
    follow_up_sent: false,
    financially_closed: false,
    created_by: user.id,
    updated_by: user.id,
  }

  // Insert the new draft event
  const { data: newEvent, error: insertError } = await supabase
    .from('events')
    .insert(newEventPayload as any)
    .select('id')
    .single()

  if (insertError || !newEvent) {
    console.error('[rebookClient] Insert error:', insertError)
    return { success: false, error: 'Failed to create rebook event' }
  }

  // Log state transition to draft
  await supabase.from('event_state_transitions').insert({
    tenant_id: tenantId,
    event_id: newEvent.id,
    from_status: null,
    to_status: 'draft',
    transitioned_by: user.id,
    metadata: { action: 'client_rebooked', source_event_id: lastEvent.id },
  })

  // Clone menus and dishes from the source event
  try {
    const { data: sourceMenus } = await supabase
      .from('menus')
      .select('*')
      .eq('event_id', lastEvent.id)

    if (sourceMenus && sourceMenus.length > 0) {
      for (const sourceMenu of sourceMenus) {
        const { data: newMenu, error: menuError } = await supabase
          .from('menus')
          .insert({
            event_id: newEvent.id,
            name: sourceMenu.name,
            notes: sourceMenu.notes,
            status: 'draft',
          } as any)
          .select('id')
          .single()

        if (menuError || !newMenu) {
          console.error('[rebookClient] Menu clone error:', menuError)
          continue
        }

        const { data: sourceDishes } = await supabase
          .from('dishes')
          .select(
            'name, description, course_name, course_number, allergen_flags, dietary_tags, sort_order'
          )
          .eq('menu_id', sourceMenu.id)

        if (sourceDishes && sourceDishes.length > 0) {
          const dishInserts = sourceDishes.map((dish: any) => ({
            menu_id: newMenu.id,
            tenant_id: tenantId,
            name: dish.name,
            description: dish.description,
            course_name: dish.course_name,
            course_number: dish.course_number,
            allergen_flags: dish.allergen_flags,
            dietary_tags: dish.dietary_tags,
            sort_order: dish.sort_order,
          }))

          const { error: dishError } = await supabase.from('dishes').insert(dishInserts as any)
          if (dishError) {
            console.error('[rebookClient] Dish clone error:', dishError)
          }
        }
      }
    }
  } catch (err) {
    // Menu cloning is non-blocking; the event was already created
    console.error('[rebookClient] Non-blocking menu clone failed:', err)
  }

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId,
      actorId: user.id,
      action: 'event_created',
      domain: 'event',
      entityType: 'event',
      entityId: newEvent.id,
      summary: `Rebooked ${client.full_name} from previous event`,
      context: { source: 'rebook', sourceEventId: lastEvent.id },
    })
  } catch (err) {
    console.error('[non-blocking] Activity log failed:', err)
  }

  revalidatePath('/events')
  revalidatePath(`/clients/${clientId}`)

  return { success: true, eventId: newEvent.id }
}

/**
 * Check if a client has at least one completed event (for showing/hiding rebook button).
 */
export async function clientHasCompletedEvents(clientId: string): Promise<boolean> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { count, error } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')

  if (error) return false
  return (count ?? 0) > 0
}
