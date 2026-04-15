// API v2: Clone Event
// POST /api/v2/events/:id/clone
// Creates a new draft event copied from an existing event, including menus and dishes.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiAuth,
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiError,
  apiCreated,
} from '@/lib/api/v2'

const CloneEventBody = z
  .object({
    new_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
    new_client_id: z.string().uuid().optional(),
  })
  .strict()

export const POST = withApiAuth(
  async (req: NextRequest, ctx, params) => {
    const id = params?.id
    if (!id) return apiNotFound('Event')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('invalid_json', 'Request body must be valid JSON', 400)
    }

    const parsed = CloneEventBody.safeParse(body)
    if (!parsed.success) return apiValidationError(parsed.error)

    const { new_date, new_client_id } = parsed.data

    // Fetch source event (verify ownership)
    const { data: source, error: sourceError } = await ctx.db
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .single()

    if (sourceError || !source) return apiNotFound('Event')

    // If a new client is specified, verify they belong to this tenant
    const clientId = new_client_id ?? (source as any).client_id
    if (new_client_id) {
      const { data: client } = await ctx.db
        .from('clients')
        .select('id')
        .eq('id', new_client_id)
        .eq('tenant_id', ctx.tenantId)
        .single()

      if (!client) return apiNotFound('Client')
    }

    const src = source as any

    // Build new event payload, copying all relevant fields
    const newEventPayload: Record<string, unknown> = {
      tenant_id: ctx.tenantId,
      client_id: clientId,
      event_date: new_date,
      serve_time: src.serve_time,
      guest_count: src.guest_count,
      location_address: src.location_address,
      location_city: src.location_city,
      location_state: src.location_state,
      location_zip: src.location_zip,
      occasion: src.occasion ? `${src.occasion} (copy)` : 'Event (copy)',
      service_style: src.service_style,
      pricing_model: src.pricing_model,
      quoted_price_cents: src.quoted_price_cents,
      deposit_amount_cents: src.deposit_amount_cents,
      dietary_restrictions: src.dietary_restrictions,
      allergies: src.allergies,
      special_requests: src.special_requests,
      site_notes: src.site_notes,
      access_instructions: src.access_instructions,
      kitchen_notes: src.kitchen_notes,
      location_notes: src.location_notes,
      arrival_time: src.arrival_time,
      departure_time: src.departure_time,
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
    }

    // Insert the new event (status defaults to 'draft' in DB)
    const { data: newEvent, error: insertError } = await ctx.db
      .from('events')
      .insert(newEventPayload as any)
      .select()
      .single()

    if (insertError || !newEvent) {
      console.error('[api/v2/events/clone] Insert error:', insertError)
      return apiError('clone_failed', 'Failed to create cloned event', 500)
    }

    const newEventId = (newEvent as any).id

    // Log initial transition to 'draft' (non-blocking)
    try {
      await ctx.db.from('event_state_transitions').insert({
        tenant_id: ctx.tenantId,
        event_id: newEventId,
        from_status: null,
        to_status: 'draft',
        transitioned_by: null,
        metadata: {
          action: 'event_cloned',
          source_event_id: id,
          source: 'api_v2',
          api_key_id: ctx.keyId,
        },
      })
    } catch (err) {
      console.error('[v2/events/clone] State transition record failed (non-blocking):', err)
    }

    // Clone menus and dishes (non-blocking, best effort)
    try {
      const { data: sourceMenus } = await ctx.db.from('menus').select('*').eq('event_id', id)

      if (sourceMenus && (sourceMenus as any[]).length > 0) {
        for (const sourceMenu of sourceMenus as any[]) {
          const { data: newMenu } = await ctx.db
            .from('menus')
            .insert({
              event_id: newEventId,
              name: sourceMenu.name,
              notes: sourceMenu.notes,
              status: 'draft',
            } as any)
            .select('id')
            .single()

          if (!newMenu) continue

          const { data: sourceDishes } = await ctx.db
            .from('dishes')
            .select(
              'name, description, course_name, course_number, allergen_flags, dietary_tags, sort_order'
            )
            .eq('menu_id', sourceMenu.id)

          if (sourceDishes && (sourceDishes as any[]).length > 0) {
            const dishInserts = (sourceDishes as any[]).map((dish: any) => ({
              menu_id: (newMenu as any).id,
              tenant_id: ctx.tenantId,
              name: dish.name,
              description: dish.description,
              course_name: dish.course_name,
              course_number: dish.course_number,
              allergen_flags: dish.allergen_flags,
              dietary_tags: dish.dietary_tags,
              sort_order: dish.sort_order,
            }))

            await ctx.db.from('dishes').insert(dishInserts as any)
          }
        }
      }
    } catch (err) {
      console.error('[api/v2/events/clone] Menu clone error (non-blocking):', err)
    }

    return apiCreated({
      event: newEvent,
      source_event_id: id,
    })
  },
  { scopes: ['events:write'] }
)
