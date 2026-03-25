// Event Clone Server Actions
// Creates a new draft event copied from an existing source event, including menu items.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type CloneEventResult = {
  success: boolean
  newEventId?: string
  error?: string
}

// --- Schemas ---

const CloneEventSchema = z.object({
  sourceEventId: z.string().uuid(),
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  newClientId: z.string().uuid().optional(),
})

// --- Actions ---

/**
 * Clone an existing event into a new draft event.
 * Copies event details, menu, and dishes. The new event starts in 'draft' status.
 * If newClientId is provided, the clone is assigned to that client instead.
 */
export async function cloneEvent(
  sourceEventId: string,
  newDate: string,
  newClientId?: string
): Promise<CloneEventResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  const validated = CloneEventSchema.parse({ sourceEventId, newDate, newClientId })

  // Fetch source event
  const { data: source, error: sourceError } = await db
    .from('events')
    .select('*')
    .eq('id', validated.sourceEventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (sourceError || !source) {
    return { success: false, error: 'Source event not found' }
  }

  // If a new client is specified, verify they belong to this tenant
  const clientId = validated.newClientId ?? source.client_id
  if (validated.newClientId) {
    const { data: client } = await db
      .from('clients')
      .select('id')
      .eq('id', validated.newClientId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!client) {
      return { success: false, error: 'Target client not found in your tenant' }
    }
  }

  // Build the new event payload - copy all relevant fields, reset status to draft
  const newEventPayload: Record<string, unknown> = {
    tenant_id: user.tenantId!,
    client_id: clientId,
    event_date: validated.newDate,
    serve_time: source.serve_time,
    guest_count: source.guest_count,
    location_address: source.location_address,
    location_city: source.location_city,
    location_state: source.location_state,
    location_zip: source.location_zip,
    occasion: source.occasion ? `${source.occasion} (copy)` : 'Event (copy)',
    service_style: source.service_style,
    pricing_model: source.pricing_model,
    quoted_price_cents: source.quoted_price_cents,
    deposit_amount_cents: source.deposit_amount_cents,
    dietary_restrictions: source.dietary_restrictions,
    allergies: source.allergies,
    special_requests: source.special_requests,
    site_notes: source.site_notes,
    access_instructions: source.access_instructions,
    kitchen_notes: source.kitchen_notes,
    location_notes: source.location_notes,
    arrival_time: source.arrival_time,
    departure_time: source.departure_time,
    // Reset all readiness flags
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

  // Insert the new event (status defaults to 'draft' in DB)
  const { data: newEvent, error: insertError } = await db
    .from('events')
    .insert(newEventPayload as any)
    .select('id')
    .single()

  if (insertError || !newEvent) {
    console.error('[cloneEvent] Insert error:', insertError)
    return { success: false, error: 'Failed to create cloned event' }
  }

  // Log initial transition to 'draft'
  await db.from('event_state_transitions').insert({
    tenant_id: user.tenantId!,
    event_id: newEvent.id,
    from_status: null,
    to_status: 'draft',
    transitioned_by: user.id,
    metadata: { action: 'event_cloned', source_event_id: validated.sourceEventId },
  })

  // Clone menus and dishes
  const { data: sourceMenus } = await db
    .from('menus')
    .select('*')
    .eq('event_id', validated.sourceEventId)

  if (sourceMenus && sourceMenus.length > 0) {
    for (const sourceMenu of sourceMenus) {
      // Create new menu for the cloned event
      const { data: newMenu, error: menuError } = await db
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
        console.error('[cloneEvent] Menu clone error:', menuError)
        continue
      }

      // Clone dishes from the source menu
      const { data: sourceDishes } = await db
        .from('dishes')
        .select(
          'name, description, course_name, course_number, allergen_flags, dietary_tags, sort_order'
        )
        .eq('menu_id', sourceMenu.id)

      if (sourceDishes && sourceDishes.length > 0) {
        const dishInserts = sourceDishes.map((dish: any) => ({
          menu_id: newMenu.id,
          tenant_id: user.tenantId!,
          name: dish.name,
          description: dish.description,
          course_name: dish.course_name,
          course_number: dish.course_number,
          allergen_flags: dish.allergen_flags,
          dietary_tags: dish.dietary_tags,
          sort_order: dish.sort_order,
        }))

        const { error: dishError } = await db.from('dishes').insert(dishInserts as any)

        if (dishError) {
          console.error('[cloneEvent] Dish clone error:', dishError)
        }
      }
    }
  }

  revalidatePath('/events')

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'event_created',
      domain: 'event',
      entityType: 'event',
      entityId: newEvent.id,
      summary: `Cloned event from ${source.occasion || 'Untitled'} to ${validated.newDate}`,
      context: {
        source_event_id: validated.sourceEventId,
        new_event_id: newEvent.id,
        new_date: validated.newDate,
      },
    })
  } catch (err) {
    console.error('[cloneEvent] Activity log failed (non-blocking):', err)
  }

  return { success: true, newEventId: newEvent.id }
}
